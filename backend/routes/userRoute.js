const express = require("express");
const { register, login, getUserData, getAllUsers, logout } = require("../controllers/userController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { adminOrBootstrap, authorize } = require("../middlewares/authorize");
const { authLimiter } = require("../middlewares/rateLimit");
const router = express.Router();


// Authentication Routes
// register: open only for the very first user (bootstrap), else Admin-only.
router.route("/register").post(authLimiter, adminOrBootstrap, register);
router.route("/login").post(authLimiter, login);
router.route("/logout").post(isVerifiedUser, logout)

router.route("/all").get(isVerifiedUser, authorize("Admin"), getAllUsers);
router.route("/").get(isVerifiedUser , getUserData);

module.exports = router;