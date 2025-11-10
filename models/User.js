const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true },
  avatarColor: { type: String, default: "blue" },
});

module.exports = mongoose.model("User", UserSchema);
