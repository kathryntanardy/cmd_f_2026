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
    if (req.body["hideProfile"] !== undefined) {
      updates.hideProfile = req.body["hideProfile"];
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

async function getUserById(req, res) {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findOne({ user_id: userId })
      .select("-passwordHash -email -Matches -matchLock -createdAt -updatedAt")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("getUserById error:", error);
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
            Matches: 0,
            matchLock: 0,
            createdAt: 0,
            updatedAt: 0,
          },
        },
      ]);
    } else {
      users = await User.find(excludeQuery)
        .select("-passwordHash -email -Matches -matchLock -createdAt -updatedAt")
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

async function getMatches(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .select("Matches")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const matches = (user.Matches || []).map((m) => ({
      targetUserId: m.targetUserId,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      otherUserLocation: m.otherUserLocation,
    }));

    res.json({ matches });
  } catch (error) {
    console.error("getMatches error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

async function addMatch(req, res) {
  try {
    let { targetUserId } = req.body;

    if (targetUserId == null) {
      return res.status(400).json({ message: "targetUserId is required" });
    }
    targetUserId = typeof targetUserId === "string" ? parseInt(targetUserId, 10) : targetUserId;
    if (Number.isNaN(targetUserId) || typeof targetUserId !== "number") {
      return res.status(400).json({ message: "targetUserId must be a number" });
    }

    const targetUser = await User.findOne({ user_id: targetUserId })
      .select("location")
      .lean();

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    const otherUserLocation = targetUser.location?.coordinates;
    if (!otherUserLocation || otherUserLocation.length !== 2) {
      return res.status(400).json({
        message: "Target user has no location",
      });
    }

    const now = new Date();
    const matchEntry = {
      targetUserId,
      timestamp: now,
      otherUserLocation,
    };

    await User.findByIdAndUpdate(req.user._id, {
      $push: { Matches: matchEntry },
    });

    res.status(201).json({
      message: "Match added",
      match: {
        targetUserId,
        timestamp: now.toISOString(),
        otherUserLocation,
      },
    });
  } catch (error) {
    console.error("addMatch error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

async function deleteMatch(req, res) {
  try {
    const { targetUserId, timestamp } = req.body;

    if (targetUserId == null) {
      return res.status(400).json({ message: "targetUserId is required" });
    }

    const resolvedTargetUserId = typeof targetUserId === "string" ? parseInt(targetUserId, 10) : targetUserId;
    if (Number.isNaN(resolvedTargetUserId) || typeof resolvedTargetUserId !== "number") {
      return res.status(400).json({ message: "targetUserId must be a number" });
    }

    const pullCondition = { targetUserId: resolvedTargetUserId };
    if (timestamp) {
      const ts = new Date(timestamp);
      if (!Number.isNaN(ts.getTime())) {
        pullCondition.timestamp = ts;
      }
    }

    const result = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { Matches: pullCondition } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Match removed" });
  } catch (error) {
    console.error("deleteMatch error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = { getMe, updateMe, getUserById, getOthers, getMatches, addMatch, deleteMatch };
