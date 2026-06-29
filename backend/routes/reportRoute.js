const express = require("express");
const {
  getDaily,
  getWeekly,
  getMonthly,
  getPaymentSplit,
  getSummary,
  getSessionSummary,
} = require("../controllers/reportController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { authorize } = require("../middlewares/authorize");
const router = express.Router();

// Reports / statistics → Admin only.
router.use(isVerifiedUser, authorize("Admin"));

router.route("/daily").get(getDaily);
router.route("/weekly").get(getWeekly);
router.route("/monthly").get(getMonthly);
router.route("/payment-split").get(getPaymentSplit);
router.route("/summary").get(getSummary);
router.route("/session").get(getSessionSummary);

module.exports = router;
