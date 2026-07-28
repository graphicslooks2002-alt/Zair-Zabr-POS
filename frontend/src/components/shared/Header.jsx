import React from "react";
import { FaUserCircle, FaBell, FaMoon, FaSun } from "react-icons/fa";
import logo from "../../assets/images/logo.png";
import { useDispatch, useSelector } from "react-redux";
import { IoLogOut } from "react-icons/io5";
import { useMutation } from "@tanstack/react-query";
import { logout } from "../../https";
import { removeUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { MdDashboard } from "react-icons/md";
import { useTheme } from "../../hooks/useTheme";

const Header = () => {
  const userData = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const { theme, toggle } = useTheme();

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: (data) => {
      console.log(data);
      dispatch(removeUser());
      navigate("/auth");
    },
    onError: (error) => {
      console.log(error);
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="sticky top-0 z-30 flex justify-between items-center gap-2 py-3 px-3 sm:px-6 bg-surface border-b border-line shadow-sm">
      {/* LOGO — on a fixed dark chip so the light logo stays visible in both themes */}
      <div onClick={() => navigate(userData.role === "Admin" || userData.role === "Superadmin" ? "/" : "/orders")} className="flex items-center gap-2 cursor-pointer shrink-0">
        <span className="bg-[#1f1f1f] rounded-lg p-1 flex items-center justify-center shrink-0">
          <img src={logo} className="h-8 w-8" alt="Zair Zabar logo" />
        </span>
        <div className="leading-tight">
          <h1 className="text-lg font-extrabold text-accent tracking-wide">Zair Zabar</h1>
          <p className="hidden sm:block text-[10px] text-faint font-medium -mt-0.5 tracking-wider uppercase">Point of Sale</p>
        </div>
      </div>


      {/* ACTIONS */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={theme === "light" ? "Switch to dark" : "Switch to light"}
          className="bg-base hover:bg-hover border border-line rounded-xl p-2.5 text-main transition-colors"
        >
          {theme === "light" ? <FaMoon className="text-lg" /> : <FaSun className="text-lg text-warn" />}
        </button>

        {(userData.role === "Admin" || userData.role === "Superadmin") && (
          <button onClick={() => navigate("/dashboard")} title="Dashboard" className="bg-base hover:bg-hover border border-line rounded-xl p-2.5 text-main transition-colors">
            <MdDashboard className="text-lg sm:text-xl" />
          </button>
        )}
        <button title="Notifications" className="bg-base hover:bg-hover border border-line rounded-xl p-2.5 text-main transition-colors">
          <FaBell className="text-lg sm:text-xl" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3 sm:pl-2 sm:ml-1 sm:border-l sm:border-line">
          <FaUserCircle className="text-main text-3xl sm:text-4xl shrink-0" />
          <div className="hidden sm:flex flex-col items-start">
            <h1 className="text-sm text-main font-semibold tracking-wide leading-tight">
              {userData.name || "TEST USER"}
            </h1>
            <p className="text-xs text-muted font-medium">
              {userData.role || "Role"}
            </p>
          </div>
          <button onClick={() => setShowLogoutConfirm(true)} title="Log out" className="text-muted hover:text-danger transition-colors shrink-0">
            <IoLogOut size={26} />
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
          <div className="bg-surface rounded-lg w-full max-w-sm p-6 text-center">
            <h3 className="text-main text-lg font-semibold mb-2">Log out?</h3>
            <p className="text-muted text-sm mb-6">Are you sure you want to log out of Zair Zabar POS?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-base text-main py-2.5 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}
                disabled={logoutMutation.isPending}
                className="flex-1 bg-danger text-white py-2.5 rounded-lg font-semibold disabled:opacity-50"
              >
                {logoutMutation.isPending ? "Logging out..." : "Yes, log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
