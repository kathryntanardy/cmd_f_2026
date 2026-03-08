const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { getMe, updateMe, getOthers } = require("../controllers/userController");

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);
router.get("/others", authMiddleware, getOthers);

module.exports = router;
