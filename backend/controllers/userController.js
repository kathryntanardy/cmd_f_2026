const User = require("../models/User");

async function getMe(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .select("-passwordHash")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const payload = { ...user, "hideProfile": user.hideProfile ?? false };
    res.json(payload);
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

async function updateMe(req, res) {
  try {
    const updates = {};
    const allowed = ["username", "age", "bio", "profilePhoto", "location", "preferences"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    if (req.body["Hide Profile"] !== undefined) {
      updates.hideProfile = req.body["Hide Profile"];
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    )
      .select("-passwordHash")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("updateMe error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = { getMe, updateMe };
