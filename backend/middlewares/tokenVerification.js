const createHttpError = require("http-errors");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const supabase = require("../config/supabase");

const isVerifiedUser = async (req, res, next) => {
  try {
    const { accessToken } = req.cookies;

    if (!accessToken) {
      return next(createHttpError(401, "Please log in to continue."));
    }

    const decodeToken = jwt.verify(accessToken, config.accessTokenSecret);

    // Re-check the live account on every request so a block (or deletion) takes
    // effect immediately — even for sessions that were already signed in.
    // We also read the role from the DB so a role change applies without re-login.
    const { data: user, error } = await supabase
      .from("users")
      .select("id, role, is_blocked")
      .eq("id", decodeToken._id)
      .maybeSingle();

    if (error) return next(createHttpError(500, "Could not verify your session."));
    if (!user) return next(createHttpError(401, "Your account no longer exists. Please log in again."));
    if (user.is_blocked) {
      return next(createHttpError(401, "Your access has been suspended. Please contact your administrator."));
    }

    req.user = { _id: user.id, role: user.role };
    next();
  } catch (error) {
    next(createHttpError(401, "Your session has expired. Please log in again."));
  }
};

module.exports = { isVerifiedUser };
