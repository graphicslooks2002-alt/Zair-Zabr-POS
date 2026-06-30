const createHttpError = require("http-errors");
const jwt = require("jsonwebtoken");
const config = require("../config/config");

const isVerifiedUser = async (req, res, next) => {
  try {
    const { accessToken } = req.cookies;

    if (!accessToken) {
      return next(createHttpError(401, "Please log in to continue."));
    }

    // Trust the signed JWT — no DB round-trip per request. The token carries
    // the user id + role; getUserData re-fetches the full profile when needed.
    const decodeToken = jwt.verify(accessToken, config.accessTokenSecret);

    req.user = { _id: decodeToken._id, role: decodeToken.role };
    next();
  } catch (error) {
    next(createHttpError(401, "Your session has expired. Please log in again."));
  }
};

module.exports = { isVerifiedUser };
