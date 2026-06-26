const createHttpError = require("http-errors");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const supabase = require("../config/supabase");

const isVerifiedUser = async (req, res, next) => {
  try {
    const { accessToken } = req.cookies;

    if (!accessToken) {
      return next(createHttpError(401, "Please provide token!"));
    }

    const decodeToken = jwt.verify(accessToken, config.accessTokenSecret);

    const { data: user } = await supabase
      .from("users")
      .select("id, name, email, phone, role")
      .eq("id", decodeToken._id)
      .maybeSingle();

    if (!user) {
      return next(createHttpError(401, "User not exist!"));
    }

    // keep req.user._id working for existing controllers
    req.user = { _id: user.id, ...user };
    next();
  } catch (error) {
    next(createHttpError(401, "Invalid Token!"));
  }
};

module.exports = { isVerifiedUser };
