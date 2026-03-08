const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const User = require("./models/User");
const { MATCH_EXPIRY_MINUTES } = require("./constants");

const PING_EXPIRY_MS = 30 * 60 * 1000;
const MATCH_EXPIRY_MS = MATCH_EXPIRY_MINUTES * 60 * 1000;
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "LoveSignal API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

console.log("PORT:", PORT);
console.log("MONGO_URI loaded:", !!MONGO_URI);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");

    setInterval(async () => {
      try {
        const pingCutoff = new Date(Date.now() - PING_EXPIRY_MS);
        const pingResult = await User.updateMany(
          {},
          { $pull: { Ping: { timestamp: { $lt: pingCutoff } } } }
        );
        if (pingResult.modifiedCount > 0) {
          console.log(`Cleaned expired pings for ${pingResult.modifiedCount} users`);
        }
      } catch (err) {
        console.error("Ping cleanup error:", err);
      }
    }, CLEANUP_INTERVAL_MS);

    setInterval(async () => {
      try {
        const matchCutoff = new Date(Date.now() - MATCH_EXPIRY_MS);
        const matchResult = await User.updateMany(
          {},
          { $pull: { Matches: { timestamp: { $lt: matchCutoff } } } }
        );
        if (matchResult.modifiedCount > 0) {
          console.log(`Cleaned expired matches for ${matchResult.modifiedCount} users`);
        }
      } catch (err) {
        console.error("Match cleanup error:", err);
      }
    }, CLEANUP_INTERVAL_MS);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });