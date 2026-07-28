import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/shared/BottomNav";
import OrderCard from "../components/orders/OrderCard";
import BackButton from "../components/shared/BackButton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getOrders } from "../https/index";
import { enqueueSnackbar } from "notistack";
import { FaPlus, FaSearch } from "react-icons/fa";
import Pagination from "../components/shared/Pagination";

const PER_PAGE = 8;

const Orders = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = "Zair Zabar POS | Orders";
  }, []);

  // Reset to the first page whenever the search filter changes.
  useEffect(() => { setPage(1); }, [search]);

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

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="bg-base min-h-[calc(100dvh-64px)] flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-10 py-4 shrink-0">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-main text-2xl font-bold tracking-wider">Orders</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-panel rounded-lg px-4 py-2 w-full sm:w-[280px]">
            <FaSearch className="text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID or name"
              className="bg-transparent outline-none text-main text-sm w-full"
            />
          </div>
          <button
            onClick={() => navigate("/orders/new")}
            className="flex items-center gap-2 bg-accent text-white font-semibold rounded-lg px-5 py-2"
          >
            <FaPlus /> Create Order
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 sm:px-10 py-4">
          {pageItems.length > 0 ? (
            pageItems.map((order) => <OrderCard key={order._id} order={order} />)
          ) : (
            <p className="col-span-2 text-gray-500">No orders found</p>
          )}
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="pb-6 px-4" />
      </div>

      <BottomNav />
    </div>
  );
};

export default Orders;
