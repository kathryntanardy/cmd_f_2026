const mongoose = require("mongoose");
const User = require("../models/User");
const { DEFAULT_MAX_DISTANCE_METERS, MATCH_EXPIRY_MINUTES } = require("../constants");

const MATCH_EXPIRY_MS = MATCH_EXPIRY_MINUTES * 60 * 1000;

function isMatchExpired(match) {
  const ts = match.timestamp ? new Date(match.timestamp).getTime() : 0;
  return ts && Date.now() - ts > MATCH_EXPIRY_MS;
}

function filterUnexpiredMatches(matches) {
  if (!Array.isArray(matches)) return [];
  return matches.filter((m) => !isMatchExpired(m));
}

async function getMe(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .select("-passwordHash")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const unexpiredMatches = filterUnexpiredMatches(user.Matches);

    const cutoff = new Date(Date.now() - MATCH_EXPIRY_MS);
    await User.findByIdAndUpdate(req.user._id, {
      $pull: {
        Matches: {
          $or: [
            { timestamp: { $lt: cutoff } },
            { timestamp: { $exists: false } },
          ],
        },
      },
    });

    const payload = {
      ...user,
      Matches: unexpiredMatches,
      hideProfile: user.hideProfile ?? false,
    };
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

    if (req.body.hideProfile !== undefined) {
      updates.hideProfile = req.body.hideProfile;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { returnDocument: "after" }
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

async function updateLocation(req, res) {
  try {
    let coordinates = req.body.coordinates;
    let longitude = req.body.longitude;
    let latitude = req.body.latitude;

    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      const parsedCoordinates = coordinates.map((value) => Number(value));

      if (parsedCoordinates.some(Number.isNaN)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }

      coordinates = parsedCoordinates;
    } else {
      longitude = Number(longitude);
      latitude = Number(latitude);

      if (Number.isNaN(longitude) || Number.isNaN(latitude)) {
        return res.status(400).json({
          message: "Provide coordinates [longitude, latitude] or longitude and latitude",
        });
      }

      coordinates = [longitude, latitude];
    }

    const [lng, lat] = coordinates;

    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return res.status(400).json({ message: "Coordinates out of range" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          location: {
            type: "Point",
            coordinates: [lng, lat],
          },
        },
      },
      { returnDocument: "after" }
    )
      .select("-passwordHash")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Location updated",
      location: user.location,
    });
  } catch (error) {
    console.error("updateLocation error:", error);
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
      .select("location preferences.maxDistanceMeters Matches")
      .lean();

    const myMaxMeters =
      currentUser?.preferences?.maxDistanceMeters ?? DEFAULT_MAX_DISTANCE_METERS;

    const unexpiredMatches = filterUnexpiredMatches(currentUser?.Matches ?? []);
    const matchedUserIds = unexpiredMatches
      .map((m) => m.user_id ?? m.targetUserId)
      .filter((id) => id != null);

    const excludeQuery = {
      _id: { $ne: new mongoose.Types.ObjectId(currentUserId) },
      hideProfile: { $ne: true },
      user_id: { $nin: matchedUserIds },
    };

    let users;

    if (currentUser?.location?.coordinates?.length === 2) {
      users = await User.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: currentUser.location.coordinates },
            distanceField: "distanceMeters",
            spherical: true,
            maxDistance: Math.min(myMaxMeters, 500000),
          },
        },
        { $match: excludeQuery },
        {
          $addFields: {
            withinTheirMax: {
              $lte: [
                "$distanceMeters",
                { $ifNull: ["$preferences.maxDistanceMeters", DEFAULT_MAX_DISTANCE_METERS] },
              ],
            },
          },
        },
        { $match: { withinTheirMax: true } },
        {
          $project: {
            passwordHash: 0,
            email: 0,
            Matches: 0,
            matchLock: 0,
            createdAt: 0,
            updatedAt: 0,
            withinTheirMax: 0,
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

    const hasLocation = currentUser?.location?.coordinates?.length === 2;

    res.json({
      users: payload,
      ...(hasLocation ? {} : { locationRequired: true }),
    });
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

async function addPing(req, res) {
  try {
    let { targetUserId } = req.body;

    if (targetUserId == null) {
      return res.status(400).json({ message: "targetUserId is required" });
    }
    targetUserId = typeof targetUserId === "string" ? parseInt(targetUserId, 10) : targetUserId;
    if (Number.isNaN(targetUserId) || typeof targetUserId !== "number") {
      return res.status(400).json({ message: "targetUserId must be a number" });
    }

    const now = new Date();
    const pingEntry = {
      targetUserId,
      timestamp: now,
    };

    await User.findByIdAndUpdate(req.user._id, {
      $push: { Ping: pingEntry },
    });

    res.status(201).json({
      message: "Ping added",
      ping: {
        targetUserId,
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("addPing error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

async function deleteExpiredPings(req, res) {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);

    const result = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { Ping: { timestamp: { $lt: cutoff } } } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Expired pings removed" });
  } catch (error) {
    console.error("deleteExpiredPings error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  getMe,
  updateMe,
  getUserById,
  getOthers,
  getMatches,
  addMatch,
  deleteMatch,
  addPing,
  deleteExpiredPings,
};
