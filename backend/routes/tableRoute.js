const express = require("express");
const { addTable, getTables, updateTable } = require("../controllers/tableController");
const router = express.Router();
const { isVerifiedUser } = require("../middlewares/tokenVerification")
const { authorize } = require("../middlewares/authorize");

router.route("/").post(isVerifiedUser , authorize("Admin"), addTable);   // add table = Admin config
router.route("/").get(isVerifiedUser , getTables);
router.route("/:id").put(isVerifiedUser , updateTable);                  // book/free during order flow = any staff

module.exports = router;