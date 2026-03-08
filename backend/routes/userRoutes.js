const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const {
  getMe,
  updateMe,
  updateLocation,
  getUserById,
  getOthers,
  getMatches,
  addMatch,
  deleteMatch,
  addPing,
  deleteExpiredPings,
  getDailyMatchStats,
} = require("../controllers/userController");

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.get("/me/daily-match-stats", authMiddleware, getDailyMatchStats);
router.patch("/me", authMiddleware, updateMe);

router.put("/me/location", authMiddleware, updateLocation);
router.patch("/me/location", authMiddleware, updateLocation);

router.get("/others", authMiddleware, getOthers);

router.get("/me/matches", authMiddleware, getMatches);
router.post("/me/matches", authMiddleware, addMatch);
router.delete("/me/matches", authMiddleware, deleteMatch);

router.post("/me/pings", authMiddleware, addPing);
router.delete("/me/pings/expired", authMiddleware, deleteExpiredPings);

router.get("/:userId", authMiddleware, getUserById);

module.exports = router;