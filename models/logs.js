const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  time: { type: Date, default: Date.now },
  trigger: { type: String, default: "" },
  emotion: { type: String, default: "" },
  intensity: { type: Number, default: 5 },
  anchor: { type: String, default: "" },
});

module.exports = mongoose.model("Log", LogSchema);
