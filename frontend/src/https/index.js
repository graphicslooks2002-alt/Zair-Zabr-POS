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

// Session Endpoints (session is automatic: 12 PM – 4 AM)
export const getCurrentSession = () => axiosWrapper.get("/api/session/current");

// Pending Payment Endpoints
export const getPendingPayments = (status) =>
  axiosWrapper.get("/api/pending", { params: status ? { status } : {} });
export const settlePending = (id) =>
  axiosWrapper.put(`/api/pending/${id}/settle`);

// Menu Endpoints (read = any user; writes = Admin)
export const getMenu = () => axiosWrapper.get("/api/menu");
export const seedMenu = (categories) => axiosWrapper.post("/api/menu/seed", { categories });
export const addCategory = (data) => axiosWrapper.post("/api/menu/category", data);
export const updateCategory = (id, data) => axiosWrapper.put(`/api/menu/category/${id}`, data);
export const deleteCategory = (id) => axiosWrapper.delete(`/api/menu/category/${id}`);
export const addProduct = (data) => axiosWrapper.post("/api/menu/product", data);
export const updateProduct = (id, data) => axiosWrapper.put(`/api/menu/product/${id}`, data);
export const deleteProduct = (id) => axiosWrapper.delete(`/api/menu/product/${id}`);

// Report Endpoints
export const getSessionSummary = () => axiosWrapper.get("/api/report/session");
export const getSummary = ({ from, to } = {}) =>
  axiosWrapper.get("/api/report/summary", { params: { from, to } });
