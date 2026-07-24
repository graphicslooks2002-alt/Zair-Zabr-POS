import React from "react";
import { FaLongArrowAltRight } from "react-icons/fa";
import { getAvatarName } from "../../utils/index";

const OrderList = ({ order }) => {
  const isPending = order.paymentStatus === "Pending";
  return (
    <div className="flex items-center gap-3 mb-3">
      <button className="bg-accent text-white p-2.5 sm:p-3 text-lg sm:text-xl font-bold rounded-lg shrink-0">
        {getAvatarName(order.customerDetails.name)}
      </button>

      {/* name + items — flexible, truncates */}
      <div className="min-w-0 flex-1">
        <h1 className="text-main text-base sm:text-lg font-semibold tracking-wide truncate">
          {order.customerDetails.name}
        </h1>
        <p className="text-muted text-xs sm:text-sm whitespace-nowrap">{order.items.length} Items</p>
      </div>

      {/* order type + payment — size to content, never crush the name */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-center text-accent font-semibold border border-accent rounded-lg px-2.5 py-1 text-xs sm:text-sm whitespace-nowrap">
          {order.table ? (
            <>Table <FaLongArrowAltRight className="text-muted inline" /> {order.table.tableNo}</>
          ) : (
            order.orderType || "Takeaway"
          )}
        </span>

        <span
          className={`text-center text-xs px-2.5 py-1 rounded-lg whitespace-nowrap ${
            isPending ? "text-warn bg-[#4a452e]" : "text-green-500 bg-[#2e4a40]"
          }`}
        >
          {order.paymentStatus || "Paid"}
        </span>
      </div>
    </div>
  );
};

export default OrderList;
