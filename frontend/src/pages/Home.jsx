import React, { useEffect, useMemo } from "react";
import BottomNav from "../components/shared/BottomNav";
import Greetings from "../components/home/Greetings";
import { BsCashCoin } from "react-icons/bs";
import { GrInProgress } from "react-icons/gr";
import MiniCard from "../components/home/MiniCard";
import RecentOrders from "../components/home/RecentOrders";
import PopularDishes from "../components/home/PopularDishes";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getOrders } from "../https/index";
import { enqueueSnackbar } from "notistack";

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const Home = () => {
  useEffect(() => {
    document.title = "Zair Zabar POS | Home";
  }, []);

  const { data: resData, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => getOrders(),
    placeholderData: keepPreviousData,
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }

  const { totalEarnings, inProgress, earningsTrend, ordersTrend } = useMemo(() => {
    const orders = resData?.data?.data || [];
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let totalEarnings = 0;
    let inProgress = 0;
    let todayEarn = 0;
    let yEarn = 0;
    let todayCount = 0;
    let yCount = 0;

    orders.forEach((o) => {
      const amt = o.bills?.totalWithTax || 0;
      totalEarnings += amt;
      if (o.orderStatus === "In Progress") inProgress++;
      const od = new Date(o.orderDate);
      if (isSameDay(od, today)) {
        todayEarn += amt;
        todayCount++;
      } else if (isSameDay(od, yesterday)) {
        yEarn += amt;
        yCount++;
      }
    });

    const pct = (cur, prev) =>
      prev > 0 ? +(((cur - prev) / prev) * 100).toFixed(1) : cur > 0 ? 100 : 0;

    return {
      totalEarnings,
      inProgress,
      earningsTrend: pct(todayEarn, yEarn),
      ordersTrend: pct(todayCount, yCount),
    };
  }, [resData]);

  return (
    <div className="bg-[#1f1f1f] h-[calc(100vh-64px)] flex">
      <div className="flex-[3] overflow-y-auto scrollbar-hide pb-20">
        <Greetings />
        <div className="flex items-center w-full gap-3 px-8 mt-8">
          <MiniCard title="Total Earnings" icon={<BsCashCoin />} number={totalEarnings.toFixed(0)} footerNum={earningsTrend} />
          <MiniCard title="In Progress" icon={<GrInProgress />} number={inProgress} footerNum={ordersTrend} />
        </div>
        <RecentOrders />
      </div>
      <div className="flex-[2] overflow-y-auto scrollbar-hide pb-20">
        <PopularDishes />
      </div>
      <BottomNav />
    </div>
  );
};

export default Home;
