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
