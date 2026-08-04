import React, { useEffect } from "react";
import BottomNav from "../components/shared/BottomNav";
import BackButton from "../components/shared/BackButton";
import { MdBuild } from "react-icons/md";

// Management hub (Admin / Superadmin). Placeholder — features will be added here
// (e.g. expenses, inventory, audit log, higher-management views).
const Manage = () => {
  useEffect(() => { document.title = "Zair Zabar POS | Manage POS"; }, []);

  return (
    <div className="bg-base min-h-[calc(100dvh-64px)] flex flex-col">
      <div className="flex items-center gap-4 px-4 sm:px-10 py-4 shrink-0">
        <BackButton />
        <h1 className="text-main text-2xl font-bold tracking-wider">Manage POS</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 sm:px-10 pb-24">
        <div className="max-w-md mx-auto text-center mt-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-panel border border-line text-accent mb-4">
            <MdBuild className="text-3xl" />
          </div>
          <h2 className="text-main text-xl font-semibold mb-1">Management tools coming here</h2>
          <p className="text-muted text-sm">
            This section will hold higher-management features — expenses, inventory,
            audit log and more. It's wired up and ready to extend.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Manage;
