import React, { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { FaPlus, FaTimes } from "react-icons/fa";
import { getUsers, register } from "../../https/index";

const ROLES = ["Admin", "Cashier", "Waiter"];
const empty = { name: "", email: "", phone: "", password: "", role: "Waiter" };

const ManageStaff = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: resData, isError } = useQuery({
    queryKey: ["users"],
    queryFn: async () => getUsers(),
    placeholderData: keepPreviousData,
  });
  if (isError) enqueueSnackbar("Failed to load staff!", { variant: "error" });

  const addMutation = useMutation({
    mutationFn: (data) => register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      enqueueSnackbar("Staff added!", { variant: "success" });
      setForm(empty);
      setShowModal(false);
    },
    onError: (err) =>
      enqueueSnackbar(err?.response?.data?.message || "Failed to add staff!", { variant: "error" }),
  });

  const submit = (e) => {
    e.preventDefault();
    if (addMutation.isPending) return;
    addMutation.mutate(form);
  };

  const rows = resData?.data?.data || [];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="container mx-auto py-2 px-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-[#f5f5f5] text-xl">Manage Staff</h2>
          <p className="text-sm text-[#ababab]">Add and view employee accounts.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#e85d04] text-white font-semibold rounded-lg px-5 py-2.5"
        >
          <FaPlus /> Add Staff
        </button>
      </div>

      <div className="bg-[#1a1a1a] rounded-lg overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[#ababab] border-b border-[#333]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="text-[#f5f5f5]">
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No staff yet.</td></tr>
            ) : (
              rows.map((u) => (
                <tr key={u._id} className="border-b border-[#262626]">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs ${
                      u.role === "Admin" ? "bg-[#3a2e4a] text-[#c79bff]" : u.role === "Cashier" ? "bg-[#2e3a4a] text-[#9bc7ff]" : "bg-[#2e4a40] text-green-400"
                    }`}>{u.role}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
          <div className="bg-[#262626] rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#f5f5f5] text-lg font-semibold">Add Staff</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><FaTimes /></button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <input value={form.name} onChange={set("name")} placeholder="Full name" required
                className="w-full bg-[#1f1f1f] text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
              <input type="email" value={form.email} onChange={set("email")} placeholder="Email" required
                className="w-full bg-[#1f1f1f] text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
              <input value={form.phone} onChange={set("phone")} placeholder="Phone (e.g. 03001234567)" required
                className="w-full bg-[#1f1f1f] text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
              <input type="password" value={form.password} onChange={set("password")} placeholder="Password (min 6 chars)" required
                className="w-full bg-[#1f1f1f] text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
              <div>
                <label className="block text-[#ababab] text-xs mb-1">Role</label>
                <div className="flex gap-2">
                  {ROLES.map((r) => (
                    <button type="button" key={r} onClick={() => setForm((f) => ({ ...f, role: r }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold ${form.role === r ? "bg-[#e85d04] text-white" : "bg-[#1f1f1f] text-[#ababab]"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={addMutation.isPending}
                className="w-full bg-[#e85d04] text-white py-3 rounded-lg font-semibold disabled:opacity-50">
                {addMutation.isPending ? "Adding..." : "Add Staff"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageStaff;
