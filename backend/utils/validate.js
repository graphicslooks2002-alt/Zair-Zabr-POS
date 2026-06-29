// Lightweight field validators (server-side source of truth).

const isEmail = (s) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || "").trim());

const normalizePhone = (s) => String(s || "").replace(/[\s-]/g, "");

// Pakistani mobile format: 11 digits starting with 0 (e.g. 03001234567).
const isPhone = (s) => /^0\d{10}$/.test(normalizePhone(s));

const isPositiveInt = (n) =>
  Number.isInteger(Number(n)) && Number(n) > 0;

const isNonNegativeNumber = (n) =>
  typeof Number(n) === "number" && !Number.isNaN(Number(n)) && Number(n) >= 0;

module.exports = { isEmail, isPhone, isPositiveInt, isNonNegativeNumber, normalizePhone };
