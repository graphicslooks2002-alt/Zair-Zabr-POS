import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomNav from "../components/shared/BottomNav";
import OrderCard from "../components/orders/OrderCard";
import BackButton from "../components/shared/BackButton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getOrders } from "../https/index";
import { enqueueSnackbar } from "notistack";
import { FaPlus, FaSearch } from "react-icons/fa";

// Session periods (business session 12 PM–4 AM PKT) and calendar-day periods.
const SESSION_PERIODS = [
  { key: "session-current", label: "Current Session" },
  { key: "session-last", label: "Last Session" },
  { key: "session-week", label: "Last 7 Sessions" },
  { key: "session-month", label: "Last 30 Sessions" },
];
const DAY_PERIODS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
  { key: "all", label: "All Time" },
];
const ALL_PERIODS = [...SESSION_PERIODS, ...DAY_PERIODS];

const DAY = 86400000;
const HOUR = 3600000;
// PKT (UTC+5) start-of-day for a YYYY-MM-DD string.
const pktDayStart = (str) => new Date(str + "T00:00:00+05:00").getTime();
const pktTodayStr = () => new Date(Date.now() + 5 * HOUR).toISOString().slice(0, 10);
// Shift a PKT date string by n days.
const shiftDay = (str, n) => new Date(pktDayStart(str) + n * DAY + 5 * HOUR).toISOString().slice(0, 10);
// A session that STARTED on date D runs D 12:00 PM → (D+1) 4:00 AM PKT.
const sessionStart = (D) => pktDayStart(D) + 12 * HOUR;
const sessionEnd = (D) => pktDayStart(D) + 28 * HOUR;
// The session date whose window contains "now" (or the most recent one during the 4 AM–12 PM gap).
const currentSessionDate = () => {
  const pktNow = new Date(Date.now() + 5 * HOUR);
  const hour = pktNow.getUTCHours();
  const today = pktNow.toISOString().slice(0, 10);
  if (hour < 4) return shiftDay(today, -1); // still inside yesterday's session (past midnight)
  if (hour >= 12) return today;             // inside today's session
  return shiftDay(today, -1);               // closed gap: show the last session
};

const Orders = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || "");
  const [period, setPeriod] = useState("today"); // default: today's orders
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    document.title = "Zair Zabar POS | Orders";
  }, []);

  // Sync the search box when arriving via the header search (?q=...).
  useEffect(() => { setSearch(params.get("q") || ""); }, [params]);

  const { data: resData, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => getOrders(),
    placeholderData: keepPreviousData,
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }

  // Selected period → { from, to } epoch ms, anchored to PKT (null = unbounded).
  const range = useMemo(() => {
    const todayStart = pktDayStart(pktTodayStr());

    // Session-based windows (12 PM–4 AM PKT).
    if (period === "session-current") { const D = currentSessionDate(); return { from: sessionStart(D), to: sessionEnd(D) }; }
    if (period === "session-last") { const D = shiftDay(currentSessionDate(), -1); return { from: sessionStart(D), to: sessionEnd(D) }; }
    if (period === "session-week") { const D = shiftDay(currentSessionDate(), -6); return { from: sessionStart(D), to: null }; }
    if (period === "session-month") { const D = shiftDay(currentSessionDate(), -29); return { from: sessionStart(D), to: null }; }

    // Calendar-day windows.
    if (period === "today") return { from: todayStart, to: null };
    if (period === "yesterday") return { from: todayStart - DAY, to: todayStart };
    if (period === "week") return { from: todayStart - 6 * DAY, to: null };   // last 7 days incl. today
    if (period === "month") return { from: todayStart - 29 * DAY, to: null }; // last 30 days incl. today
    if (period === "custom") {
      return {
        from: customFrom ? pktDayStart(customFrom) : null,
        to: customTo ? new Date(customTo + "T23:59:59.999+05:00").getTime() : null,
      };
    }
    return { from: null, to: null }; // all
  }, [period, customFrom, customTo]);

  const orders = resData?.data?.data || [];
  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const t = new Date(o.orderDate).getTime();
      if (range.from != null && t < range.from) return false;
      if (range.to != null && t > range.to) return false;
      if (q && !(o._id?.toLowerCase().includes(q) || o.customerDetails?.name?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [orders, range, q]);

  const periodLabel = ALL_PERIODS.find((p) => p.key === period)?.label || "";

  return (
    <div className="bg-base min-h-[calc(100dvh-64px)] flex flex-col">
      {/* Top row: title + search + create */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-10 pt-4 shrink-0">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-main text-2xl font-bold tracking-wider">Orders</h1>
            <p className="text-muted text-sm">
              <span className="text-main font-semibold">{filtered.length}</span> order{filtered.length === 1 ? "" : "s"} · {periodLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-panel border border-line rounded-lg px-4 py-2 flex-1 sm:w-[240px] sm:flex-none focus-within:border-accent transition-colors">
            <FaSearch className="text-muted shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID or name"
              className="bg-transparent outline-none text-main placeholder:text-faint text-sm w-full"
            />
          </div>
          <button
            onClick={() => navigate("/orders/new")}
            className="flex items-center gap-2 bg-accent text-white font-semibold rounded-lg px-4 sm:px-5 py-2 whitespace-nowrap shrink-0"
          >
            <FaPlus /> <span className="hidden xs:inline sm:inline">Create Order</span>
          </button>
        </div>
      </div>

      {/* Filter chips: Session row + Date row (scroll on mobile) */}
      <div className="px-4 sm:px-10 pt-3 pb-3 shrink-0 space-y-2 border-b border-line">
        {[{ label: "Session", items: SESSION_PERIODS }, { label: "Date", items: DAY_PERIODS }].map((grp) => (
          <div key={grp.label} className="flex items-center gap-2">
            <span className="text-faint text-[10px] font-bold uppercase tracking-wider w-14 shrink-0">{grp.label}</span>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {grp.items.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors ${
                    period === p.key
                      ? "bg-accent text-white border-accent shadow-sm"
                      : "bg-panel text-muted border-line hover:text-main hover:border-accent/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-faint text-[10px] font-bold uppercase tracking-wider w-14 shrink-0">Range</span>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-panel text-main border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent" />
            <span className="text-muted text-sm">to</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="bg-panel text-main border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 sm:px-10 py-4">
          {filtered.length > 0 ? (
            filtered.map((order) => <OrderCard key={order._id} order={order} />)
          ) : (
            <p className="col-span-2 text-gray-500">No orders found for {periodLabel.toLowerCase()}.</p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Orders;
