import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import { getMenu, getOrders } from "../https/index";
import { menus as defaultMenu } from "../constants";
import BottomNav from "../components/shared/BottomNav";

const AllDishes = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  useEffect(() => { document.title = "Zair Zabar POS | All Dishes"; }, []);

  const { data: menuRes } = useQuery({ queryKey: ["menu"], queryFn: async () => getMenu(), placeholderData: keepPreviousData });
  const { data: ordersRes } = useQuery({ queryKey: ["orders"], queryFn: async () => getOrders(), placeholderData: keepPreviousData });

  const rows = useMemo(() => {
    const menu = menuRes?.data?.data?.length ? menuRes.data.data : defaultMenu;
    const orders = ordersRes?.data?.data || [];

    // Units sold per product name (all time).
    const sold = {};
    orders.forEach((o) => (o.items || []).forEach((it) => {
      if (!it?.name) return;
      sold[it.name] = (sold[it.name] || 0) + (it.quantity || 1);
    }));

    // Every menu item with its sold count (0 if never sold).
    const list = [];
    menu.forEach((c) => (c.items || []).forEach((p) => {
      list.push({ name: p.name, price: p.price, category: c.name, count: sold[p.name] || 0 });
    }));
    return list.sort((a, b) => b.count - a.count);
  }, [menuRes, ordersRes]);

  const q = search.trim().toLowerCase();
  const filtered = q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)) : rows;
  const totalSold = rows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="bg-[#1f1f1f] h-[calc(100vh-64px)] flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-10 py-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="bg-[#262626] text-white p-2 rounded-lg"><FaArrowLeft /></button>
          <div>
            <h1 className="text-[#f5f5f5] text-2xl font-bold tracking-wider">All Dishes</h1>
            <p className="text-[#ababab] text-sm">{rows.length} items · {totalSold} units sold (all time)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-4 py-2 w-full sm:w-[280px]">
          <FaSearch className="text-[#ababab]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dish or category"
            className="bg-transparent outline-none text-[#f5f5f5] text-sm w-full" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 sm:px-10 pb-24">
        <div className="bg-[#1a1a1a] rounded-lg overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[#ababab] border-b border-[#333]">
              <tr>
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Dish</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Sold</th>
              </tr>
            </thead>
            <tbody className="text-[#f5f5f5]">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No dishes found.</td></tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={`${r.category}-${r.name}`} className="border-b border-[#262626]">
                    <td className="px-4 py-3 text-[#ababab]">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-[#ababab]">{r.category}</td>
                    <td className="px-4 py-3 text-right">Rs{r.price}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-lg text-xs ${r.count > 0 ? "bg-[#2e4a40] text-green-400" : "bg-[#3a3a3a] text-[#888]"}`}>
                        {r.count}
                      </span>
                    </td>
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
