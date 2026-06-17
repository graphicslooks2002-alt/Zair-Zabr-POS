import React, { useState, useEffect } from "react";
import BottomNav from "../components/shared/BottomNav";
import OrderCard from "../components/orders/OrderCard";
import BackButton from "../components/shared/BackButton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getOrders } from "../https/index";
import { enqueueSnackbar } from "notistack";

const Orders = () => {
  const [status, setStatus] = useState("all");

  useEffect(() => {
    document.title = "Zair Zabar POS | Orders";
  }, []);

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

  return (
    <div className="bg-[#1f1f1f] h-[calc(100vh-64px)] flex flex-col">
      <div className="flex items-center justify-between px-10 py-4 shrink-0">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-[#f5f5f5] text-2xl font-bold tracking-wider">Orders</h1>
        </div>
        <div className="flex items-center gap-4">
          {["all", "progress", "ready", "completed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-[#ababab] text-lg rounded-lg px-5 py-2 font-semibold ${
                status === s ? "bg-[#383838]" : ""
              }`}
            >
              {s === "all" ? "All" : s === "progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        <div className="grid grid-cols-2 gap-4 px-10 py-4">
          {resData?.data.data.length > 0 ? (
            resData.data.data
              .filter((order) => {
                if (status === "all") return true;
                if (status === "progress") return order.orderStatus === "In Progress";
                if (status === "ready") return order.orderStatus === "Ready";
                if (status === "completed") return order.orderStatus === "Completed";
                return true;
              })
              .map((order) => (
                <OrderCard key={order._id} order={order} />
              ))
          ) : (
            <p className="col-span-2 text-gray-500">No orders available</p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Orders;
