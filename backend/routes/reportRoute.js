const express = require("express");
const {
  getDaily,
  getWeekly,
  getMonthly,
  getPaymentSplit,
} = require("../controllers/reportController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const router = express.Router();

router.route("/daily").get(isVerifiedUser, getDaily);
router.route("/weekly").get(isVerifiedUser, getWeekly);
router.route("/monthly").get(isVerifiedUser, getMonthly);
router.route("/payment-split").get(isVerifiedUser, getPaymentSplit);

module.exports = router;
