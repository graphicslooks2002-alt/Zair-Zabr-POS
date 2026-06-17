import React, { useState } from "react";
import { FaCheckDouble, FaLongArrowAltRight } from "react-icons/fa";
import { FaCircle } from "react-icons/fa";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { formatDateAndTime, getAvatarName } from "../../utils/index";
import { updateOrderStatus, updateTable } from "../../https/index";
import Invoice from "../invoice/Invoice";

const OrderCard = ({ order }) => {
  const queryClient = useQueryClient();
  const [showInvoice, setShowInvoice] = useState(false);

  const tableMutation = useMutation({
    mutationFn: (data) => updateTable(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: () => {
      enqueueSnackbar("Failed to free table!", { variant: "error" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, orderStatus }) =>
      updateOrderStatus({ orderId, orderStatus }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      // Free the table once the order is completed so the seat is reusable.
      if (variables.orderStatus === "Completed" && order.table?._id) {
        tableMutation.mutate({
          tableId: order.table._id,
          status: "Available",
          orderId: null,
        });
      }
      enqueueSnackbar("Order status updated!", { variant: "success" });
    },
    onError: () => {
      enqueueSnackbar("Failed to update status!", { variant: "error" });
    },
  });

  const handleStatusChange = (e) => {
    statusMutation.mutate({ orderId: order._id, orderStatus: e.target.value });
  };

  const isCompleted = order.orderStatus === "Completed";

  // Settle: mark the order completed (which frees the table) and show the
  // printable receipt so the seat can be reassigned to a new customer.
  const handleSettle = () => {
    if (!isCompleted) {
      statusMutation.mutate({ orderId: order._id, orderStatus: "Completed" });
    }
    setShowInvoice(true);
  };

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
            <p className="text-[#ababab] text-sm">#{order._id.slice(-6)} / {order.table ? "Dine in" : "Takeaway"}</p>
            <p className="text-[#ababab] text-sm">{order.table ? <>Table <FaLongArrowAltRight className="text-[#ababab] ml-2 inline" /> {order.table.tableNo}</> : "Takeaway"}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {order.orderStatus === "Ready" ? (
              <>
                <p className="text-green-600 bg-[#2e4a40] px-2 py-1 rounded-lg">
                  <FaCheckDouble className="inline mr-2" /> {order.orderStatus}
                </p>
                <p className="text-[#ababab] text-sm">
                  <FaCircle className="inline mr-2 text-green-600" /> Ready to
                  serve
                </p>
              </>
            ) : order.orderStatus === "Completed" ? (
              <>
                <p className="text-blue-500 bg-[#2e3a4a] px-2 py-1 rounded-lg">
                  <FaCheckDouble className="inline mr-2" /> {order.orderStatus}
                </p>
                <p className="text-[#ababab] text-sm">
                  <FaCircle className="inline mr-2 text-blue-500" /> Order completed
                </p>
              </>
            ) : (
              <>
                <p className="text-yellow-600 bg-[#4a452e] px-2 py-1 rounded-lg">
                  <FaCircle className="inline mr-2" /> {order.orderStatus}
                </p>
                <p className="text-[#ababab] text-sm">
                  <FaCircle className="inline mr-2 text-yellow-600" /> Preparing your order
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-4 text-[#ababab]">
        <p>{formatDateAndTime(order.orderDate)}</p>
        <p>{order.items.length} Items</p>
      </div>
      <hr className="w-full mt-4 border-t-1 border-gray-500" />
      <div className="flex items-center justify-between mt-4">
        <h1 className="text-[#f5f5f5] text-lg font-semibold">Total</h1>
        <p className="text-[#f5f5f5] text-lg font-semibold">Rs{order.bills.totalWithTax.toFixed(2)}</p>
      </div>
      {!isCompleted && (
        <div className="flex items-center justify-between mt-3">
          <label className="text-[#ababab] text-sm">Kitchen Status</label>
          <select
            value={order.orderStatus}
            onChange={handleStatusChange}
            disabled={statusMutation.isPending}
            className="bg-[#1f1f1f] text-[#f5f5f5] text-sm rounded-lg px-3 py-2 outline-none cursor-pointer disabled:opacity-50"
          >
            <option value="In Progress">In Progress</option>
            <option value="Ready">Ready</option>
          </select>
        </div>
      )}

      <button
        onClick={handleSettle}
        disabled={statusMutation.isPending}
        className={`w-full mt-3 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 ${
          isCompleted
            ? "bg-[#1f1f1f] text-[#025cca] border border-[#025cca]"
            : "bg-[#e85d04] text-white"
        }`}
      >
        {isCompleted ? "View Receipt" : "Generate Receipt & Complete"}
      </button>

      {showInvoice && (
        <Invoice orderInfo={order} setShowInvoice={setShowInvoice} />
      )}
    </div>
  );
};

export default OrderCard;
