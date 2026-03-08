const mongoose = require("mongoose");
const User = require("../models/User");
const {
  DEFAULT_MAX_DISTANCE_METERS,
  MATCH_EXPIRY_MINUTES,
  MAX_MATCHES_PER_DAY,
} = require("../constants");

const MATCH_EXPIRY_MS = MATCH_EXPIRY_MINUTES * 60 * 1000;
const PING_EXPIRY_MS = 30 * 60 * 1000;

function isMatchExpired(match) {
  const ts = match?.timestamp ? new Date(match.timestamp).getTime() : 0;
  return ts && Date.now() - ts > MATCH_EXPIRY_MS;
}

function isPingExpired(ping) {
  const ts = ping?.timestamp ? new Date(ping.timestamp).getTime() : 0;
  return ts && Date.now() - ts > PING_EXPIRY_MS;
}

function filterUnexpiredMatches(matches) {
  if (!Array.isArray(matches)) return [];
  return matches.filter((m) => !isMatchExpired(m));
}

function filterUnexpiredPings(pings) {
  if (!Array.isArray(pings)) return [];
  return pings.filter((p) => !isPingExpired(p));
}

function formatMatchTime(date) {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function normalizeMatchTargetId(match) {
  if (!match) return null;
  if (match.targetUserId != null) return match.targetUserId;
  if (match.user_id != null) return match.user_id;
  return null;
}

function getStartOfTodayUtc() {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}

function countMatchesToday(matches) {
  const start = getStartOfTodayUtc().getTime();
  return (matches || []).filter((m) => {
    const ts = m?.timestamp ? new Date(m.timestamp).getTime() : 0;
    return ts >= start;
  }).length;
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
    const unexpiredPings = filterUnexpiredPings(user.Ping);

    const matchCutoff = new Date(Date.now() - MATCH_EXPIRY_MS);
    const pingCutoff = new Date(Date.now() - PING_EXPIRY_MS);

    await User.findByIdAndUpdate(req.user._id, {
      $pull: {
        Matches: {
          $or: [
            { timestamp: { $lt: matchCutoff } },
            { timestamp: { $exists: false } },
          ],
        },
        Ping: {
          $or: [
            { timestamp: { $lt: pingCutoff } },
            { timestamp: { $exists: false } },
          ],
        },
      },
    });

    const payload = {
      ...user,
      Matches: unexpiredMatches,
      Ping: unexpiredPings,
      hideProfile: user.hideProfile ?? false,
      Likes: user.Likes ?? [],
      matchesUsedToday: countMatchesToday(user.Matches),
      maxMatchesPerDay: MAX_MATCHES_PER_DAY,
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
    const allowed = [
      "username",
      "age",
      "bio",
      "profilePhoto",
      "location",
      "preferences",
    ];

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
          message:
            "Provide coordinates [longitude, latitude] or longitude and latitude",
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
      .select("-passwordHash -email -Matches -Likes -Ping -matchLock -createdAt -updatedAt")
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
    const lookAgain = req.query.lookAgain === "true" || req.query.lookAgain === true;

    const currentUser = await User.findById(currentUserId)
      .select("location preferences.maxDistanceMeters Matches Ping")
      .lean();

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const myMaxMeters =
      currentUser?.preferences?.maxDistanceMeters ?? DEFAULT_MAX_DISTANCE_METERS;

    const unexpiredMatches = filterUnexpiredMatches(currentUser?.Matches ?? []);
    const matchedUserIds = unexpiredMatches
      .map(normalizeMatchTargetId)
      .filter((id) => id != null);

    const unexpiredPings = filterUnexpiredPings(currentUser?.Ping ?? []);
    const pingedUserIds = unexpiredPings
      .map((p) => p?.targetUserId)
      .filter((id) => id != null);

    // Normally exclude both matches and pinged; "Look again" includes pinged so user can re-swipe
    const excludedUserIds = lookAgain
      ? matchedUserIds
      : [...new Set([...matchedUserIds, ...pingedUserIds])];

    const excludeQuery = {
      _id: { $ne: new mongoose.Types.ObjectId(currentUserId) },
      hideProfile: { $ne: true },
      user_id: { $nin: excludedUserIds },
    };

    const hasLocation = currentUser?.location?.coordinates?.length === 2;

    if (!hasLocation) {
      return res.json({
        users: [],
        locationRequired: true,
      });
    }

    const users = await User.aggregate([
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
              {
                $ifNull: [
                  "$preferences.maxDistanceMeters",
                  DEFAULT_MAX_DISTANCE_METERS,
                ],
              },
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
          Likes: 0,
          Ping: 0,
          matchLock: 0,
          createdAt: 0,
          updatedAt: 0,
          withinTheirMax: 0,
        },
      },
    ]);

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

    const matches = filterUnexpiredMatches(user.Matches || []).map((m) => ({
      user_id: m.user_id ?? m.targetUserId ?? null,
      targetUserId: m.targetUserId ?? m.user_id ?? null,
      timeFormatted:
        m.timeFormatted ||
        (m.timestamp ? formatMatchTime(new Date(m.timestamp)) : null),
      timestamp:
        m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      otherUserLocation: m.otherUserLocation ?? null,
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

    targetUserId =
      typeof targetUserId === "string" ? parseInt(targetUserId, 10) : targetUserId;

    if (Number.isNaN(targetUserId) || typeof targetUserId !== "number") {
      return res.status(400).json({ message: "targetUserId must be a number" });
    }

    const currentUser = await User.findById(req.user._id)
      .select("user_id Ping Matches location username profilePhoto")
      .lean();

    if (!currentUser) {
      return res.status(404).json({ message: "Current user not found" });
    }

    const myUserId = currentUser.user_id;

    if (myUserId == null) {
      return res.status(400).json({ message: "Current user has no user_id" });
    }

    if (myUserId === targetUserId) {
      return res.status(400).json({ message: "You cannot match with yourself" });
    }

    const targetUser = await User.findOne({ user_id: targetUserId })
      .select("_id user_id Ping Matches location username profilePhoto")
      .lean();

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    const now = new Date();

    const myActivePings = filterUnexpiredPings(currentUser.Ping || []);
    const theirActivePings = filterUnexpiredPings(targetUser.Ping || []);

    // Check if target user_id is in my Ping array (have I already pinged them?)
    const targetInMyPing = myActivePings.some((p) => p.targetUserId === targetUserId);

    if (!targetInMyPing) {
      const pingEntry = {
        targetUserId,
        timestamp: now,
        otherUserLocation: targetUser.location?.coordinates ?? null,
      };
      const pingUpdate = await User.updateOne(
        { _id: req.user._id },
        { $push: { Ping: pingEntry } },
        { runValidators: true }
      );
      if (pingUpdate.modifiedCount !== 1) {
        console.error("addMatch: Ping update did not modify document", {
          matchedCount: pingUpdate.matchedCount,
          modifiedCount: pingUpdate.modifiedCount,
          userId: myUserId,
          targetUserId,
        });
        return res.status(500).json({ message: "Failed to save ping" });
      }
    }

    // Check if I am in their Ping array (they already swiped right on me) → mutual match
    const iAmInTheirPing = theirActivePings.some((p) => p.targetUserId === myUserId);

    if (!iAmInTheirPing) {
      return res.status(201).json({
        message: targetInMyPing ? "Already pinged" : "Ping added",
        mutualMatch: false,
      });
    }

    const myActiveMatches = filterUnexpiredMatches(currentUser.Matches || []);
    const theirActiveMatches = filterUnexpiredMatches(targetUser.Matches || []);

    const alreadyMatchedMe = myActiveMatches.some(
      (m) => normalizeMatchTargetId(m) === targetUserId
    );
    const alreadyMatchedThem = theirActiveMatches.some(
      (m) => normalizeMatchTargetId(m) === myUserId
    );

    if (alreadyMatchedMe || alreadyMatchedThem) {
      return res.status(200).json({
        message: "Already matched",
        mutualMatch: true,
      });
    }

    // Daily match limit: 5 matches per user per day (UTC)
    if (countMatchesToday(currentUser.Matches) >= MAX_MATCHES_PER_DAY) {
      return res.status(403).json({
        message: `Daily match limit reached (${MAX_MATCHES_PER_DAY} per day). Try again tomorrow.`,
        mutualMatch: false,
      });
    }
    if (countMatchesToday(targetUser.Matches) >= MAX_MATCHES_PER_DAY) {
      return res.status(403).json({
        message: "This user has reached their daily match limit. Try again tomorrow.",
        mutualMatch: false,
      });
    }

    const timeFormatted = formatMatchTime(now);

    // Match schema: targetUserId, timestamp, otherUserLocation. Each side gets the other's data.
    const myMatchEntry = {
      targetUserId,
      timestamp: now,
      otherUserLocation: targetUser.location?.coordinates ?? null,
    };

    const theirMatchEntry = {
      targetUserId: myUserId,
      timestamp: now,
      otherUserLocation: currentUser.location?.coordinates ?? null,
    };

    const [myMatchResult, theirMatchResult] = await Promise.all([
      User.updateOne(
        { _id: req.user._id },
        { $push: { Matches: myMatchEntry } },
        { runValidators: true }
      ),
      User.updateOne(
        { _id: targetUser._id },
        { $push: { Matches: theirMatchEntry } },
        { runValidators: true }
      ),
    ]);

    if (myMatchResult.modifiedCount !== 1 || theirMatchResult.modifiedCount !== 1) {
      console.error("addMatch: Match update failed", {
        myModified: myMatchResult.modifiedCount,
        theirModified: theirMatchResult.modifiedCount,
      });
      return res.status(500).json({ message: "Failed to save match" });
    }

    return res.status(201).json({
      message: "It's a match!",
      mutualMatch: true,
      match: {
        user_id: targetUserId,
        targetUserId,
        timeFormatted,
        timestamp: now.toISOString(),
        otherUserLocation: targetUser.location?.coordinates ?? null,
      },
      matchedUser: {
        user_id: targetUser.user_id,
        username: targetUser.username,
        profilePhoto: targetUser.profilePhoto || "",
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

    const resolvedTargetUserId =
      typeof targetUserId === "string" ? parseInt(targetUserId, 10) : targetUserId;

    if (
      Number.isNaN(resolvedTargetUserId) ||
      typeof resolvedTargetUserId !== "number"
    ) {
      return res.status(400).json({ message: "targetUserId must be a number" });
    }

    const pullConditions = [
      { targetUserId: resolvedTargetUserId },
      { user_id: resolvedTargetUserId },
    ];

    if (timestamp) {
      const ts = new Date(timestamp);
      if (!Number.isNaN(ts.getTime())) {
        pullConditions[0].timestamp = ts;
        pullConditions[1].timestamp = ts;
      }
    }

    const result = await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: {
          Matches: {
            $or: pullConditions,
          },
        },
      },
      { returnDocument: "after" }
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

    targetUserId =
      typeof targetUserId === "string" ? parseInt(targetUserId, 10) : targetUserId;

    if (Number.isNaN(targetUserId) || typeof targetUserId !== "number") {
      return res.status(400).json({ message: "targetUserId must be a number" });
    }

    const currentUser = await User.findById(req.user._id)
      .select("user_id")
      .lean();

    if (!currentUser) {
      return res.status(404).json({ message: "Current user not found" });
    }

    const myUserId = currentUser.user_id;

    if (myUserId == null) {
      return res.status(400).json({ message: "Current user has no user_id" });
    }

    if (myUserId === targetUserId) {
      return res.status(400).json({ message: "You cannot reject yourself" });
    }

    const targetUser = await User.findOne({ user_id: targetUserId }).select("_id").lean();

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Left swipe = rejection only. No Ping added, no match logic.
    return res.status(200).json({
      message: "Passed",
      mutualMatch: false,
    });
  } catch (error) {
    console.error("addPing error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

async function deleteExpiredPings(req, res) {
  try {
    const cutoff = new Date(Date.now() - PING_EXPIRY_MS);

    const result = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { Ping: { timestamp: { $lt: cutoff } } } },
      { returnDocument: "after" }
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

async function getDailyMatchStats(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .select("Matches")
      .lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const matchesUsedToday = countMatchesToday(user.Matches);
    res.json({
      matchesUsedToday,
      maxPerDay: MAX_MATCHES_PER_DAY,
    });
  } catch (error) {
    console.error("getDailyMatchStats error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  getMe,
  updateMe,
  updateLocation,
  getUserById,
  getOthers,
  getMatches,
  addMatch,
  deleteMatch,
  addPing,
  deleteExpiredPings,
  getDailyMatchStats,
};