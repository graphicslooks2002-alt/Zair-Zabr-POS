import React, { useState, useEffect } from "react";
import BottomNav from "../components/shared/BottomNav";
import BackButton from "../components/shared/BackButton";
import TableCard from "../components/tables/TableCard";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getTables } from "../https";
import { enqueueSnackbar } from "notistack";

const Tables = () => {
  const [status, setStatus] = useState("all");

  useEffect(() => {
    document.title = "Zair Zabar POS | Tables";
  }, []);

  const { data: resData, isError } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      return await getTables();
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
          <h1 className="text-[#f5f5f5] text-2xl font-bold tracking-wider">Tables</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setStatus("all")}
            className={`text-[#ababab] text-lg rounded-lg px-5 py-2 font-semibold ${
              status === "all" ? "bg-[#383838]" : ""
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatus("booked")}
            className={`text-[#ababab] text-lg rounded-lg px-5 py-2 font-semibold ${
              status === "booked" ? "bg-[#383838]" : ""
            }`}
          >
            Booked
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        <div className="grid grid-cols-5 gap-3 px-16 py-4">
          {resData?.data.data
            .filter((table) => (status === "booked" ? table.status === "Booked" : true))
            .map((table) => (
              <TableCard
                key={table._id}
                id={table._id}
                name={table.tableNo}
                status={table.status}
                initials={table?.currentOrder?.customerDetails?.name}
                seats={table.seats}
              />
            ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Tables;
