const express = require("express");
const {
  getPendingPayments,
  settlePending,
} = require("../controllers/pendingController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { authorize } = require("../middlewares/authorize");
const router = express.Router();

router.route("/").get(isVerifiedUser, getPendingPayments);
router.route("/:id/settle").put(isVerifiedUser, authorize("Admin", "Cashier"), settlePending);

module.exports = router;
