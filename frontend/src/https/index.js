import { axiosWrapper } from "./axiosWrapper";

// API Endpoints

// Auth Endpoints
export const login = (data) => axiosWrapper.post("/api/user/login", data);
export const register = (data) => axiosWrapper.post("/api/user/register", data);
export const getUserData = () => axiosWrapper.get("/api/user");
export const getUsers = () => axiosWrapper.get("/api/user/all");
export const logout = () => axiosWrapper.post("/api/user/logout");

// Table Endpoints
export const addTable = (data) => axiosWrapper.post("/api/table/", data);
export const getTables = () => axiosWrapper.get("/api/table");
export const updateTable = ({ tableId, ...tableData }) =>
  axiosWrapper.put(`/api/table/${tableId}`, tableData);

// Payment Endpoints
export const createOrderRazorpay = (data) =>
  axiosWrapper.post("/api/payment/create-order", data);
export const verifyPaymentRazorpay = (data) =>
  axiosWrapper.post("/api/payment//verify-payment", data);

// Order Endpoints
export const addOrder = (data) => axiosWrapper.post("/api/order/", data);
export const getOrders = () => axiosWrapper.get("/api/order");
export const updateOrderStatus = ({ orderId, orderStatus }) =>
  axiosWrapper.put(`/api/order/${orderId}`, { orderStatus });
export const settleOrder = (orderId) =>
  axiosWrapper.put(`/api/order/${orderId}/settle`);

// Session Endpoints
export const getCurrentSession = () => axiosWrapper.get("/api/session/current");
export const openSession = () => axiosWrapper.post("/api/session/open");
export const closeSession = () => axiosWrapper.post("/api/session/close");

// Pending Payment Endpoints
export const getPendingPayments = (status) =>
  axiosWrapper.get("/api/pending", { params: status ? { status } : {} });
export const settlePending = (id) =>
  axiosWrapper.put(`/api/pending/${id}/settle`);

// Report Endpoints
export const getSessionSummary = () => axiosWrapper.get("/api/report/session");
export const getSummary = ({ from, to } = {}) =>
  axiosWrapper.get("/api/report/summary", { params: { from, to } });
