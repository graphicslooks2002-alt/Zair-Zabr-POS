import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { menus } from "../../constants";
import { getOrders, getSessionSummary, getSummary, getTables } from "../../https/index";
import { formatDateAndTime } from "../../utils/index";
import { enqueueSnackbar } from "notistack";

const MODES = [
  { key: "session", label: "Current Session" },
  { key: "daily", label: "Yesterday" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "custom", label: "Custom" },
];

const Metrics = () => {
  const navigate = useNavigate();
  // Persist the selected view so it survives navigating into a metric detail page and back.
  const [mode, setMode] = useState(() => localStorage.getItem("zz_metricsMode") || "session");
  const [customFrom, setCustomFrom] = useState(() => localStorage.getItem("zz_metricsFrom") || "");
  const [customTo, setCustomTo] = useState(() => localStorage.getItem("zz_metricsTo") || "");

  useEffect(() => { localStorage.setItem("zz_metricsMode", mode); }, [mode]);
  useEffect(() => { localStorage.setItem("zz_metricsFrom", customFrom); }, [customFrom]);
  useEffect(() => { localStorage.setItem("zz_metricsTo", customTo); }, [customTo]);

  const range = useMemo(() => {
    const end = new Date().toISOString();
    if (mode === "daily") {
      // Yesterday: from yesterday 00:00 to today 00:00.
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const yStart = new Date(todayStart);
      yStart.setDate(yStart.getDate() - 1);
      return { from: yStart.toISOString(), to: todayStart.toISOString() };
    }
    if (mode === "weekly") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { from: d.toISOString(), to: end };
    }
    if (mode === "monthly") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return { from: d.toISOString(), to: end };
    }
    if (mode === "custom") {
      // Anchor both bounds to PKT (UTC+5) so a picked date covers that full
      // Pakistan day — incl. the late-night session (business runs to 4 AM) —
      // regardless of the viewer's browser timezone.
      return {
        from: customFrom ? new Date(customFrom + "T00:00:00+05:00").toISOString() : undefined,
        to: customTo ? new Date(customTo + "T23:59:59.999+05:00").toISOString() : undefined,
      };
    }
    return null;
  }, [mode, customFrom, customTo]);

  const { data: sessionRes } = useQuery({
    queryKey: ["sessionSummary"],
    queryFn: async () => getSessionSummary(),
    placeholderData: keepPreviousData,
  });

  const { data: summaryRes } = useQuery({
    queryKey: ["summary", mode, range?.from, range?.to],
    queryFn: async () => getSummary(range),
    enabled: mode !== "session" && !!range,
    placeholderData: keepPreviousData,
  });

  const { data: tablesRes } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => getTables(),
    placeholderData: keepPreviousData,
  });

  const sessionData = sessionRes?.data?.data;
  const session = sessionData?.session || null;
  const stats =
    mode === "session" ? sessionData : summaryRes?.data?.data;

  const money = (n) => `Rs ${Number(n || 0).toFixed(0)}`;

  const cards = stats
    ? [
        { key: "revenue", title: "Total Revenue", value: money(stats.totalRevenue), color: "#e85d04" },
        { key: "orders", title: "Total Orders", value: `${stats.totalOrders || 0}`, color: "#02ca3a" },
        { key: "paid", title: "Paid Payments", value: `${stats.paidPayments || 0}`, color: "#025cca" },
        { key: "pending", title: "Pending Payments", value: `${stats.pendingPayments || 0}`, color: "#f6b100" },
        { key: "pendingAmount", title: "Pending Amount", value: money(stats.pendingAmount), color: "#d00000" },
        { key: "discounts", title: "Discounts Given", value: money(stats.discountsGiven), color: "#7f167f" },
        { key: "online", title: "Online Payments", value: money(stats.onlinePayments), color: "#285430" },
        { key: "cash", title: "Cash Payments", value: money(stats.cashPayments), color: "#5b45b0" },
      ]
    : [];

  // When a card is clicked, open its detail page scoped to the same range.
  const openDetail = (cardKey) => {
    const label =
      mode === "session" ? "Current Session" : MODES.find((m) => m.key === mode)?.label;
    const detailFrom = mode === "session" ? session?.opened_at : range?.from;
    const detailTo = mode === "session" ? new Date().toISOString() : range?.to;
    const qs = new URLSearchParams();
    if (detailFrom) qs.set("from", detailFrom);
    if (detailTo) qs.set("to", detailTo);
    if (label) qs.set("label", label);
    navigate(`/dashboard/metric/${cardKey}?${qs.toString()}`);
  };

  const items = [
    { title: "Total Categories", value: `${menus.length}`, color: "#5b45b0" },
    { title: "Total Dishes", value: `${menus.reduce((s, m) => s + (m.items?.length || 0), 0)}`, color: "#285430" },
    { title: "Pending Orders", value: `${stats?.pendingPayments || 0}`, color: "#735f32" },
    { title: "Total Tables", value: `${tablesRes?.data?.data?.length || 0}`, color: "#7f167f" },
  ];

  const [exporting, setExporting] = useState(false);

  const downloadReport = async () => {
    if (!stats || exporting) return;
    const label = mode === "session" ? "Current Session" : MODES.find((m) => m.key === mode)?.label;
    const fromISO = mode === "session" ? session?.opened_at : range?.from;
    const toISO = mode === "session" ? session?.closes_at : range?.to;
    const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");
    const rs = (n) => `Rs ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const esc = (v) => String(v ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // Pull every order inside the selected period (same range logic as the cards).
    let periodOrders = [];
    try {
      setExporting(true);
      const res = await getOrders();
      const all = res?.data?.data || [];
      const fromT = fromISO ? new Date(fromISO).getTime() : null;
      const toT = toISO ? new Date(toISO).getTime() : null;
      periodOrders = all.filter((o) => {
        const t = new Date(o.orderDate).getTime();
        if (fromT != null && t < fromT) return false;
        if (toT != null && t > toT) return false;
        return true;
      });
    } catch {
      periodOrders = [];
    } finally {
      setExporting(false);
    }
    periodOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

    // Summary cards.
    const cardsHtml = [
      ["Total Revenue", rs(stats.totalRevenue), "#e85d04"],
      ["Total Orders", stats.totalOrders || 0, "#02795a"],
      ["Paid Payments", stats.paidPayments || 0, "#025cca"],
      ["Pending Payments", stats.pendingPayments || 0, "#b8860b"],
      ["Pending Amount", rs(stats.pendingAmount), "#c0392b"],
      ["Discounts Given", rs(stats.discountsGiven), "#7f167f"],
      ["Cash Payments", rs(stats.cashPayments), "#4b3f8f"],
      ["Online Payments", rs(stats.onlinePayments), "#285430"],
    ].map(([t, v, c]) => `
      <div class="card">
        <div class="card-bar" style="background:${c}"></div>
        <div class="card-t">${t}</div>
        <div class="card-v">${esc(v)}</div>
      </div>`).join("");

    // Order rows.
    const rowsHtml = periodOrders.map((o, i) => {
      const b = o.bills || {};
      const items = (o.items || []).map((it) => `${esc(it.name)} ×${it.quantity}`).join(", ");
      const type = o.orderType || (o.table ? "Dine In" : "Take Away");
      const where = o.table ? `Table ${o.table.tableNo}` : "Takeaway";
      const discAmt = o.discountAmount ?? b.discount ?? 0;
      const status = o.paymentStatus || "Paid";
      const method = o.paymentMethod && o.paymentMethod !== "Pending" ? o.paymentMethod : "";
      const pay = status === "Paid" && method ? `Paid · ${method}` : status;
      const payClass = status === "Pending" ? "pill-pending" : "pill-paid";
      return `
        <tr>
          <td>${i + 1}</td>
          <td>#${esc(String(o._id).slice(-6))}</td>
          <td class="nowrap">${esc(fmt(o.orderDate))}</td>
          <td>${esc(o.customerDetails?.name || "—")}</td>
          <td>${esc(type)} · ${esc(where)}</td>
          <td class="items">${items || "—"}</td>
          <td class="num">${discAmt > 0 ? rs(discAmt) : "—"}</td>
          <td class="num strong">${rs(b.totalWithTax)}</td>
          <td><span class="pill ${payClass}">${esc(pay)}</span></td>
        </tr>`;
    }).join("");

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Zair Zabar Report — ${esc(label)}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; padding: 28px; }
        .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #e85d04; padding-bottom:14px; margin-bottom:18px; }
        .brand { font-size:22px; font-weight:800; color:#e85d04; letter-spacing:.5px; }
        .brand span { color:#1f2937; font-weight:600; }
        .sub { font-size:12px; color:#6b7280; margin-top:2px; }
        .meta { text-align:right; font-size:12px; color:#374151; line-height:1.6; }
        .meta b { color:#111827; }
        h2 { font-size:14px; text-transform:uppercase; letter-spacing:.6px; color:#374151; margin:22px 0 10px; }
        .cards { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
        .card { border:1px solid #e5e7eb; border-radius:8px; padding:10px 12px; position:relative; overflow:hidden; }
        .card-bar { position:absolute; left:0; top:0; bottom:0; width:4px; }
        .card-t { font-size:11px; color:#6b7280; margin-left:6px; }
        .card-v { font-size:18px; font-weight:700; margin-left:6px; margin-top:2px; }
        table { width:100%; border-collapse:collapse; font-size:11px; }
        thead th { background:#1f2937; color:#fff; text-align:left; padding:7px 8px; font-weight:600; }
        thead th.num { text-align:right; }
        tbody td { padding:6px 8px; border-bottom:1px solid #eee; vertical-align:top; }
        tbody tr:nth-child(even) { background:#fafafa; }
        .num { text-align:right; white-space:nowrap; }
        .strong { font-weight:700; }
        .nowrap { white-space:nowrap; }
        .items { color:#4b5563; max-width:230px; }
        .pill { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; white-space:nowrap; }
        .pill-paid { background:#e6f4ea; color:#137333; }
        .pill-pending { background:#fef3cd; color:#8a6d00; }
        .empty { text-align:center; color:#9ca3af; padding:24px; }
        .foot { margin-top:20px; font-size:10px; color:#9ca3af; text-align:center; }
        @media print { body { padding:0; } thead { display:table-header-group; } tr { break-inside:avoid; } }
      </style></head><body>
      <div class="head">
        <div>
          <div class="brand">Zair Zabar <span>POS</span></div>
          <div class="sub">Performance Report</div>
        </div>
        <div class="meta">
          <div>Period: <b>${esc(label)}</b></div>
          <div>${esc(fmt(fromISO))} &rarr; ${esc(fmt(toISO))}</div>
          <div>Generated: <b>${esc(new Date().toLocaleString())}</b></div>
        </div>
      </div>

      <h2>Summary</h2>
      <div class="cards">${cardsHtml}</div>

      <h2>Order Details (${periodOrders.length})</h2>
      <table>
        <thead><tr>
          <th>#</th><th>Order</th><th>Date &amp; Time</th><th>Customer</th>
          <th>Type</th><th>Items</th><th class="num">Discount</th>
          <th class="num">Total</th><th>Payment</th>
        </tr></thead>
        <tbody>${rowsHtml || `<tr><td class="empty" colspan="9">No orders in this period.</td></tr>`}</tbody>
      </table>

      <div class="foot">Zair Zabar POS · ${esc(label)} · Generated ${esc(new Date().toLocaleString())}</div>
      <script>window.onload=function(){window.focus();window.print();}</script>
      </body></html>`;

    const win = window.open("", "_blank");
    if (!win) {
      enqueueSnackbar("Allow pop-ups to download the report.", { variant: "warning" });
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="container mx-auto py-2 px-0 md:px-4">
      {/* Session bar — automatic 12 PM – 4 AM business session */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-panel rounded-lg p-4 mb-6">
        <div>
          <p className="text-main font-semibold">
            {session?.active ? "🟢 Session Active" : "🌙 Between Sessions"} · Daily 12:00 PM – 4:00 AM
          </p>
          <p className="text-muted text-xs mt-1">
            {session
              ? `This session: ${formatDateAndTime(session.opened_at)} → ${formatDateAndTime(session.closes_at)}`
              : "Automatic business session."}
          </p>
        </div>
        <span className="text-muted text-xs bg-surface px-3 py-2 rounded-lg">Auto</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                mode === m.key ? "bg-surface text-main" : "bg-panel text-muted"
              }`}
            >
              {m.label}
            </button>
          ))}
          {mode === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-panel text-main text-sm rounded-lg px-3 py-2 outline-none" />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="bg-panel text-main text-sm rounded-lg px-3 py-2 outline-none" />
            </>
          )}
        </div>
        <button onClick={downloadReport} disabled={exporting} className="bg-info text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
          {exporting ? "Preparing…" : "Download Report"}
        </button>
      </div>

      <h2 className="font-semibold text-main text-xl">Overall Performance</h2>
      <p className="text-sm text-muted">
        {mode === "session" ? "Revenue for the current business session." : `Showing: ${MODES.find((m) => m.key === mode)?.label}`}
      </p>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => openDetail(c.key)}
            className="text-left shadow-sm rounded-lg p-4 hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: c.color }}
          >
            <p className="font-medium text-xs text-white">{c.title}</p>
            <p className="mt-1 font-semibold text-2xl text-white">{c.value}</p>
            <p className="text-[10px] text-white opacity-70 mt-2">Tap for details →</p>
          </button>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="font-semibold text-main text-xl">Item Details</h2>
        <p className="text-sm text-muted">Catalog size and live counts.</p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((c, i) => (
            <div key={i} className="shadow-sm rounded-lg p-4" style={{ backgroundColor: c.color }}>
              <p className="font-medium text-xs text-white">{c.title}</p>
              <p className="mt-1 font-semibold text-2xl text-white">{c.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Metrics;
