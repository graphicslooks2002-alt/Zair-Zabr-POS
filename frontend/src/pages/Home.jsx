import React, { useEffect } from "react";
import BottomNav from "../components/shared/BottomNav";
import Greetings from "../components/home/Greetings";
import { BsCashCoin } from "react-icons/bs";
import MiniCard from "../components/home/MiniCard";
import RecentOrders from "../components/home/RecentOrders";
import PopularDishes from "../components/home/PopularDishes";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getSessionSummary } from "../https/index";

const Home = () => {
  useEffect(() => {
    document.title = "Zair Zabar POS | Home";
  }, []);

  const { data: sessionRes } = useQuery({
    queryKey: ["sessionSummary"],
    queryFn: async () => getSessionSummary(),
    placeholderData: keepPreviousData,
  });

  const stats = sessionRes?.data?.data;
  const sessionRevenue = stats?.totalRevenue || 0;
  const sessionOrders = stats?.totalOrders || 0;

  return (
    <div className="bg-[#1f1f1f] h-[calc(100vh-64px)] overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row">
      <div className="w-full lg:flex-[3] lg:overflow-y-auto scrollbar-hide pb-4 lg:pb-20">
        <Greetings />
        <div className="w-full px-8 mt-8">
          <div className="max-w-md">
            <MiniCard
              title="Total Earnings"
              icon={<BsCashCoin />}
              number={Number(sessionRevenue).toFixed(0)}
              subtitle={`Current session (12 PM–4 AM) · ${sessionOrders} order${sessionOrders === 1 ? "" : "s"}`}
            />
          </div>
        </div>
        <RecentOrders />
      </div>
      <div className="w-full lg:flex-[2] lg:overflow-y-auto scrollbar-hide pb-20">
        <PopularDishes />
      </div>
      <BottomNav />
    </div>
  );
};

export default Home;
