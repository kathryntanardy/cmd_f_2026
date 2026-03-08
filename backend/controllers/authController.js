const bcrypt = require("bcryptjs");
const User = require("../models/User");

const signup = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      profilePhoto,
      age,
      bio,
      location,
      preferences,
    } = req.body;

    // basic required field check
    if (!username || !email || !password || !age || !location) {
      return res.status(400).json({
        message: "username, email, password, age, and location are required",
      });
    }

    // check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Username or email already in use",
      });
    }

    // hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // create user
    const newUser = new User({
      username,
      email,
      passwordHash,
      profilePhoto: profilePhoto || "",
      age,
      bio: bio || "",
      location,
      preferences: preferences || {},
      matchLock: {
        isLocked: false,
        lockedUntil: null,
      },
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "Server error during signup",
    });
  }
};

module.exports = {
  signup,
};