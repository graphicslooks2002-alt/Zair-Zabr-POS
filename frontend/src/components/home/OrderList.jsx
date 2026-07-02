import React from "react";
import { FaLongArrowAltRight } from "react-icons/fa";
import { getAvatarName } from "../../utils/index";

const OrderList = ({ order }) => {
  const isPending = order.paymentStatus === "Pending";
  return (
    <div className="flex items-center gap-4 mb-3">
      <button className="bg-[#e85d04] p-3 text-xl font-bold rounded-lg shrink-0">
        {getAvatarName(order.customerDetails.name)}
      </button>

      {/* name + items — flexible, truncates */}
      <div className="min-w-0 flex-1">
        <h1 className="text-[#f5f5f5] text-lg font-semibold tracking-wide truncate">
          {order.customerDetails.name}
        </h1>
        <p className="text-[#ababab] text-sm">{order.items.length} Items</p>
      </div>

      {/* order type — fixed-width column so it always lines up */}
      <span className="w-28 shrink-0 text-center text-[#e85d04] font-semibold border border-[#e85d04] rounded-lg py-1 text-sm">
        {order.table ? (
          <>Table <FaLongArrowAltRight className="text-[#ababab] inline" /> {order.table.tableNo}</>
        ) : (
          order.orderType || "Takeaway"
        )}
      </span>

      {/* payment status — fixed column */}
      <span
        className={`w-24 shrink-0 text-center text-xs px-2 py-1 rounded-lg ${
          isPending ? "text-[#f6b100] bg-[#4a452e]" : "text-green-500 bg-[#2e4a40]"
        }`}
      >
        {order.paymentStatus || "Paid"}
      </span>
    </div>
  );
};

export default OrderList;
