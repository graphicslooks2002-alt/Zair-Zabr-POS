import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/shared/BottomNav";
import OrderCard from "../components/orders/OrderCard";
import BackButton from "../components/shared/BackButton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getOrders } from "../https/index";
import { enqueueSnackbar } from "notistack";
import { FaPlus, FaSearch } from "react-icons/fa";

const Orders = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Zair Zabar POS | Orders";
  }, []);

  const { data: resData, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => getOrders(),
    placeholderData: keepPreviousData,
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }

  const orders = resData?.data?.data || [];
  const q = search.trim().toLowerCase();
  const filtered = q
    ? orders.filter(
        (o) =>
          o._id?.toLowerCase().includes(q) ||
          o.customerDetails?.name?.toLowerCase().includes(q)
      )
    : orders;

  return (
    <div className="bg-[#1f1f1f] h-[calc(100vh-64px)] flex flex-col">
      <div className="flex items-center justify-between px-10 py-4 shrink-0">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-[#f5f5f5] text-2xl font-bold tracking-wider">Orders</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-4 py-2 w-[280px]">
            <FaSearch className="text-[#ababab]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID or name"
              className="bg-transparent outline-none text-[#f5f5f5] text-sm w-full"
            />
          </div>
          <button
            onClick={() => navigate("/orders/new")}
            className="flex items-center gap-2 bg-[#e85d04] text-white font-semibold rounded-lg px-5 py-2"
          >
            <FaPlus /> Create Order
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        <div className="grid grid-cols-2 gap-4 px-10 py-4">
          {filtered.length > 0 ? (
            filtered.map((order) => <OrderCard key={order._id} order={order} />)
          ) : (
            <p className="col-span-2 text-gray-500">No orders found</p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Orders;
