import React, { useState, useEffect } from "react";
import { MdTableBar, MdCategory } from "react-icons/md";
import { BiSolidDish } from "react-icons/bi";
import Metrics from "../components/dashboard/Metrics";
import RecentOrders from "../components/dashboard/RecentOrders";
import PendingPayments from "../components/dashboard/PendingPayments";
import ManageStaff from "../components/dashboard/ManageStaff";
import MenuManagement from "../components/dashboard/MenuManagement";
import Modal from "../components/dashboard/Modal";
import AddCategoryModal from "../components/dashboard/AddCategoryModal";
import AddItemModal from "../components/dashboard/AddItemModal";
import BottomNav from "../components/shared/BottomNav";

const buttons = [
  { label: "Add Table", icon: <MdTableBar />, action: "table" },
  { label: "Add Category", icon: <MdCategory />, action: "category" },
  { label: "Add Item", icon: <BiSolidDish />, action: "item" },
];

const tabs = ["Metrics", "Orders", "Payments", "Staff", "Menu"];

const Dashboard = () => {
  useEffect(() => {
    document.title = "Zair Zabar POS | Dashboard";
  }, []);

  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [activeTab, setActiveTab] = useState("Metrics");

  const handleOpenModal = (action) => {
    if (action === "table") setIsTableModalOpen(true);
    if (action === "category") setShowCategoryModal(true);
    if (action === "item") setShowItemModal(true);
  };

  return (
    <div className="bg-base min-h-[calc(100vh-64px)] flex flex-col overflow-x-hidden">
      <div className="container mx-auto flex flex-col lg:flex-row lg:flex-wrap lg:items-center lg:justify-between gap-3 py-3 sm:py-6 px-3 sm:px-6 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-3 px-3 lg:mx-0 lg:px-0">
          {buttons.map(({ label, icon, action }) => (
            <button
              key={label}
              onClick={() => handleOpenModal(action)}
              className="bg-panel hover:bg-surface px-3 py-2 sm:px-6 sm:py-3 rounded-lg text-main font-semibold text-xs sm:text-sm flex items-center gap-2 shrink-0 whitespace-nowrap"
            >
              {label} {icon}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-3 px-3 lg:mx-0 lg:px-0">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`px-3 py-2 sm:px-6 sm:py-3 rounded-lg text-main font-semibold text-xs sm:text-sm shrink-0 whitespace-nowrap ${
                activeTab === tab
                  ? "bg-surface"
                  : "bg-panel hover:bg-surface"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20 px-3 sm:px-6">
        {activeTab === "Metrics" && <Metrics />}
        {activeTab === "Orders" && <RecentOrders />}
        {activeTab === "Payments" && <PendingPayments />}
        {activeTab === "Staff" && <ManageStaff />}
        {activeTab === "Menu" && <MenuManagement />}
      </div>

      {isTableModalOpen && (
        <Modal setIsTableModalOpen={setIsTableModalOpen} />
      )}
      {showCategoryModal && <AddCategoryModal onClose={() => setShowCategoryModal(false)} />}
      {showItemModal && <AddItemModal onClose={() => setShowItemModal(false)} />}

      <BottomNav />
    </div>
  );
};

export default Dashboard;
