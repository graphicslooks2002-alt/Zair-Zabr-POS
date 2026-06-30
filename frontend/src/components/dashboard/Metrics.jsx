import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { menus } from "../../constants";
import { getSessionSummary, getSummary, getTables } from "../../https/index";
import { formatDateAndTime } from "../../utils/index";

const MODES = [
  { key: "session", label: "Current Session" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "custom", label: "Custom" },
];

const Metrics = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState("session");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    const end = new Date().toISOString();
    if (mode === "daily") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return { from: d.toISOString(), to: end };
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
      return {
        from: customFrom ? new Date(customFrom).toISOString() : undefined,
        to: customTo ? new Date(customTo + "T23:59:59").toISOString() : undefined,
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

  const exportCsv = () => {
    if (!stats) return;
    const label = mode === "session" ? "Current Session" : MODES.find((m) => m.key === mode)?.label;
    const lines = [
      ["Zair Zabar POS — Report", label],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Total Revenue", stats.totalRevenue],
      ["Total Orders", stats.totalOrders],
      ["Paid Payments", stats.paidPayments],
      ["Pending Payments", stats.pendingPayments],
      ["Pending Amount", stats.pendingAmount],
      ["Discounts Given", stats.discountsGiven],
      ["Online Payments", stats.onlinePayments],
      ["Cash Payments", stats.cashPayments],
    ];
    const csv = lines.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zair-zabar-report-${mode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-2 px-6 md:px-4">
      {/* Session bar — automatic 12 PM – 4 AM business session */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1a1a1a] rounded-lg p-4 mb-6">
        <div>
          <p className="text-[#f5f5f5] font-semibold">
            {session?.active ? "🟢 Session Active" : "🌙 Between Sessions"} · Daily 12:00 PM – 4:00 AM
          </p>
          <p className="text-[#ababab] text-xs mt-1">
            {session
              ? `This session: ${formatDateAndTime(session.opened_at)} → ${formatDateAndTime(session.closes_at)}`
              : "Automatic business session."}
          </p>
        </div>
        <span className="text-[#ababab] text-xs bg-[#262626] px-3 py-2 rounded-lg">Auto</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                mode === m.key ? "bg-[#262626] text-white" : "bg-[#1a1a1a] text-[#ababab]"
              }`}
            >
              {m.label}
            </button>
          ))}
          {mode === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-[#1a1a1a] text-white text-sm rounded-lg px-3 py-2 outline-none" />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="bg-[#1a1a1a] text-white text-sm rounded-lg px-3 py-2 outline-none" />
            </>
          )}
        </div>
        <button onClick={exportCsv} className="bg-[#025cca] text-white px-4 py-2 rounded-lg text-sm font-semibold">
          Export CSV
        </button>
      </div>

      <h2 className="font-semibold text-[#f5f5f5] text-xl">Overall Performance</h2>
      <p className="text-sm text-[#ababab]">
        {mode === "session" ? "Revenue for the current business session." : `Showing: ${MODES.find((m) => m.key === mode)?.label}`}
      </p>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => openDetail(c.key)}
            className="text-left shadow-sm rounded-lg p-4 transition-transform hover:scale-[1.02] hover:brightness-110 cursor-pointer"
            style={{ backgroundColor: c.color }}
          >
            <p className="font-medium text-xs text-[#f5f5f5]">{c.title}</p>
            <p className="mt-1 font-semibold text-2xl text-[#f5f5f5]">{c.value}</p>
            <p className="text-[10px] text-[#f5f5f5] opacity-70 mt-2">Tap for details →</p>
          </button>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="font-semibold text-[#f5f5f5] text-xl">Item Details</h2>
        <p className="text-sm text-[#ababab]">Catalog size and live counts.</p>
        <div className="mt-6 grid grid-cols-4 gap-4">
          {items.map((c, i) => (
            <div key={i} className="shadow-sm rounded-lg p-4" style={{ backgroundColor: c.color }}>
              <p className="font-medium text-xs text-[#f5f5f5]">{c.title}</p>
              <p className="mt-1 font-semibold text-2xl text-[#f5f5f5]">{c.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Metrics;
