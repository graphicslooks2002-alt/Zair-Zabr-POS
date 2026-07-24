import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { FaEye, FaEyeSlash, FaCheck } from "react-icons/fa";
import logo from "../assets/images/logo.png";
import { resetPassword } from "../https/index";

const isStrong = (p) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(p);
const checks = (p) => [
  { ok: p.length >= 8, label: "8+ characters" },
  { ok: /[A-Z]/.test(p), label: "Uppercase" },
  { ok: /[a-z]/.test(p), label: "Lowercase" },
  { ok: /\d/.test(p), label: "Number" },
  { ok: /[^A-Za-z0-9]/.test(p), label: "Special char" },
];

const ResetPassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => { document.title = "Zair Zabar POS | Reset Password"; }, []);

  const mut = useMutation({
    mutationFn: () => resetPassword(token, password),
    onSuccess: (res) => {
      enqueueSnackbar(res?.data?.message || "Password updated.", { variant: "success" });
      navigate("/auth");
    },
    onError: (err) => enqueueSnackbar(err?.response?.data?.message || "Reset failed.", { variant: "error" }),
  });

  const submit = (e) => {
    e.preventDefault();
    if (mut.isPending) return;
    if (!isStrong(password)) return enqueueSnackbar("Password must be 8+ chars with uppercase, lowercase, number, and special character.", { variant: "warning" });
    if (password !== confirm) return enqueueSnackbar("Passwords do not match.", { variant: "warning" });
    mut.mutate();
  };

  return (
    <div className="min-h-screen bg-panel flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface rounded-lg p-8">
        <div className="flex flex-col items-center gap-2 mb-6">
          <img src={logo} alt="Zair Zabar" className="h-14 w-14 border-2 border-accent rounded-full p-1" />
          <h1 className="text-xl font-bold text-accent">Zair Zabar</h1>
        </div>
        <h2 className="text-2xl text-center font-semibold text-main mb-6">Reset Password</h2>

        {!token ? (
          <div className="text-center text-muted">
            <p>This reset link is invalid or missing.</p>
            <button onClick={() => navigate("/auth")} className="text-accent font-semibold mt-4 hover:underline">Back to login</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="New password" required
                className="w-full bg-base text-main placeholder:text-faint border border-line focus:border-accent rounded-xl px-4 py-3 pr-10 outline-none transition-colors" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                {show ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {checks(password).map((c) => (
                <span key={c.label} className={`text-[11px] flex items-center gap-1 ${c.ok ? "text-green-400" : "text-faint"}`}>
                  <FaCheck size={9} /> {c.label}
                </span>
              ))}
            </div>
            <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password" required
              className="w-full bg-base text-main placeholder:text-faint border border-line focus:border-accent rounded-xl px-4 py-3 outline-none transition-colors" />
            <button type="submit" disabled={mut.isPending}
              className="w-full bg-accent text-white py-3 rounded-lg font-bold disabled:opacity-60">
              {mut.isPending ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
