const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { getMe, updateMe, getUserById, getOthers, getMatches, addMatch, deleteMatch } = require("../controllers/userController");

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);
router.get("/others", authMiddleware, getOthers);
router.get("/me/matches", authMiddleware, getMatches);
router.post("/me/matches", authMiddleware, addMatch);
router.delete("/me/matches", authMiddleware, deleteMatch);
router.get("/:userId", authMiddleware, getUserById);

module.exports = router;
