const bcrypt = require("bcryptjs");
const User = require("../models/User");

const getNextUserId = async () => {
  const latestUser = await User.findOne({})
    .sort({ user_id: -1, createdAt: -1 })
    .select("user_id")
    .lean();

  if (!latestUser || typeof latestUser.user_id !== "number") {
    return 1000;
  }

  return latestUser.user_id + 1;
};

const signup = async (req, res) => {
  try {
    const {
      user_id,
      username,
      email,
      password,
      profilePhoto,
      age,
      bio,
      hideProfile,
      "hideProfile": hideProfileFromSchema,
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
    const resolvedUserId =
      typeof user_id === "number" ? user_id : await getNextUserId();

    // create user
    const newUser = new User({
      user_id: resolvedUserId,
      username,
      email,
      passwordHash,
      profilePhoto: profilePhoto || "",
      age,
      bio: bio || "",
      "hideProfile": Boolean(hideProfile ?? hideProfileFromSchema),
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
        user_id: savedUser.user_id,
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