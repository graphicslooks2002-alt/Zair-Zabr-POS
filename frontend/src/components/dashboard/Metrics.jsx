import React, { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { menus } from "../../constants";
import { getOrders, getTables } from "../../https/index";

const RANGES = ["Today", "Last 7 Days", "Last 1 Month", "All Time"];

const rangeStart = (range) => {
  const d = new Date();
  if (range === "Today") {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "Last 7 Days") {
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (range === "Last 1 Month") {
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  return new Date(0); // All Time
};

const pct = (cur, prev) =>
  prev > 0 ? +(((cur - prev) / prev) * 100).toFixed(1) : cur > 0 ? 100 : 0;

const Metrics = () => {
  const [range, setRange] = useState("Last 1 Month");

  const { data: ordersRes } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => getOrders(),
    placeholderData: keepPreviousData,
  });

  const { data: tablesRes } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => getTables(),
    placeholderData: keepPreviousData,
  });

  const { metrics, items } = useMemo(() => {
    const orders = ordersRes?.data?.data || [];
    const tables = tablesRes?.data?.data || [];

    const start = rangeStart(range);
    const now = new Date();
    const periodMs = now.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodMs);

    let revenue = 0;
    let prevRevenue = 0;
    let orderCount = 0;
    let prevOrderCount = 0;
    const customers = new Set();

    orders.forEach((o) => {
      const od = new Date(o.orderDate);
      const amt = o.bills?.totalWithTax || 0;
      if (od >= start) {
        revenue += amt;
        orderCount++;
        if (o.customerDetails?.phone) customers.add(o.customerDetails.phone);
      } else if (range !== "All Time" && od >= prevStart && od < start) {
        prevRevenue += amt;
        prevOrderCount++;
      }
    });

    const avg = orderCount > 0 ? revenue / orderCount : 0;
    const prevAvg = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;
    const activeOrders = orders.filter(
      (o) => o.orderStatus === "In Progress"
    ).length;
    const totalDishes = menus.reduce((s, m) => s + (m.items?.length || 0), 0);

    const trend = (p) => ({ percentage: `${p >= 0 ? "+" : ""}${p}%`, isIncrease: p >= 0 });

    const metrics = [
      { title: "Revenue", value: `Rs ${revenue.toFixed(0)}`, color: "#e85d04", ...trend(pct(revenue, prevRevenue)) },
      { title: "Orders", value: `${orderCount}`, color: "#02ca3a", ...trend(pct(orderCount, prevOrderCount)) },
      { title: "Total Customers", value: `${customers.size}`, color: "#f6b100", ...trend(0) },
      { title: "Avg Order Value", value: `Rs ${avg.toFixed(0)}`, color: "#d00000", ...trend(pct(avg, prevAvg)) },
    ];

    const items = [
      { title: "Total Categories", value: `${menus.length}`, color: "#5b45b0", ...trend(0) },
      { title: "Total Dishes", value: `${totalDishes}`, color: "#285430", ...trend(0) },
      { title: "Active Orders", value: `${activeOrders}`, color: "#735f32", ...trend(0) },
      { title: "Total Tables", value: `${tables.length}`, color: "#7f167f", ...trend(0) },
    ];

    return { metrics, items };
  }, [ordersRes, tablesRes, range]);

  return (
    <div className="container mx-auto py-2 px-6 md:px-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-[#f5f5f5] text-xl">
            Overall Performance
          </h2>
          <p className="text-sm text-[#ababab]">
            Revenue, orders and customers for the selected period.
          </p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="px-4 py-2 rounded-md text-[#f5f5f5] bg-[#1a1a1a] outline-none cursor-pointer"
        >
          {RANGES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          return (
            <div
              key={index}
              className="shadow-sm rounded-lg p-4"
              style={{ backgroundColor: metric.color }}
            >
              <div className="flex justify-between items-center">
                <p className="font-medium text-xs text-[#f5f5f5]">
                  {metric.title}
                </p>
                <div className="flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    style={{ color: metric.isIncrease ? "#f5f5f5" : "red" }}
                  >
                    <path
                      d={metric.isIncrease ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                    />
                  </svg>
                  <p
                    className="font-medium text-xs"
                    style={{ color: metric.isIncrease ? "#f5f5f5" : "red" }}
                  >
                    {metric.percentage}
                  </p>
                </div>
              </div>
              <p className="mt-1 font-semibold text-2xl text-[#f5f5f5]">
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col justify-between mt-12">
        <div>
          <h2 className="font-semibold text-[#f5f5f5] text-xl">
            Item Details
          </h2>
          <p className="text-sm text-[#ababab]">
            Catalog size and live order/table counts.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          {items.map((item, index) => {
            return (
              <div key={index} className="shadow-sm rounded-lg p-4" style={{ backgroundColor: item.color }}>
                <div className="flex justify-between items-center">
                  <p className="font-medium text-xs text-[#f5f5f5]">{item.title}</p>
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4" fill="none">
                      <path d="M5 15l7-7 7 7" />
                    </svg>
                    <p className="font-medium text-xs text-[#f5f5f5]">{item.percentage}</p>
                  </div>
                </div>
                <p className="mt-1 font-semibold text-2xl text-[#f5f5f5]">{item.value}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Metrics;
