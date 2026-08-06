import React, { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { getOrders } from "../../https/index";
import { useTheme } from "../../hooks/useTheme";

const RANGES = [
  { key: 7, label: "1 Week" },
  { key: 14, label: "2 Weeks" },
  { key: 30, label: "1 Month" },
];

// Series definitions. Colors come from the validated categorical palette
// (blue / green / magenta) — CVD-safe in both light and dark.
const SERIES = [
  { key: "cash", name: "Cash", light: "#008300", dark: "#008300" },
  { key: "online", name: "Online", light: "#2a78d6", dark: "#3987e5" },
  { key: "pending", name: "Pending", light: "#e87ba4", dark: "#d55181" },
];

// Calendar date (YYYY-MM-DD) for an ISO timestamp, anchored to PKT (UTC+5).
const pktDateKey = (iso) => new Date(new Date(iso).getTime() + 5 * 3600 * 1000).toISOString().slice(0, 10);
const pktToday = () => new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);

// Business session date: the session runs 12:00 PM → 4:00 AM PKT (crosses midnight),
// so orders in the 12 AM–4 AM window belong to the PREVIOUS day's session.
const sessionDateKey = (iso) => {
  const pkt = new Date(new Date(iso).getTime() + 5 * 3600 * 1000);
  if (pkt.getUTCHours() < 4) pkt.setUTCDate(pkt.getUTCDate() - 1);
  return pkt.toISOString().slice(0, 10);
};

const prettyDate = (key) =>
  new Date(key + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const SalesChart = () => {
  const [days, setDays] = useState(14);
  const [reportMonth, setReportMonth] = useState(() => pktToday().slice(0, 7)); // YYYY-MM
  const { theme } = useTheme();

  const { data: resData, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => getOrders(),
    placeholderData: keepPreviousData,
  });

  const data = useMemo(() => {
    const orders = resData?.data?.data || [];

    // Split each PKT day into cash / online (collected) + pending (outstanding).
    const byDay = {};
    orders.forEach((o) => {
      const key = pktDateKey(o.orderDate);
      const amt = o.bills?.totalWithTax || 0;
      const day = byDay[key] || (byDay[key] = { cash: 0, online: 0, pending: 0 });
      if (o.paymentStatus === "Pending") day.pending += amt;
      else if (o.paymentMethod === "Online") day.online += amt;
      else day.cash += amt;
    });

    // Continuous series for the last N PKT days (fill gaps with 0).
    const out = [];
    const end = new Date(pktToday() + "T00:00:00Z");
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
      const b = byDay[key] || { cash: 0, online: 0, pending: 0 };
      out.push({ key, label, cash: Math.round(b.cash), online: Math.round(b.online), pending: Math.round(b.pending) });
    }
    return out;
  }, [resData, days]);

  const totals = data.reduce(
    (a, d) => ({ cash: a.cash + d.cash, online: a.online + d.online, pending: a.pending + d.pending }),
    { cash: 0, online: 0, pending: 0 }
  );
  const collected = totals.cash + totals.online;
  const bestDay = data.reduce((best, d) => (d.cash + d.online > ((best?.cash + best?.online) || -1) ? d : best), null);
  const avgCollected = data.length ? Math.round(collected / data.length) : 0;
  const hasData = collected + totals.pending > 0;

  // Theme-aware, recessive axis/grid; validated categorical colors per mode.
  const axis = theme === "light" ? "#52514e" : "#c3c2b7";
  const grid = theme === "light" ? "#e5e7eb" : "#2a2a2a";
  const surface = theme === "light" ? "#ffffff" : "#262626";
  const color = (s) => (theme === "light" ? s.light : s.dark);

  // Per-session breakdown PDF for the selected month (one row per session).
  const downloadSessionReport = () => {
    const orders = resData?.data?.data || [];
    const rs = (n) => `Rs ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Group the month's orders by session date.
    const byServ = {};
    orders.forEach((o) => {
      const key = sessionDateKey(o.orderDate);
      if (!key.startsWith(reportMonth)) return;
      const amt = o.bills?.totalWithTax || 0;
      const s = byServ[key] || (byServ[key] = { orders: 0, cash: 0, online: 0, pending: 0, discount: 0 });
      s.orders += 1;
      s.discount += o.discountAmount || 0;
      if (o.paymentStatus === "Pending") s.pending += amt;
      else if (o.paymentMethod === "Online") s.online += amt;
      else s.cash += amt;
    });

    const keys = Object.keys(byServ).sort(); // ascending by date
    const t = { orders: 0, cash: 0, online: 0, pending: 0, discount: 0 };
    const rows = keys.map((k) => {
      const s = byServ[k];
      t.orders += s.orders; t.cash += s.cash; t.online += s.online; t.pending += s.pending; t.discount += s.discount;
      return `<tr>
        <td>${esc(prettyDate(k))}</td>
        <td class="c">${s.orders}</td>
        <td class="num">${rs(s.cash)}</td>
        <td class="num">${rs(s.online)}</td>
        <td class="num strong">${rs(s.cash + s.online)}</td>
        <td class="num">${rs(s.discount)}</td>
        <td class="num pend">${rs(s.pending)}</td>
      </tr>`;
    }).join("");

    const monthLabel = new Date(reportMonth + "-01T00:00:00Z").toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Zair Zabar — Session Report ${esc(monthLabel)}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;margin:0;padding:28px}
        .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #e85d04;padding-bottom:14px;margin-bottom:18px}
        .brand{font-size:22px;font-weight:800;color:#e85d04}
        .brand span{color:#1f2937;font-weight:600}
        .sub{font-size:12px;color:#6b7280;margin-top:2px}
        .meta{text-align:right;font-size:12px;color:#374151;line-height:1.6}
        h2{font-size:14px;text-transform:uppercase;letter-spacing:.5px;color:#374151;margin:0 0 10px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        thead th{background:#1f2937;color:#fff;text-align:left;padding:8px;font-weight:600}
        thead th.num,thead th.c{text-align:right}
        tbody td{padding:7px 8px;border-bottom:1px solid #eee}
        tbody tr:nth-child(even){background:#fafafa}
        .num{text-align:right;white-space:nowrap}.c{text-align:right}
        .strong{font-weight:700}.pend{color:#b45309}
        tfoot td{padding:9px 8px;border-top:2px solid #1f2937;font-weight:700}
        .empty{text-align:center;color:#9ca3af;padding:24px}
        .foot{margin-top:18px;font-size:10px;color:#9ca3af;text-align:center}
        @media print{body{padding:0}thead{display:table-header-group}tr{break-inside:avoid}}
      </style></head><body>
      <div class="head">
        <div><div class="brand">Zair Zabar <span>POS</span></div><div class="sub">Session Sales Report · one row per business session (12 PM – 4 AM)</div></div>
        <div class="meta"><div>Month: <b>${esc(monthLabel)}</b></div><div>Sessions: <b>${keys.length}</b></div><div>Generated: <b>${esc(new Date().toLocaleString())}</b></div></div>
      </div>
      <h2>Sessions</h2>
      <table>
        <thead><tr>
          <th>Session Date</th><th class="c">Orders</th><th class="num">Cash</th><th class="num">Online</th>
          <th class="num">Collected</th><th class="num">Discount</th><th class="num">Pending</th>
        </tr></thead>
        <tbody>${rows || `<tr><td class="empty" colspan="7">No sessions in ${esc(monthLabel)}.</td></tr>`}</tbody>
        ${keys.length ? `<tfoot><tr>
          <td>Total (${keys.length} sessions)</td><td class="num">${t.orders}</td>
          <td class="num">${rs(t.cash)}</td><td class="num">${rs(t.online)}</td>
          <td class="num">${rs(t.cash + t.online)}</td><td class="num">${rs(t.discount)}</td><td class="num pend">${rs(t.pending)}</td>
        </tr></tfoot>` : ""}
      </table>
      <div class="foot">Zair Zabar POS · ${esc(monthLabel)} · Generated ${esc(new Date().toLocaleString())}</div>
      <script>window.onload=function(){window.focus();window.print();}</script>
      </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: surface, border: `1px solid ${grid}`, borderRadius: 10, padding: "10px 12px", minWidth: 160, boxShadow: "0 6px 24px rgba(0,0,0,.18)" }}>
        <div style={{ color: axis, fontSize: 11, marginBottom: 6, fontWeight: 600 }}>{label}</div>
        {payload.map((p) => (
          <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 14, fontSize: 12, marginBottom: 2 }}>
            <span style={{ color: axis }}>
              <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: p.color, marginRight: 7 }} />
              {p.name}
            </span>
            <span style={{ color: axis, fontWeight: 600 }}>Rs {p.value.toLocaleString()}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, fontSize: 12, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${grid}` }}>
          <span style={{ color: axis, fontWeight: 700 }}>Total</span>
          <span style={{ color: axis, fontWeight: 700 }}>Rs {payload.reduce((s, p) => s + (p.value || 0), 0).toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="accent-box container mx-auto bg-surface p-4 sm:p-5 rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-main text-xl font-semibold">Sales Trend</h2>
          <p className="text-muted text-sm">
            Last {days} days · Collected Rs {collected.toLocaleString()} · Pending Rs {totals.pending.toLocaleString()}
          </p>
        </div>
        {/* Segmented range control */}
        <div className="inline-flex bg-panel border border-line rounded-xl p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setDays(r.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                days === r.key ? "bg-accent text-white shadow-sm" : "text-muted hover:text-main"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center text-muted text-sm">Loading sales…</div>
      ) : !hasData ? (
        <div className="h-[300px] flex flex-col items-center justify-center text-center">
          <p className="text-main font-semibold">No sales in the last {days} days</p>
          <p className="text-muted text-sm mt-1">Once orders come in, the trend shows here.</p>
        </div>
      ) : (
        <>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke={axis} fontSize={11} tickLine={false} axisLine={{ stroke: grid }}
                  minTickGap={20} tickMargin={10} padding={{ left: 16, right: 16 }} />
                <YAxis stroke={axis} fontSize={11} tickLine={false} axisLine={false} width={56} tickMargin={8}
                  tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: axis, strokeDasharray: "3 3" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: axis }} iconType="plainline" />
                {SERIES.map((s) => (
                  <Line key={s.key} type="monotone" dataKey={s.key} name={s.name}
                    stroke={color(s)} strokeWidth={2.5} dot={false}
                    activeDot={{ r: 4, fill: color(s), stroke: surface, strokeWidth: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Context footer */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3 text-xs text-muted">
            <span>Collected: <span className="text-main font-semibold">Rs {collected.toLocaleString()}</span></span>
            <span>Pending: <span className="text-main font-semibold">Rs {totals.pending.toLocaleString()}</span></span>
            <span>Daily avg: <span className="text-main font-semibold">Rs {avgCollected.toLocaleString()}</span></span>
            {bestDay && (bestDay.cash + bestDay.online) > 0 && (
              <span>Best day: <span className="text-main font-semibold">{bestDay.label} · Rs {(bestDay.cash + bestDay.online).toLocaleString()}</span></span>
            )}
          </div>
        </>
      )}

      {/* Session report — one row per business session for the chosen month */}
      <div className="mt-5 pt-4 border-t border-line flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-main font-semibold">Session Sales Report</h3>
          <p className="text-muted text-sm">PDF with one row per session (12 PM – 4 AM) for a month.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
            className="bg-panel text-main border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={downloadSessionReport}
            className="bg-info text-white px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesChart;
