const mongoose = require("mongoose");
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

async function getOthers(req, res) {
  try {
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId)
      .select("location")
      .lean();

    const excludeQuery = {
      _id: { $ne: new mongoose.Types.ObjectId(currentUserId) },
    };

    let users;
    if (currentUser?.location?.coordinates?.length === 2) {
      users = await User.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: currentUser.location.coordinates },
            distanceField: "distanceMeters",
            spherical: true,
            maxDistance: 100000000,
          },
        },
        { $match: excludeQuery },
        {
          $project: {
            passwordHash: 0,
            email: 0,
            Ping: 0,
            matchLock: 0,
            createdAt: 0,
            updatedAt: 0,
          },
        },
      ]);
    } else {
      users = await User.find(excludeQuery)
        .select("-passwordHash -email -Ping -matchLock -createdAt -updatedAt")
        .lean();
      users = users.map((u) => ({ ...u, distanceMeters: null }));
    }

    const payload = users.map((u) => ({
      _id: u._id,
      user_id: u.user_id,
      username: u.username,
      age: u.age,
      bio: u.bio || "",
      profilePhoto: u.profilePhoto || "",
      preferences: u.preferences || {},
      distanceMeters: u.distanceMeters ?? null,
    }));

    res.json({ users: payload });
  } catch (error) {
    console.error("getOthers error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = { getMe, updateMe, getOthers };
