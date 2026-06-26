const createHttpError = require("http-errors");
const supabase = require("../config/supabase");

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

module.exports = { getDaily, getWeekly, getMonthly, getPaymentSplit };
