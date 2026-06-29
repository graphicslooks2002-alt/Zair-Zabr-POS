import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { FaArrowLeft } from "react-icons/fa";
import { getOrders, settleOrder } from "../https/index";
import { formatDateAndTime } from "../utils/index";
import Invoice from "../components/invoice/Invoice";
import BottomNav from "../components/shared/BottomNav";

// Each metric: how to filter the orders + which number it represents.
const METRICS = {
  revenue: { title: "Total Revenue", money: true, filter: (o) => o.paymentStatus !== "Pending", value: (o) => o.bills?.totalWithTax || 0, desc: "Collected amount from paid orders." },
  orders: { title: "Total Orders", money: false, filter: () => true, value: () => 1, desc: "Every order placed in this range." },
  paid: { title: "Paid Payments", money: false, filter: (o) => o.paymentStatus !== "Pending", value: () => 1, desc: "Orders that are fully paid." },
  pending: { title: "Pending Payments", money: false, filter: (o) => o.paymentStatus === "Pending", value: () => 1, desc: "Orders awaiting payment." },
  pendingAmount: { title: "Pending Amount", money: true, filter: (o) => o.paymentStatus === "Pending", value: (o) => o.bills?.totalWithTax || 0, desc: "Outstanding money to collect." },
  discounts: { title: "Discounts Given", money: true, filter: (o) => (o.discountAmount || 0) > 0, value: (o) => o.discountAmount || 0, desc: "Total discount applied across orders." },
  online: { title: "Online Payments", money: true, filter: (o) => o.paymentStatus !== "Pending" && o.paymentMethod === "Online", value: (o) => o.bills?.totalWithTax || 0, desc: "Paid via online transfer." },
  cash: { title: "Cash Payments", money: true, filter: (o) => o.paymentStatus !== "Pending" && o.paymentMethod === "Cash", value: (o) => o.bills?.totalWithTax || 0, desc: "Paid in cash." },
};

const MetricDetail = () => {
  const { key } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const from = params.get("from");
  const to = params.get("to");
  const rangeLabel = params.get("label") || "All time";

  const metric = METRICS[key];
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    document.title = `Zair Zabar POS | ${metric?.title || "Detail"}`;
  }, [metric]);

  const { data: resData } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => getOrders(),
    placeholderData: keepPreviousData,
  });

  const settleMutation = useMutation({
    mutationFn: (id) => settleOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["sessionSummary"] });
      enqueueSnackbar("Payment settled!", { variant: "success" });
    },
    onError: () => enqueueSnackbar("Failed to settle!", { variant: "error" }),
  });

  const { rows, figure } = useMemo(() => {
    const orders = resData?.data?.data || [];
    const inRange = orders.filter((o) => {
      const t = new Date(o.orderDate).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime()) return false;
      return true;
    });
    const rows = metric ? inRange.filter(metric.filter) : [];
    const figure = metric ? rows.reduce((s, o) => s + metric.value(o), 0) : 0;
    return { rows, figure };
  }, [resData, metric, from, to]);

  if (!metric) {
    return (
      <div className="bg-[#1f1f1f] h-[calc(100vh-64px)] flex items-center justify-center text-gray-400">
        Unknown metric. <button onClick={() => navigate("/dashboard")} className="text-[#e85d04] ml-2">Back</button>
      </div>
    );
  }

  const fmt = (n) => (metric.money ? `Rs ${Number(n).toFixed(0)}` : `${n}`);

  return (
    <div className="bg-[#1f1f1f] h-[calc(100vh-64px)] flex flex-col">
      <div className="flex items-center gap-4 px-8 py-5 shrink-0">
        <button onClick={() => navigate("/dashboard")} className="bg-[#262626] text-white p-2 rounded-lg">
          <FaArrowLeft />
        </button>
        <div>
          <h1 className="text-[#f5f5f5] text-2xl font-bold tracking-wide">{metric.title}</h1>
          <p className="text-[#ababab] text-sm">{metric.desc} · {rangeLabel}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[#ababab] text-xs uppercase">{metric.title}</p>
          <p className="text-[#f5f5f5] text-3xl font-bold">{fmt(figure)}</p>
          <p className="text-[#ababab] text-xs">{rows.length} order{rows.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-8 pb-24">
        <div className="bg-[#1a1a1a] rounded-lg overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[#ababab] border-b border-[#333]">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">{metric.money ? "Amount" : "Items"}</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[#f5f5f5]">
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No matching orders.</td></tr>
              ) : (
                rows.map((o) => (
                  <tr key={o._id} className="border-b border-[#262626]">
                    <td className="px-4 py-3">#{o._id.slice(-6)}</td>
                    <td className="px-4 py-3">{o.customerDetails?.name}</td>
                    <td className="px-4 py-3">{o.orderType || (o.table ? "Dine in" : "Take Away")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs ${o.paymentStatus === "Pending" ? "text-[#f6b100] bg-[#4a452e]" : "text-green-500 bg-[#2e4a40]"}`}>
                        {o.paymentStatus || "Paid"} · {o.paymentMethod || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#ababab]">{formatDateAndTime(o.orderDate)}</td>
                    <td className="px-4 py-3 text-right">
                      {metric.key === "discounts" || key === "discounts"
                        ? `Rs ${Number(o.discountAmount || 0).toFixed(0)}`
                        : metric.money
                        ? `Rs ${Number(o.bills?.totalWithTax || 0).toFixed(0)}`
                        : o.items?.length}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {o.paymentStatus === "Pending" && (
                          <button
                            onClick={() => settleMutation.mutate(o._id)}
                            disabled={settleMutation.isPending}
                            className="bg-[#02ca3a] text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => setReceipt(o)}
                          className="bg-[#025cca] text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                        >
                          Receipt
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {receipt && <Invoice orderInfo={receipt} setShowInvoice={() => setReceipt(null)} />}
      <BottomNav />
    </div>
  );
};

export default MetricDetail;
