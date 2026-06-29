import React, { useState } from "react";
import { register } from "../../https";
import { useMutation } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";

const Register = ({setIsRegister}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelection = (selectedRole) => {
    setFormData({ ...formData, role: selectedRole });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (registerMutation.isPending) return; // ignore repeat clicks while in flight

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email.trim());
    const phoneOk = /^0\d{10}$/.test(String(formData.phone).replace(/[\s-]/g, ""));
    if (!emailOk) return enqueueSnackbar("Please enter a valid email address.", { variant: "warning" });
    if (!phoneOk) return enqueueSnackbar("Phone must be 11 digits, e.g. 03001234567.", { variant: "warning" });
    if (formData.password.length < 6) return enqueueSnackbar("Password must be at least 6 characters.", { variant: "warning" });
    if (!formData.role) return enqueueSnackbar("Please choose a role.", { variant: "warning" });

    registerMutation.mutate({ ...formData, email: formData.email.trim().toLowerCase() });
  };

  const registerMutation = useMutation({
    mutationFn: (reqData) => register(reqData),
    onSuccess: (res) => {
      const { data } = res;
      enqueueSnackbar(data.message, { variant: "success" });
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "",
      });
      
      setTimeout(() => {
        setIsRegister(false);
      }, 1500);
    },
    onError: (error) => {
      const { response } = error;
      const message = response.data.message;
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label className="block text-[#ababab] mb-2 text-sm font-medium">
            Employee Name
          </label>
          <div className="flex item-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter employee name"
              className="bg-transparent flex-1 text-white focus:outline-none"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
            Employee Email
          </label>
          <div className="flex item-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter employee email"
              className="bg-transparent flex-1 text-white focus:outline-none"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
            Employee Phone
          </label>
          <div className="flex item-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="03001234567"
              inputMode="numeric"
              maxLength={11}
              pattern="0[0-9]{10}"
              title="11 digits starting with 0"
              className="bg-transparent flex-1 text-white focus:outline-none"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
            Password
          </label>
          <div className="flex item-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              className="bg-transparent flex-1 text-white focus:outline-none"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
            Choose your role
          </label>

          <div className="flex item-center gap-3 mt-4">
            {["Waiter", "Cashier", "Admin"].map((role) => {
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleSelection(role)}
                  className={`bg-[#1f1f1f] px-4 py-3 w-full rounded-lg text-[#ababab] ${
                    formData.role === role ? "bg-indigo-700" : ""
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="w-full rounded-lg mt-6 py-3 text-lg bg-[#e85d04] text-white font-bold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {registerMutation.isPending ? "Signing up..." : "Sign up"}
        </button>
      </form>
    </div>
  );
};

export default Register;
