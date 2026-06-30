const express = require("express");
const { getCurrentSession } = require("../controllers/sessionController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const router = express.Router();

// Session is automatic (12 PM – 4 AM). Only expose the current window.
router.route("/current").get(isVerifiedUser, getCurrentSession);

module.exports = router;
