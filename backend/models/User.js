const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    profilePhoto: {
      type: String,
      default: "",
    },

    age: {
      type: Number,
      required: true,
    },

    bio: {
      type: String,
      default: "",
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },

    preferences: {
      genderPreference: {
        type: [String],
        default: [],
      },
      ageMin: {
        type: Number,
        default: 18,
      },
      ageMax: {
        type: Number,
        default: 100,
      },
      maxDistanceMeters: {
        type: Number,
        default: 50,
      },
    },

    matchLock: {
      isLocked: {
        type: Boolean,
        default: false,
      },
      lockedUntil: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", userSchema);