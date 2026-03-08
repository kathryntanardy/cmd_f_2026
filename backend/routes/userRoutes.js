const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { getMe, updateMe, getOthers, addMatch } = require("../controllers/userController");

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);
router.get("/others", authMiddleware, getOthers);
router.post("/me/matches", authMiddleware, addMatch);

module.exports = router;
