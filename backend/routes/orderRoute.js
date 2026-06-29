const express = require("express");
const { addOrder, getOrders, getOrderById, updateOrder, settleOrder } = require("../controllers/orderController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { authorize } = require("../middlewares/authorize");
const router = express.Router();


router.route("/").post(isVerifiedUser, addOrder);
router.route("/").get(isVerifiedUser, getOrders);
router.route("/:id").get(isVerifiedUser, getOrderById);
router.route("/:id").put(isVerifiedUser, authorize("Admin", "Cashier"), updateOrder);
router.route("/:id/settle").put(isVerifiedUser, authorize("Admin", "Cashier"), settleOrder);

module.exports = router;