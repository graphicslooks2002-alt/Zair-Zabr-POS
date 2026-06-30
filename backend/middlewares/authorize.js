const createHttpError = require("http-errors");
const supabase = require("../config/supabase");
const { isVerifiedUser } = require("./tokenVerification");

// Role-based access control. Usage: authorize("Admin", "Cashier")
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        createHttpError(403, "You are not authorized to access this. Please contact an admin.")
      );
    }
    next();
  };

// Registration guard: open ONLY when there are zero users (first-admin bootstrap);
// after that, creating staff requires a logged-in Admin.
const adminOrBootstrap = async (req, res, next) => {
  try {
    const { count, error } = await supabase
      .from("users")
      .select("id", { head: true, count: "exact" });
    if (error) return next(createHttpError(500, error.message));

    if (!count) {
      req.isBootstrap = true; // first user — allow, controller forces Admin
      return next();
    }
    // users exist → require an authenticated Admin (clear, sign-up-specific messages)
    const { accessToken } = req.cookies || {};
    if (!accessToken) {
      return next(createHttpError(403, "Only an admin can create staff accounts. Please log in as an admin."));
    }
    isVerifiedUser(req, res, (err) => {
      if (err) {
        return next(createHttpError(403, "Your session has expired. Please log in again as an admin."));
      }
      if (req.user.role !== "Admin") {
        return next(createHttpError(403, "You are not authorized to sign up new staff. Please contact an admin."));
      }
      next();
    });
  } catch (e) {
    next(e);
  }
};

const ROLES = ["Admin", "Cashier", "Waiter"];

module.exports = { authorize, adminOrBootstrap, ROLES };
