const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true },
  avatarColor: { type: String, default: "blue" },
  // Server-side encryption metadata
  encSalt: { type: String }, // base64 salt for PBKDF2
  encVersion: { type: Number, default: 1 },
  encKey: { type: String }, // base64 encoded AES-256 key derived from passcode+encSalt
  customFactors: { type: [String], default: [] },
});

module.exports = mongoose.model("User", UserSchema);
