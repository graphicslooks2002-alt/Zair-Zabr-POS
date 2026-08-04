const express = require("express");
const { addOrder, getOrders, getOrderById, updateOrder, settleOrder, deleteOrder } = require("../controllers/orderController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { authorize } = require("../middlewares/authorize");
const router = express.Router();


router.route("/").post(isVerifiedUser, addOrder);
router.route("/").get(isVerifiedUser, getOrders);
router.route("/:id").get(isVerifiedUser, getOrderById);
router.route("/:id").put(isVerifiedUser, authorize("Admin", "Cashier", "Superadmin"), updateOrder);
router.route("/:id/settle").put(isVerifiedUser, authorize("Admin", "Cashier", "Superadmin"), settleOrder);
router.route("/:id").delete(isVerifiedUser, authorize("Admin", "Superadmin"), deleteOrder);   // delete = Admin/Superadmin only

module.exports = router;