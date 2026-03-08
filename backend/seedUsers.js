require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { faker } = require("@faker-js/faker");
const User = require("./models/User");

const USER_COUNT = 15;
const DEFAULT_PASSWORD = "seedPassword123!";
const seedFilePath = path.join(__dirname, "seedUsers.json");

const generateCoordinate = (min, max) =>
  faker.number.float({ min, max, multipleOf: 0.0001 });

const pickGenderPreference = () => {
  const options = ["male", "female", "non-binary"];
  const count = faker.number.int({ min: 1, max: 2 });
  return faker.helpers.arrayElements(options, count);
};

const buildFakeUser = (index, passwordHash) => {
  const firstName = faker.person.firstName().toLowerCase();
  const lastName = faker.person.lastName().toLowerCase();
  const uniqueSuffix = `${index + 1}${faker.number.int({ min: 100, max: 999 })}`;
  const username = `${firstName}${lastName}${uniqueSuffix}`;
  const age = faker.number.int({ min: 21, max: 35 });
  const ageMin = Math.max(19, age - faker.number.int({ min: 2, max: 5 }));
  const ageMax = age + faker.number.int({ min: 2, max: 6 });

  return {
    username,
    email: `${username}@example.com`,
    passwordHash,
    profilePhoto: faker.image.avatar(),
    age,
    bio: faker.lorem.sentence(),
    location: {
      type: "Point",
      coordinates: [
        generateCoordinate(-123.25, -123.0), // longitude
        generateCoordinate(49.2, 49.35), // latitude
      ],
    },
    preferences: {
      genderPreference: pickGenderPreference(),
      ageMin,
      ageMax,
      maxDistanceMeters: faker.number.int({ min: 50, max: 15000 }),
    },
    matchLock: {
      isLocked: false,
      lockedUntil: null,
    },
  };
};

async function seedUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    let users;
    if (fs.existsSync(seedFilePath)) {
      const fileContents = fs.readFileSync(seedFilePath, "utf-8");
      users = JSON.parse(fileContents);
      console.log(`Loaded ${users.length} users from seedUsers.json`);
    } else {
      // Every generated user shares this login password for easy local testing.
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      users = Array.from({ length: USER_COUNT }, (_, index) =>
        buildFakeUser(index, passwordHash)
      );
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