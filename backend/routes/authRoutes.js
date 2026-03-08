const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { tokenStore } = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    console.log("Login route hit");
    console.log("Request body:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log("Searching for:", normalizedEmail);

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.log("User not found");
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    console.log("User found:", user.email);
    console.log("Stored passwordHash:", user.passwordHash);

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    console.log("Password match:", isMatch);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = crypto.randomBytes(24).toString("hex");
    tokenStore.set(token, { _id: user._id, user_id: user.user_id });

    const userPayload = {
      id: user._id,
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      age: user.age,
      bio: user.bio,
      profilePhoto: user.profilePhoto,
      location: user.location,
      preferences: user.preferences,
      matchLock: user.matchLock,
      "hideProfile": user["hideProfile"],
    };

    return res.json({
      message: "Login successful",
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Server error during login",
      error: error.message,
    });
  }
});

module.exports = router;