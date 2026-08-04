import React, { useState, useRef, useEffect } from "react";
import { FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getOrders } from "../../https/index";

// Working notifications: surfaces actionable items from live data. Today it shows
// orders with payment still pending; the panel + badge are ready to extend with
// more notification types later (e.g. from an n8n/automation feed).
const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => getOrders(),
    placeholderData: keepPreviousData,
  });

  const orders = data?.data?.data || [];
  const pending = orders
    .filter((o) => o.paymentStatus === "Pending")
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
  const count = pending.length;

  // Close on outside click / Escape.
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  const go = (path) => { setOpen(false); navigate(path); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className="relative bg-base hover:bg-hover border border-line rounded-xl p-2.5 text-main transition-colors"
      >
        <FaBell className="text-lg sm:text-xl" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-24px)] bg-surface border border-line rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <h3 className="text-main font-semibold text-sm">Notifications</h3>
            {count > 0 && <span className="text-xs text-muted">{count} pending</span>}
          </div>

          <div className="max-h-80 overflow-y-auto scrollbar-hide">
            {count === 0 ? (
              <div className="px-4 py-8 text-center text-muted text-sm">You're all caught up 🎉</div>
            ) : (
              pending.slice(0, 15).map((o) => (
                <button
                  key={o._id}
                  onClick={() => go("/orders")}
                  className="w-full text-left px-4 py-3 border-b border-line hover:bg-hover transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-main text-sm font-medium truncate">
                      {o.customerDetails?.name || "Walk-in Customer"}
                    </span>
                    <span className="text-warn text-xs font-semibold whitespace-nowrap">
                      Rs{Number(o.bills?.totalWithTax || 0).toFixed(0)}
                    </span>
                  </div>
                  <div className="text-muted text-xs mt-0.5">Payment pending · #{String(o._id).slice(-6)}</div>
                </button>
              ))
            )}
          </div>

          {count > 0 && (
            <button onClick={() => go("/orders")} className="w-full text-center py-2.5 text-info text-sm font-semibold hover:bg-hover">
              View all orders
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
