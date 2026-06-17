import React, { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { popularDishes } from "../../constants";
import { getOrders } from "../../https/index";

const PopularDishes = () => {
  const { data: resData } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => getOrders(),
    placeholderData: keepPreviousData,
  });

  const dishes = useMemo(() => {
    const orders = resData?.data?.data || [];
    const counts = {};
    orders.forEach((o) => {
      (o.items || []).forEach((it) => {
        if (!it?.name) return;
        counts[it.name] = (counts[it.name] || 0) + (it.quantity || 1);
      });
    });
    const computed = Object.entries(counts)
      .map(([name, numberOfOrders], i) => ({ id: i + 1, name, numberOfOrders }))
      .sort((a, b) => b.numberOfOrders - a.numberOfOrders)
      .slice(0, 10);
    return computed.length ? computed : popularDishes;
  }, [resData]);

  return (
    <div className="mt-6 pr-6">
      <div className="bg-[#1a1a1a] w-full rounded-lg">
        <div className="flex justify-between items-center px-6 py-4">
          <h1 className="text-[#f5f5f5] text-lg font-semibold tracking-wide">
            Popular Dishes
          </h1>
          <a href="" className="text-[#025cca] text-sm font-semibold">
            View all
          </a>
        </div>

        <div className="overflow-y-scroll h-[680px] scrollbar-hide">
          {dishes.map((dish) => {
            return (
              <div
                key={dish.id}
                className="flex items-center gap-4 bg-[#1f1f1f] rounded-[15px] px-6 py-4 mt-4 mx-6"
              >
                <h1 className="text-[#f5f5f5] font-bold text-xl mr-4">{dish.id < 10 ? `0${dish.id}` : dish.id}</h1>
                <div className="w-[50px] h-[50px] rounded-full bg-[#e85d04] flex items-center justify-center text-white font-bold text-lg">
                  {dish.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-[#f5f5f5] font-semibold tracking-wide">{dish.name}</h1>
                  <p className="text-[#f5f5f5] text-sm font-semibold mt-1">
                    <span className="text-[#ababab]">Orders: </span>
                    {dish.numberOfOrders}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PopularDishes;
