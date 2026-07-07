const express = require("express");
const { register, login, verifyEmail, approveUser, resendVerification, forgotPassword, resetPassword, getUserData, getAllUsers, updateUser, deleteUser, blockUser, unblockUser, logout } = require("../controllers/userController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { adminOrBootstrap, authorize } = require("../middlewares/authorize");
const { authLimiter } = require("../middlewares/rateLimit");
const router = express.Router();


// Authentication Routes
// register: open only for the very first user (bootstrap), else Admin-only.
router.route("/register").post(authLimiter, adminOrBootstrap, register);
router.route("/login").post(authLimiter, login);
router.route("/forgot-password").post(authLimiter, forgotPassword);
router.route("/reset-password").post(authLimiter, resetPassword);
router.route("/logout").post(isVerifiedUser, logout)

// Email links (token-secured, clicked from inbox — no login).
router.route("/verify").get(verifyEmail);
router.route("/approve").get(approveUser);

router.route("/all").get(isVerifiedUser, authorize("Admin", "Superadmin"), getAllUsers);
router.route("/:id/resend-verify").post(isVerifiedUser, authorize("Admin", "Superadmin"), resendVerification);
// Block / unblock (suspend login) — owner only, works on any role including Admin.
router.route("/:id/block").put(isVerifiedUser, authorize("Superadmin"), blockUser);
router.route("/:id/unblock").put(isVerifiedUser, authorize("Superadmin"), unblockUser);
router.route("/:id").put(isVerifiedUser, authorize("Admin", "Superadmin"), updateUser);
router.route("/:id").delete(isVerifiedUser, authorize("Admin", "Superadmin"), deleteUser);
router.route("/").get(isVerifiedUser , getUserData);

module.exports = router;