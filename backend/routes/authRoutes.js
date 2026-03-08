const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

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

    return res.json({
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        age: user.age,
        bio: user.bio,
        profilePhoto: user.profilePhoto,
        location: user.location,
        preferences: user.preferences,
        matchLock: user.matchLock,
      },
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