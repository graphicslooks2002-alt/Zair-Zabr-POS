// Lightweight field validators (server-side source of truth).
const dns = require("dns").promises;

const isEmail = (s) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || "").trim());

// Does the email's domain actually accept mail? (has MX or A record)
// Catches fake/typo domains without sending anything.
const emailDomainExists = async (email) => {
  const domain = String(email || "").split("@")[1];
  if (!domain) return false;
  try {
    const mx = await dns.resolveMx(domain);
    if (mx && mx.length) return true;
  } catch (_) { /* fall through */ }
  try {
    const a = await dns.resolve(domain); // some domains accept mail via A record
    return Array.isArray(a) && a.length > 0;
  } catch (_) {
    return false;
  }
};

const normalizePhone = (s) => String(s || "").replace(/[\s-]/g, "");

// Pakistani mobile format: 11 digits starting with 0 (e.g. 03001234567).
const isPhone = (s) => /^0\d{10}$/.test(normalizePhone(s));

const isPositiveInt = (n) =>
  Number.isInteger(Number(n)) && Number(n) > 0;

const isNonNegativeNumber = (n) =>
  typeof Number(n) === "number" && !Number.isNaN(Number(n)) && Number(n) >= 0;

module.exports = { isEmail, emailDomainExists, isPhone, isPositiveInt, isNonNegativeNumber, normalizePhone };
