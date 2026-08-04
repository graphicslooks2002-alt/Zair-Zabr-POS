import React from "react";
import { FaHome } from "react-icons/fa";
import { MdOutlineReorder, MdTableBar, MdTune } from "react-icons/md";
import { CiCircleMore } from "react-icons/ci";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useSelector((state) => state.user);
  const isAdmin = role === "Admin" || role === "Superadmin";

  const isActive = (path) => location.pathname === path;
  const cls = (path) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 max-w-[110px] py-1 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors ${
      isActive(path) ? "text-accent bg-accent/10" : "text-muted hover:text-main"
    }`;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line p-1.5 h-16 flex justify-around items-stretch gap-1 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.15)]">
      {/* Home (statistics) — Admin only */}
      {isAdmin && (
        <button onClick={() => navigate("/")} className={cls("/")}>
          <FaHome size={19} /> <span>Home</span>
        </button>
      )}
      <button onClick={() => navigate("/orders")} className={cls("/orders")}>
        <MdOutlineReorder size={20} /> <span>Orders</span>
      </button>
      <button onClick={() => navigate("/tables")} className={cls("/tables")}>
        <MdTableBar size={20} /> <span>Tables</span>
      </button>
      {/* Manage POS — Admin / Superadmin only */}
      {isAdmin && (
        <button onClick={() => navigate("/manage")} className={cls("/manage")}>
          <MdTune size={20} /> <span>Manage POS</span>
        </button>
      )}
      {/* Dashboard / More (statistics) — Admin only */}
      {isAdmin && (
        <button onClick={() => navigate("/dashboard")} className={cls("/dashboard")}>
          <CiCircleMore size={22} /> <span>More</span>
        </button>
      )}
    </div>
  );
};

export default BottomNav;
