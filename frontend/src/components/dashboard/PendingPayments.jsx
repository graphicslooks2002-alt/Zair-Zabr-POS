import React from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getPendingPayments, settlePending } from "../../https/index";
import { formatDateAndTime } from "../../utils/index";

const PendingPayments = () => {
  const queryClient = useQueryClient();

  const { data: resData, isError } = useQuery({
    queryKey: ["pending"],
    queryFn: async () => getPendingPayments("Pending"),
    placeholderData: keepPreviousData,
  });

  if (isError) enqueueSnackbar("Failed to load pending payments!", { variant: "error" });

  const settleMutation = useMutation({
    mutationFn: (id) => settlePending(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["sessionSummary"] });
      enqueueSnackbar("Payment settled!", { variant: "success" });
    },
    onError: () => enqueueSnackbar("Failed to settle!", { variant: "error" }),
  });

  const rows = resData?.data?.data || [];

  return (
    <div className="container mx-auto py-2 px-6">
      <h2 className="font-semibold text-[#f5f5f5] text-xl mb-1">Pending Payments</h2>
      <p className="text-sm text-[#ababab] mb-4">Outstanding amounts customers promised to pay later.</p>

      <div className="overflow-x-auto rounded-lg bg-[#1a1a1a]">
        <table className="w-full text-left text-sm">
          <thead className="text-[#ababab] border-b border-[#333]">
            <tr>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Pending</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Remarks</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-[#f5f5f5]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                  No pending payments 🎉
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p._id} className="border-b border-[#262626]">
                  <td className="px-4 py-3">#{(p.orderId || p._id).slice(-6)}</td>
                  <td className="px-4 py-3">{p.customerName}</td>
                  <td className="px-4 py-3">{p.phone}</td>
                  <td className="px-4 py-3">{Array.isArray(p.items) ? p.items.length : 0}</td>
                  <td className="px-4 py-3 text-[#f6b100] font-semibold">Rs{Number(p.pendingAmount).toFixed(0)}</td>
                  <td className="px-4 py-3 text-[#ababab]">{formatDateAndTime(p.orderDate)}</td>
                  <td className="px-4 py-3 text-[#ababab]">{p.remarks || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => settleMutation.mutate(p._id)}
                      disabled={settleMutation.isPending}
                      className="bg-[#02ca3a] text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                    >
                      Mark Paid
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PendingPayments;
