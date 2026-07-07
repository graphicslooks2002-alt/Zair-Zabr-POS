import axios from "axios";

const defaultHeader = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

// Use the env var when set (e.g. http://localhost:8000 for local dev);
// otherwise fall back to the deployed backend so production always works.
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "https://zairbackend.vercel.app";

export const axiosWrapper = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  headers: { ...defaultHeader },
});

// If the server rejects a request as unauthenticated (session expired, account
// blocked, or deleted), force the user back to the login screen. A full reload
// also clears any in-memory auth state. Skip when already on an auth page so
// login/forgot-password errors surface normally instead of looping.
axiosWrapper.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const path = window.location.pathname;
    const onAuthPage = path === "/auth" || path === "/reset-password";
    if (status === 401 && !onAuthPage) {
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);
