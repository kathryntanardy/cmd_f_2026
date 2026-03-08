require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { faker } = require("@faker-js/faker");
const User = require("./models/User");

const USER_COUNT = 15;
const DEFAULT_PASSWORD = "seedPassword123!";
const USER_ID_START = 1234;
const seedFilePath = path.join(__dirname, "seedUsers.json");

const SHORT_FIRST_NAMES = {
  male: [
    "Alex", "Ryan", "Noah", "Ethan", "Liam",
    "Leo", "Jay", "Chris", "Ben", "Max",
    "Daniel", "Kai", "Owen", "Luke", "Ian",
  ],
  female: [
    "Emma", "Mia", "Lina", "Chloe", "Nina",
    "Ella", "Sophie", "Zoe", "Anna", "Maya",
    "Leah", "Ruby", "Ava", "Jade", "Ivy",
  ],
  "non-binary": [
    "Kai", "Sky", "Rowan", "Alex", "Sage",
    "Quinn", "Ari", "Noa", "River", "Jules",
  ],
};

const SHORT_LAST_NAMES = [
  "Lee", "Kim", "Tan", "Park", "Ng",
  "Lim", "Smith", "Brown", "Clark", "Hall",
  "Lopez", "Young", "Reed", "Scott", "Bell",
];

const SHORT_BIOS = [
  "Coffee, walks, and good conversations.",
  "Always down for food spots and sunsets.",
  "Gym, music, and late-night chats.",
  "I like simple things and genuine people.",
  "Into movies, matcha, and weekend drives.",
  "Looking for someone easy to talk to.",
  "Big on honesty, humor, and kindness.",
  "Trying new places and meeting new people.",
  "Chill energy, but I love adventure too.",
  "Books, playlists, and spontaneous plans.",
];

const generateCoordinate = (min, max) =>
  faker.number.float({ min, max, multipleOf: 0.0001 });

const pickGenderPreference = () => {
  const options = ["male", "female", "non-binary"];
  const count = faker.number.int({ min: 1, max: 2 });
  return faker.helpers.arrayElements(options, count);
};

const pickPresentation = () => {
  return faker.helpers.arrayElement(["male", "female", "non-binary"]);
};

const getPhotoGenderFolder = (presentation) => {
  // randomuser only supports men/women folders
  if (presentation === "female") return "women";
  return "men";
};

const buildRealisticPhotoUrl = (presentation, seedNumber) => {
  const folder = getPhotoGenderFolder(presentation);
  const photoId = seedNumber % 100; // randomuser has 0-99 images
  return `https://randomuser.me/api/portraits/${folder}/${photoId}.jpg`;
};

const buildFakeUser = (index, passwordHash) => {
  const userId = USER_ID_START + index;
  const presentation = pickPresentation();

  const firstName = faker.helpers.arrayElement(
    SHORT_FIRST_NAMES[presentation]
  );
  const lastName = faker.helpers.arrayElement(SHORT_LAST_NAMES);

  const usernameBase = `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, "");
  const username = `${usernameBase}${faker.number.int({ min: 10, max: 99 })}`;

  const age = faker.number.int({ min: 22, max: 30 });
  const ageMin = Math.max(20, age - faker.number.int({ min: 2, max: 4 }));
  const ageMax = Math.min(35, age + faker.number.int({ min: 2, max: 5 }));

  const coordinates = [
    generateCoordinate(-123.25, -123.0),
    generateCoordinate(49.2, 49.35),
  ];

  return {
    user_id: userId,
    username,
    email: `${username}@example.com`,
    passwordHash,

    // better if your frontend displays this instead of username
    firstName,
    lastName,
    displayName: firstName,

    profilePhoto: buildRealisticPhotoUrl(presentation, index + 10),
    age,
    bio: faker.helpers.arrayElement(SHORT_BIOS),

    location: {
      type: "Point",
      coordinates,
    },

    preferences: {
      genderPreference: pickGenderPreference(),
      ageMin,
      ageMax,
      maxDistanceMeters: faker.number.int({ min: 1000, max: 12000 }),
    },

    matchLock: {
      isLocked: false,
      lockedUntil: null,
    },

    hideProfile: false,
  };
};

const addMatchesToUsers = (users) => {
  const userIdToUser = new Map(users.map((u) => [u.user_id, u]));
  const now = new Date();

  users.forEach((user) => {
    const otherUserIds = users
      .filter((u) => u.user_id !== user.user_id)
      .map((u) => u.user_id);

    const matchCount = faker.number.int({ min: 2, max: 5 });
    const picked = faker.helpers.arrayElements(
      otherUserIds,
      Math.min(matchCount, otherUserIds.length)
    );

    user.Matches = picked.map((targetUserId) => {
      const target = userIdToUser.get(targetUserId);
      const timestamp = new Date(
        now.getTime() - faker.number.int({ min: 1, max: 72 }) * 60 * 60 * 1000
      );

      return {
        targetUserId,
        timestamp,
        otherUserLocation: target?.location?.coordinates ?? [-123.1, 49.25],
      };
    });
  });
};

const addPingsToUsers = (users) => {
  const now = new Date();

  users.forEach((user) => {
    const matchedIds = new Set((user.Matches || []).map((m) => m.targetUserId));

    const otherUserIds = users
      .filter((u) => u.user_id !== user.user_id && !matchedIds.has(u.user_id))
      .map((u) => u.user_id);

    const pingCount = faker.number.int({ min: 1, max: 3 });
    const picked = faker.helpers.arrayElements(
      otherUserIds,
      Math.min(pingCount, otherUserIds.length)
    );

    user.Ping = picked.map((targetUserId) => {
      const timestamp = new Date(
        now.getTime() - faker.number.int({ min: 1, max: 48 }) * 60 * 60 * 1000
      );

      return {
        targetUserId,
        timestamp,
      };
    });
  });
};

async function seedUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    let users;
    if (fs.existsSync(seedFilePath)) {
      const fileContents = fs.readFileSync(seedFilePath, "utf-8");
      users = JSON.parse(fileContents);

      if (!users[0]?.Matches?.length) addMatchesToUsers(users);
      if (!users[0]?.Ping?.length) addPingsToUsers(users);

      console.log(`Loaded ${users.length} users from seedUsers.json`);
    } else {
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      users = Array.from({ length: USER_COUNT }, (_, index) =>
        buildFakeUser(index, passwordHash)
      );

      addMatchesToUsers(users);
      addPingsToUsers(users);

      console.log("seedUsers.json not found, generated fake users instead");
      console.log(`Default password for seeded users: ${DEFAULT_PASSWORD}`);
    }

    const insertedUsers = await User.insertMany(users);
    console.log(`${insertedUsers.length} users inserted`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Seed failed:", error);
    await mongoose.disconnect();
  }
}

seedUsers();