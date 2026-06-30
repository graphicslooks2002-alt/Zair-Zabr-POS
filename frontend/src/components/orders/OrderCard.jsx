import React, { useState } from "react";
import { FaLongArrowAltRight } from "react-icons/fa";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { formatDateAndTime, getAvatarName } from "../../utils/index";
import { settleOrder } from "../../https/index";
import Invoice from "../invoice/Invoice";

const OrderCard = ({ order }) => {
  const queryClient = useQueryClient();
  const [showInvoice, setShowInvoice] = useState(false);

  const isPending = order.paymentStatus === "Pending";

  const settleMutation = useMutation({
    mutationFn: () => settleOrder(order._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["sessionSummary"] });
      enqueueSnackbar("Payment settled!", { variant: "success" });
    },
    onError: () => enqueueSnackbar("Could not mark the payment as paid. Please try again.", { variant: "error" }),
  });

  return (
    <div className="w-full bg-[#262626] p-4 rounded-lg mb-4">
      <div className="flex items-center gap-5">
        <button className="bg-[#e85d04] p-3 text-xl font-bold rounded-lg text-white">
          {getAvatarName(order.customerDetails.name)}
        </button>
        <div className="flex items-center justify-between w-[100%]">
          <div className="flex flex-col items-start gap-1">
            <h1 className="text-[#f5f5f5] text-lg font-semibold tracking-wide">
              {order.customerDetails.name}
            </h1>
            <p className="text-[#ababab] text-sm">
              #{order._id.slice(-6)} / {order.orderType || (order.table ? "Dine in" : "Take Away")}
            </p>
            <p className="text-[#ababab] text-sm">
              {order.table ? (
                <>Table <FaLongArrowAltRight className="text-[#ababab] ml-2 inline" /> {order.table.tableNo}</>
              ) : (
                "Takeaway"
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p
              className={`px-2 py-1 rounded-lg text-sm ${
                isPending ? "text-[#f6b100] bg-[#4a452e]" : "text-green-500 bg-[#2e4a40]"
              }`}
            >
              {order.paymentStatus || "Paid"}
            </p>
            <p className="text-[#ababab] text-xs">{order.paymentMethod || "—"}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 text-[#ababab] text-sm">
        <p>{formatDateAndTime(order.orderDate)}</p>
        <p>{order.items.length} Items</p>
      </div>
      <hr className="w-full mt-3 border-t-1 border-gray-500" />
      <div className="flex items-center justify-between mt-3">
        <h1 className="text-[#f5f5f5] text-lg font-semibold">Total</h1>
        <p className="text-[#f5f5f5] text-lg font-semibold">Rs{order.bills.totalWithTax.toFixed(2)}</p>
      </div>

      <div className="flex items-center gap-2 mt-3">
        {isPending && (
          <button
            onClick={() => settleMutation.mutate()}
            disabled={settleMutation.isPending}
            className="flex-1 bg-[#02ca3a] text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {settleMutation.isPending ? "..." : "Mark Paid"}
          </button>
        )}
        <button
          onClick={() => setShowInvoice(true)}
          className="flex-1 bg-[#025cca] text-white py-2 rounded-lg text-sm font-semibold"
        >
          Receipt
        </button>
      </div>

      {showInvoice && <Invoice orderInfo={order} setShowInvoice={setShowInvoice} />}
    </div>
  );
};

export default OrderCard;
