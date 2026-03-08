const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const User = require("./models/User");

const PING_EXPIRY_MS = 30 * 60 * 1000;
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
        const cutoff = new Date(Date.now() - PING_EXPIRY_MS);
        const result = await User.updateMany(
          {},
          { $pull: { Ping: { timestamp: { $lt: cutoff } } } }
        );
        if (result.modifiedCount > 0) {
          console.log(`Cleaned expired pings for ${result.modifiedCount} users`);
        }
      } catch (err) {
        console.error("Ping cleanup error:", err);
      }
    }, CLEANUP_INTERVAL_MS);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });