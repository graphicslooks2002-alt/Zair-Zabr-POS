import React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders } from "../../https/index";
import { formatDateAndTime } from "../../utils";

const RecentOrders = () => {
  const { data: resData, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => getOrders(),
    placeholderData: keepPreviousData,
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }

  const orders = resData?.data?.data || [];

  return (
    <div className="container mx-auto bg-[#262626] p-4 rounded-lg">
      <h2 className="text-[#f5f5f5] text-xl font-semibold mb-4">Recent Orders</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[#f5f5f5]">
          <thead className="bg-[#333] text-[#ababab]">
            <tr>
              <th className="p-3">Order ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Type</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Date & Time</th>
              <th className="p-3">Items</th>
              <th className="p-3">Table No</th>
              <th className="p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id} className="border-b border-gray-600 hover:bg-[#333]">
                <td className="p-4">#{order._id.slice(-6)}</td>
                <td className="p-4">{order.customerDetails.name}</td>
                <td className="p-4">{order.orderType || (order.table ? "Dine in" : "Take Away")}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-lg text-xs ${
                      order.paymentStatus === "Pending"
                        ? "text-[#f6b100] bg-[#4a452e]"
                        : "text-green-500 bg-[#2e4a40]"
                    }`}
                  >
                    {order.paymentStatus || "Paid"} · {order.paymentMethod || "—"}
                  </span>
                </td>
                <td className="p-4">{formatDateAndTime(order.orderDate)}</td>
                <td className="p-4">{order.items.length} Items</td>
                <td className="p-4">{order.table ? `Table - ${order.table.tableNo}` : "Takeaway"}</td>
                <td className="p-4">Rs{order.bills.totalWithTax}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentOrders;
