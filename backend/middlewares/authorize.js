const createHttpError = require("http-errors");
const supabase = require("../config/supabase");
const { isVerifiedUser } = require("./tokenVerification");

// Role-based access control. Usage: authorize("Admin", "Cashier")
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        createHttpError(403, "You do not have permission to perform this action.")
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
    // users exist → require an authenticated Admin
    isVerifiedUser(req, res, (err) => {
      if (err) return next(err);
      authorize("Admin")(req, res, next);
    });
  } catch (e) {
    next(e);
  }
};

const ROLES = ["Admin", "Cashier", "Waiter"];

module.exports = { authorize, adminOrBootstrap, ROLES };
