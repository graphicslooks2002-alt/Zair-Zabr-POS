import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { forgotPassword } from "../../https/index";

const ForgotPassword = ({ onBack }) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const mut = useMutation({
    mutationFn: () => forgotPassword(email.trim().toLowerCase()),
    onSuccess: (res) => {
      setSent(true);
      enqueueSnackbar(res?.data?.message || "If an account exists, a reset link was sent.", { variant: "success", autoHideDuration: 6000 });
    },
    onError: (err) => enqueueSnackbar(err?.response?.data?.message || "Something went wrong.", { variant: "error" }),
  });

  const submit = (e) => {
    e.preventDefault();
    if (mut.isPending) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      return enqueueSnackbar("Please enter a valid email address.", { variant: "warning" });
    mut.mutate();
  };

  if (sent) {
    return (
      <div className="text-center">
        <p className="text-main mb-2">📧 Check your inbox</p>
        <p className="text-muted text-sm mb-6">
          If an account exists for <b>{email}</b>, we've sent a password reset link. It expires in 30 minutes.
        </p>
        <button onClick={onBack} className="text-accent font-semibold hover:underline">Back to login</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <p className="text-muted text-sm mb-4">Enter your email and we'll send you a reset link.</p>
      <label className="block text-muted mb-1.5 text-sm font-medium">Employee Email</label>
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-base border border-line focus-within:border-accent transition-colors">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="bg-transparent flex-1 min-w-0 text-main placeholder:text-faint focus:outline-none"
          required
        />
      </div>
      <button
        type="submit"
        disabled={mut.isPending}
        className="w-full rounded-xl mt-6 py-3 text-lg bg-accent hover:brightness-110 text-white font-bold transition disabled:opacity-60"
      >
        {mut.isPending ? "Sending..." : "Send Reset Link"}
      </button>
      <div className="text-center mt-4">
        <button type="button" onClick={onBack} className="text-accent text-sm font-semibold hover:underline">Back to login</button>
      </div>
    </form>
  );
};

export default ForgotPassword;
