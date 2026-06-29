import React from "react";
import { FaHome } from "react-icons/fa";
import { MdOutlineReorder, MdTableBar } from "react-icons/md";
import { CiCircleMore } from "react-icons/ci";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useSelector((state) => state.user);
  const isAdmin = role === "Admin";

  const isActive = (path) => location.pathname === path;
  const cls = (path) =>
    `flex items-center justify-center font-bold ${
      isActive(path) ? "text-[#f5f5f5] bg-[#343434]" : "text-[#ababab]"
    } w-[300px] rounded-[20px]`;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#262626] p-2 h-16 flex justify-around z-40">
      {/* Home (statistics) — Admin only */}
      {isAdmin && (
        <button onClick={() => navigate("/")} className={cls("/")}>
          <FaHome className="inline mr-2" size={20} /> <p>Home</p>
        </button>
      )}
      <button onClick={() => navigate("/orders")} className={cls("/orders")}>
        <MdOutlineReorder className="inline mr-2" size={20} /> <p>Orders</p>
      </button>
      <button onClick={() => navigate("/tables")} className={cls("/tables")}>
        <MdTableBar className="inline mr-2" size={20} /> <p>Tables</p>
      </button>
      {/* Dashboard / More (statistics) — Admin only */}
      {isAdmin && (
        <button onClick={() => navigate("/dashboard")} className={cls("/dashboard")}>
          <CiCircleMore className="inline mr-2" size={20} /> <p>More</p>
        </button>
      )}
    </div>
  );
};

export default BottomNav;
