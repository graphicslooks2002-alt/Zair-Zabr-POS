import React, { useState } from "react";
import { FaLongArrowAltRight, FaEdit, FaTrash } from "react-icons/fa";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";
import { formatDateAndTime, getAvatarName } from "../../utils/index";
import { settleOrder, deleteOrder } from "../../https/index";
import Invoice from "../invoice/Invoice";
import EditOrderModal from "./EditOrderModal";

const OrderCard = ({ order }) => {
  const queryClient = useQueryClient();
  const { role } = useSelector((state) => state.user);
  const canDelete = role === "Superadmin";
  const [showInvoice, setShowInvoice] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrder(order._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["sessionSummary"] });
      enqueueSnackbar("Order deleted.", { variant: "success" });
      setConfirmDelete(false);
    },
    onError: (err) => enqueueSnackbar(err?.response?.data?.message || "Could not delete the order.", { variant: "error" }),
  });

  return (
    <div className="w-full bg-surface p-4 rounded-lg mb-4">
      <div className="flex items-center gap-5">
        <button className="bg-accent p-3 text-xl font-bold rounded-lg text-white">
          {getAvatarName(order.customerDetails.name)}
        </button>
        <div className="flex items-center justify-between w-[100%]">
          <div className="flex flex-col items-start gap-1">
            <h1 className="text-main text-lg font-semibold tracking-wide">
              {order.customerDetails.name}
            </h1>
            <p className="text-muted text-sm">
              #{order._id.slice(-6)} / {order.orderType || (order.table ? "Dine In" : "Take Away")}
            </p>
            {order.table && (
              <p className="text-muted text-sm flex items-center">
                Table <FaLongArrowAltRight className="text-muted mx-2 inline" /> {order.table.tableNo}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <p
              className={`px-2 py-1 rounded-lg text-sm ${
                isPending ? "text-warn bg-warn/15" : "text-green-500 bg-success/15"
              }`}
            >
              {order.paymentStatus || "Paid"}
            </p>
            {(order.paymentMethod === "Cash" || order.paymentMethod === "Online") && (
              <p className="text-muted text-xs">{order.paymentMethod}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 text-muted text-sm">
        <p>{formatDateAndTime(order.orderDate)}</p>
        <p>{order.items.length} Items</p>
      </div>
      <hr className="w-full mt-3 border-t-1 border-line" />
      <div className="flex items-center justify-between mt-3">
        <h1 className="text-main text-lg font-semibold">Total</h1>
        <p className="text-main text-lg font-semibold">Rs{order.bills.totalWithTax.toFixed(2)}</p>
      </div>

      <div className="flex items-center gap-2 mt-3">
        {isPending && (
          <button
            onClick={() => settleMutation.mutate()}
            disabled={settleMutation.isPending}
            className="flex-1 bg-success text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {settleMutation.isPending ? "..." : "Mark Paid"}
          </button>
        )}
        <button
          onClick={() => setShowEdit(true)}
          className="flex items-center justify-center gap-1.5 flex-1 bg-accent text-white py-2 rounded-lg text-sm font-semibold"
        >
          <FaEdit size={13} /> Edit
        </button>
        <button
          onClick={() => setShowInvoice(true)}
          className="flex-1 bg-info text-white py-2 rounded-lg text-sm font-semibold"
        >
          Receipt
        </button>
        {canDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete order"
            className="shrink-0 bg-danger/15 text-danger hover:bg-danger hover:text-white transition-colors px-3 py-2 rounded-lg"
          >
            <FaTrash size={13} />
          </button>
        )}
      </div>

      {showInvoice && <Invoice orderInfo={order} setShowInvoice={setShowInvoice} />}
      {showEdit && <EditOrderModal order={order} onClose={() => setShowEdit(false)} />}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4" onClick={() => setConfirmDelete(false)}>
          <div className="bg-surface border border-line rounded-lg w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-main text-lg font-semibold mb-2">Delete this order?</h3>
            <p className="text-muted text-sm mb-6">
              Order #{order._id.slice(-6)} · Rs{order.bills.totalWithTax.toFixed(0)}. This permanently removes it and adjusts reports. This can't be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 bg-panel text-main py-2.5 rounded-lg font-semibold border border-line">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-danger text-white py-2.5 rounded-lg font-semibold disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderCard;
