const express = require("express");
const {
  getCurrentSession,
  openSession,
  closeSession,
} = require("../controllers/sessionController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { authorize } = require("../middlewares/authorize");
const router = express.Router();

router.route("/current").get(isVerifiedUser, getCurrentSession);
router.route("/open").post(isVerifiedUser, authorize("Admin"), openSession);
router.route("/close").post(isVerifiedUser, authorize("Admin"), closeSession);

module.exports = router;
