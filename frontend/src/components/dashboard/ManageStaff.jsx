import React, { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { FaPlus, FaTimes, FaEdit, FaTrash, FaPaperPlane } from "react-icons/fa";
import { getUsers, register, updateUser, deleteUser, resendVerification } from "../../https/index";

const ROLES = ["Admin", "Cashier", "Waiter"];
const empty = { name: "", email: "", phone: "", password: "", role: "Waiter" };

const ManageStaff = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = add mode
  const [form, setForm] = useState(empty);

  const { data: resData, isError, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => getUsers(),
    placeholderData: keepPreviousData,
    retry: false,
  });

  useEffect(() => {
    if (isError) {
      const msg =
        error?.response?.status === 403
          ? "Session outdated — please log out and log in again."
          : error?.response?.data?.message || "Failed to load staff!";
      enqueueSnackbar(msg, { variant: "error" });
    }
  }, [isError, error]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });
  const onErr = (err, fallback) =>
    enqueueSnackbar(err?.response?.data?.message || fallback, { variant: "error" });

  const addMutation = useMutation({
    mutationFn: (data) => register(data),
    onSuccess: (res) => {
      refresh();
      enqueueSnackbar(res?.data?.message || "Staff added!", { variant: "success", autoHideDuration: 6000 });
      closeModal();
    },
    onError: (err) => onErr(err, "Failed to add staff!"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => { refresh(); enqueueSnackbar("Staff updated!", { variant: "success" }); closeModal(); },
    onError: (err) => onErr(err, "Failed to update staff!"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteUser(id),
    onSuccess: () => { refresh(); enqueueSnackbar("Staff deleted.", { variant: "success" }); },
    onError: (err) => onErr(err, "Failed to delete staff!"),
  });
  const resendMutation = useMutation({
    mutationFn: (id) => resendVerification(id),
    onSuccess: (res) => enqueueSnackbar(res?.data?.message || "Verification email resent.", { variant: "success", autoHideDuration: 6000 }),
    onError: (err) => onErr(err, "Failed to resend verification."),
  });

  const openAdd = () => { setEditingId(null); setForm(empty); setShowModal(true); };
  const openEdit = (u) => { setEditingId(u._id); setForm({ name: u.name, email: u.email, phone: u.phone, password: "", role: u.role }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(empty); };

  const submit = (e) => {
    e.preventDefault();
    if (addMutation.isPending || updateMutation.isPending) return;

    const phoneOk = /^0\d{10}$/.test(form.phone.replace(/[\s-]/g, ""));
    if (!form.name.trim()) return enqueueSnackbar("Name is required.", { variant: "warning" });
    if (!phoneOk) return enqueueSnackbar("Phone must be 11 digits, e.g. 03001234567.", { variant: "warning" });

    if (editingId) {
      // email is not editable; password optional (blank = keep current)
      const data = { name: form.name.trim(), phone: form.phone, role: form.role };
      if (form.password) {
        if (form.password.length < 6) return enqueueSnackbar("Password must be at least 6 characters.", { variant: "warning" });
        data.password = form.password;
      }
      updateMutation.mutate({ id: editingId, data });
    } else {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim());
      if (!emailOk) return enqueueSnackbar("Please enter a valid email address.", { variant: "warning" });
      if (form.password.length < 6) return enqueueSnackbar("Password must be at least 6 characters.", { variant: "warning" });
      addMutation.mutate({ ...form, email: form.email.trim().toLowerCase() });
    }
  };

  const rows = resData?.data?.data || [];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const saving = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="container mx-auto py-2 px-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-[#f5f5f5] text-xl">Manage Staff</h2>
          <p className="text-sm text-[#ababab]">Add, edit, or remove employee accounts.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-[#e85d04] text-white font-semibold rounded-lg px-5 py-2.5">
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
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[#f5f5f5]">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No staff yet.</td></tr>
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
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs ${
                      u.status === "Active" ? "bg-[#2e4a40] text-green-400" : u.status === "Pending Approval" ? "bg-[#4a452e] text-[#f6b100]" : "bg-[#3a3a3a] text-[#ababab]"
                    }`}>{u.status || "Active"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-3 justify-end">
                      {u.status !== "Active" && (
                        <button onClick={() => resendMutation.mutate(u._id)} disabled={resendMutation.isPending} className="text-[#f6b100]" title="Resend verification email"><FaPaperPlane /></button>
                      )}
                      <button onClick={() => openEdit(u)} className="text-[#025cca]" title="Edit"><FaEdit /></button>
                      <button onClick={() => { if (window.confirm(`Delete ${u.name}?`)) deleteMutation.mutate(u._id); }} className="text-red-500" title="Delete"><FaTrash /></button>
                    </div>
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
              <h3 className="text-[#f5f5f5] text-lg font-semibold">{editingId ? "Edit Staff" : "Add Staff"}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-white"><FaTimes /></button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <input value={form.name} onChange={set("name")} placeholder="Full name" required
                className="w-full bg-[#1f1f1f] text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
              <input type="email" value={form.email} onChange={set("email")} placeholder="Email"
                required={!editingId} disabled={!!editingId}
                className="w-full bg-[#1f1f1f] text-white rounded-lg px-3 py-2.5 text-sm outline-none disabled:opacity-50" />
              <input value={form.phone} onChange={set("phone")} placeholder="Phone (e.g. 03001234567)" required
                inputMode="numeric" maxLength={11} pattern="0[0-9]{10}" title="11 digits starting with 0"
                className="w-full bg-[#1f1f1f] text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
              <input type="password" value={form.password} onChange={set("password")}
                placeholder={editingId ? "New password (leave blank to keep)" : "Password (min 6 chars)"}
                required={!editingId} minLength={6}
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
              <button type="submit" disabled={saving}
                className="w-full bg-[#e85d04] text-white py-3 rounded-lg font-semibold disabled:opacity-50">
                {saving ? "Saving..." : editingId ? "Save Changes" : "Add Staff"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageStaff;
