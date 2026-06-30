const createHttpError = require("http-errors");
const supabase = require("../config/supabase");
const { getCurrentSessionWindow } = require("./sessionController");

// Each report just reads a Postgres view (see db-schema/analytics_views.sql).
const fromView = (view) => async (req, res, next) => {
  try {
    const { data, error } = await supabase.from(view).select("*");
    if (error) return next(createHttpError(500, error.message));
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getDaily = fromView("daily_revenue");
const getWeekly = fromView("weekly_revenue");
const getMonthly = fromView("monthly_revenue");
const getPaymentSplit = fromView("payment_split");

// Roll a set of order rows into the business summary the dashboard/export needs.
const computeStats = (orders) => {
  const stats = {
    totalRevenue: 0,      // collected (Paid only)
    totalOrders: orders.length,
    paidPayments: 0,
    pendingPayments: 0,
    pendingAmount: 0,
    discountsGiven: 0,
    onlinePayments: 0,
    cashPayments: 0,
  };

  for (const o of orders) {
    const amt = o.bills?.totalWithTax || 0;
    stats.discountsGiven += o.discount_amount || 0;

    if (o.payment_status === "Paid") {
      stats.paidPayments += 1;
      stats.totalRevenue += amt;
      if (o.payment_method === "Online") stats.onlinePayments += amt;
      else stats.cashPayments += amt;
    } else {
      stats.pendingPayments += 1;
      stats.pendingAmount += amt;
    }
  }

  // round money to 2dp
  for (const k of ["totalRevenue", "pendingAmount", "discountsGiven", "onlinePayments", "cashPayments"]) {
    stats[k] = +stats[k].toFixed(2);
  }
  return stats;
};

const fetchOrdersBetween = async (fromISO, toISO) => {
  let query = supabase
    .from("orders")
    .select("bills, payment_status, payment_method, discount_amount, order_date");
  if (fromISO) query = query.gte("order_date", fromISO);
  if (toISO) query = query.lte("order_date", toISO);
  const { data, error } = await query;
  if (error) throw createHttpError(500, error.message);
  return data || [];
};

// GET /api/report/summary?from=ISO&to=ISO  (defaults: all-time if omitted)
const getSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const orders = await fetchOrdersBetween(from, to);
    res.status(200).json({
      success: true,
      data: { range: { from: from || null, to: to || null }, ...computeStats(orders) },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/report/session — summary for the current automatic session (12 PM–4 AM PKT).
const getSessionSummary = async (req, res, next) => {
  try {
    const { start, end } = getCurrentSessionWindow();
    const orders = await fetchOrdersBetween(start.toISOString(), end.toISOString());
    res.status(200).json({
      success: true,
      data: {
        session: {
          auto: true,
          opened_at: start.toISOString(),
          closes_at: end.toISOString(),
          active: Date.now() < end.getTime(),
          label: "12:00 PM – 4:00 AM",
        },
        ...computeStats(orders),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDaily,
  getWeekly,
  getMonthly,
  getPaymentSplit,
  getSummary,
  getSessionSummary,
};
