import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query"
import { login } from "../../https/index"
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
 
const Login = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const[formData, setFormData] = useState({
      email: "",
      password: "",
    });
    const [showPassword, setShowPassword] = useState(false);
  
    const handleChange = (e) => {
      setFormData({...formData, [e.target.name]: e.target.value});
    }

  
    const handleSubmit = (e) => {
      e.preventDefault();
      if (loginMutation.isPending) return; // ignore repeat clicks while in flight
      loginMutation.mutate(formData);
    }

    const loginMutation = useMutation({
      mutationFn: (reqData) => login(reqData),
      onSuccess: (res) => {
          const { data } = res;
          console.log(data);
          const { _id, name, email, phone, role } = data.data;
          dispatch(setUser({ _id, name, email, phone, role }));
          navigate(role === "Admin" || role === "Superadmin" ? "/" : "/orders");
      },
      onError: (error) => {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Login failed. Check your connection / backend URL.";
        enqueueSnackbar(message, { variant: "error" });
      }
    })

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-muted mb-1.5 text-sm font-medium">
            Email
          </label>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-base border border-line focus-within:border-accent transition-colors">
            <FaEnvelope className="text-muted shrink-0" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="bg-transparent flex-1 min-w-0 text-main placeholder:text-faint focus:outline-none"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-muted mb-1.5 text-sm font-medium">
            Password
          </label>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-base border border-line focus-within:border-accent transition-colors">
            <FaLock className="text-muted shrink-0" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              className="bg-transparent flex-1 min-w-0 text-main placeholder:text-faint focus:outline-none"
              required
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)}
              className="text-muted hover:text-main shrink-0" tabIndex={-1}
              title={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded-xl mt-2 py-3 text-lg bg-accent hover:brightness-110 text-white font-bold transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loginMutation.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
};

export default Login;
