const express = require("express");
const {
  getMenu,
  addCategory,
  updateCategory,
  deleteCategory,
  addProduct,
  updateProduct,
  deleteProduct,
  seedMenu,
} = require("../controllers/menuController");
const { isVerifiedUser } = require("../middlewares/tokenVerification");
const { authorize } = require("../middlewares/authorize");
const router = express.Router();

// Read: any logged-in user (order page needs the menu).
router.route("/").get(isVerifiedUser, getMenu);

// Writes: Admin only.
const admin = [isVerifiedUser, authorize("Admin")];

router.route("/seed").post(...admin, seedMenu);

router.route("/category").post(...admin, addCategory);
router.route("/category/:id").put(...admin, updateCategory);
router.route("/category/:id").delete(...admin, deleteCategory);

router.route("/product").post(...admin, addProduct);
router.route("/product/:id").put(...admin, updateProduct);
router.route("/product/:id").delete(...admin, deleteProduct);

module.exports = router;
