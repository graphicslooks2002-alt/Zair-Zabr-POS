import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FaArrowLeft, FaSearch, FaDownload } from "react-icons/fa";
import { getMenu, getOrders } from "../https/index";
import { menus as defaultMenu } from "../constants";
import BottomNav from "../components/shared/BottomNav";

const PERIODS = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

const AllDishes = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => { document.title = "Zair Zabar POS | All Dishes"; }, []);

  const { data: menuRes } = useQuery({ queryKey: ["menu"], queryFn: async () => getMenu(), placeholderData: keepPreviousData });
  const { data: ordersRes } = useQuery({ queryKey: ["orders"], queryFn: async () => getOrders(), placeholderData: keepPreviousData });

  // Selected period → { from, to } as epoch ms (null = unbounded).
  const range = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    if (period === "today") return { from: startOfToday.getTime(), to: null };
    if (period === "yesterday") {
      const y = new Date(startOfToday); y.setDate(y.getDate() - 1);
      return { from: y.getTime(), to: startOfToday.getTime() };
    }
    if (period === "week") {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      return { from: d.getTime(), to: null };
    }
    if (period === "month") {
      const d = new Date(now); d.setMonth(d.getMonth() - 1);
      return { from: d.getTime(), to: null };
    }
    if (period === "custom") {
      return {
        from: customFrom ? new Date(customFrom).getTime() : null,
        to: customTo ? new Date(customTo + "T23:59:59").getTime() : null,
      };
    }
    return { from: null, to: null };
  }, [period, customFrom, customTo]);

  const periodLabel = PERIODS.find((p) => p.key === period)?.label || "All Time";

  const rows = useMemo(() => {
    const menu = menuRes?.data?.data?.length ? menuRes.data.data : defaultMenu;
    const orders = ordersRes?.data?.data || [];

    // Keep only orders inside the selected period.
    const inRange = orders.filter((o) => {
      const t = new Date(o.orderDate).getTime();
      if (range.from != null && t < range.from) return false;
      if (range.to != null && t > range.to) return false;
      return true;
    });

    // Units sold + revenue per product name.
    // Cart stores `price` = line total (qty × unit) and `pricePerQuantity` = unit,
    // so line revenue is `price` as-is — do NOT multiply by qty again.
    const stat = {};
    inRange.forEach((o) => (o.items || []).forEach((it) => {
      if (!it?.name) return;
      const qty = it.quantity || 1;
      const lineRevenue = it.price ?? qty * (it.pricePerQuantity ?? 0);
      const s = stat[it.name] || (stat[it.name] = { count: 0, revenue: 0 });
      s.count += qty;
      s.revenue += lineRevenue;
    }));

    // Every menu item with its sold count + revenue (0 if never sold).
    const list = [];
    menu.forEach((c) => (c.items || []).forEach((p) => {
      const s = stat[p.name] || { count: 0, revenue: 0 };
      // Fallback: if a sold item had no stored unit price, value it at menu price.
      const revenue = s.revenue || s.count * (p.price || 0);
      list.push({ name: p.name, price: p.price, category: c.name, count: s.count, revenue });
    }));
    return list.sort((a, b) => b.count - a.count);
  }, [menuRes, ordersRes, range]);

  const q = search.trim().toLowerCase();
  const filtered = q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)) : rows;
  const totalSold = rows.reduce((s, r) => s + r.count, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  const exportCsv = () => {
    // Export exactly what's on screen: current period + search filter.
    const cell = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const filteredSold = filtered.reduce((s, r) => s + r.count, 0);
    const filteredRevenue = filtered.reduce((s, r) => s + r.revenue, 0);

    const meta = [
      ["Zair Zabar POS — Dishes Report"],
      ["Period", periodLabel],
      ...(search.trim() ? [["Search", search.trim()]] : []),
      ["Generated", new Date().toLocaleString()],
      ["Dishes", filtered.length],
      ["Total Units Sold", filteredSold],
      ["Total Revenue (Rs)", Math.round(filteredRevenue)],
      [],
    ];
    const header = ["#", "Dish", "Category", "Price (Rs)", "Sold", "Revenue (Rs)"];
    const body = filtered.map((r, i) => [
      i + 1, r.name, r.category, r.price, r.count, Math.round(r.revenue),
    ]);

    const csv = [...meta, header, ...body].map((r) => r.map(cell).join(",")).join("\n");
    // BOM so Excel reads UTF-8 correctly.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zair-zabar-dishes-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-base min-h-[calc(100dvh-64px)] flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-10 py-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="bg-surface text-main p-2 rounded-lg"><FaArrowLeft /></button>
          <div>
            <h1 className="text-main text-2xl font-bold tracking-wider">All Dishes</h1>
            <p className="text-muted text-sm">
              {rows.length} items · {totalSold} units · Rs{Math.round(totalRevenue)} ({periodLabel})
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Custom date inputs appear to the LEFT of the period dropdown. */}
          {period === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-panel text-main text-sm rounded-lg px-3 py-2 outline-none" />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="bg-panel text-main text-sm rounded-lg px-3 py-2 outline-none" />
            </>
          )}
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="bg-panel text-main text-sm rounded-lg px-3 py-2 outline-none cursor-pointer">
            {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <button onClick={exportCsv} disabled={filtered.length === 0}
            className="flex items-center gap-2 bg-info text-white text-sm font-semibold rounded-lg px-3 py-2 disabled:opacity-50 whitespace-nowrap">
            <FaDownload /> Download
          </button>
          <div className="flex items-center gap-2 bg-panel rounded-lg px-4 py-2 flex-1 sm:w-[240px] sm:flex-none">
            <FaSearch className="text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dish or category"
              className="bg-transparent outline-none text-main text-sm w-full" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 sm:px-10 pb-24">
        <div className="bg-panel rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
            <thead className="text-muted border-b border-elevated">
              <tr>
                <th className="px-2 sm:px-4 py-2.5 w-12">#</th>
                <th className="px-2 sm:px-4 py-2.5">Dish</th>
                <th className="px-2 sm:px-4 py-2.5">Category</th>
                <th className="px-2 sm:px-4 py-2.5 text-right">Price</th>
                <th className="px-2 sm:px-4 py-2.5 text-right">Sold</th>
                <th className="px-2 sm:px-4 py-2.5 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="text-main">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No dishes found.</td></tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={`${r.category}-${r.name}`} className="border-b border-surface">
                    <td className="px-2 sm:px-4 py-2.5 text-muted">{i + 1}</td>
                    <td className="px-2 sm:px-4 py-2.5 font-medium">{r.name}</td>
                    <td className="px-2 sm:px-4 py-2.5 text-muted">{r.category}</td>
                    <td className="px-2 sm:px-4 py-2.5 text-right">Rs{r.price}</td>
                    <td className="px-2 sm:px-4 py-2.5 text-right">
                      <span className={`px-2 py-1 rounded-lg text-xs ${r.count > 0 ? "bg-[#2e4a40] text-green-400" : "bg-elevated text-faint"}`}>
                        {r.count}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2.5 text-right font-medium text-success">Rs{Math.round(r.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AllDishes;
