import React, { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders } from "../../https/index";
import { formatDateAndTime } from "../../utils";
import Pagination from "../shared/Pagination";

const PER_PAGE = 10;

const RecentOrders = () => {
  const [page, setPage] = useState(1);
  const { data: resData, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => getOrders(),
    placeholderData: keepPreviousData,
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }

  const orders = resData?.data?.data || [];
  const totalPages = Math.ceil(orders.length / PER_PAGE);
  const pageItems = orders.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="container mx-auto bg-surface p-4 rounded-lg">
      <h2 className="text-main text-xl font-semibold mb-4">Recent Orders</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-main">
          <thead className="bg-elevated text-muted">
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
            {pageItems.map((order) => (
              <tr key={order._id} className="border-b border-line hover:bg-elevated">
                <td className="p-4">#{order._id.slice(-6)}</td>
                <td className="p-4">{order.customerDetails.name}</td>
                <td className="p-4">{order.orderType || (order.table ? "Dine in" : "Take Away")}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-lg text-xs ${
                      order.paymentStatus === "Pending"
                        ? "text-warn bg-warn/15"
                        : "text-green-500 bg-success/15"
                    }`}
                  >
                    {order.paymentStatus || "Paid"}
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
      <Pagination page={page} totalPages={totalPages} onChange={setPage} className="mt-4" />
    </div>
  );
};

export default RecentOrders;
