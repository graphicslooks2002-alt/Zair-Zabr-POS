import React, { useState } from "react";
import { FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import OrderList from "./OrderList";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders } from "../../https/index";

const RecentOrders = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: resData, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      return await getOrders();
    },
    placeholderData: keepPreviousData,
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }

  const orders = resData?.data?.data || [];
  const filteredOrders = orders.filter((order) =>
    order.customerDetails?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-8 mt-6">
      <div className="bg-panel w-full h-[450px] rounded-lg">
        <div className="flex justify-between items-center px-6 py-4">
          <h1 className="text-main text-lg font-semibold tracking-wide">
            Recent Orders
          </h1>
          <button
            onClick={() => navigate("/orders")}
            className="text-info text-sm font-semibold"
          >
            View all
          </button>
        </div>

        <div className="flex items-center gap-4 bg-base rounded-[15px] px-6 py-4 mx-6">
          <FaSearch className="text-main" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recent orders"
            className="bg-base outline-none text-main w-full"
          />
        </div>

        {/* Order list */}
        <div className="mt-4 px-6 overflow-y-scroll h-[300px] scrollbar-hide">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => {
              return <OrderList key={order._id} order={order} />;
            })
          ) : (
            <p className="col-span-3 text-gray-500">No orders available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentOrders;
