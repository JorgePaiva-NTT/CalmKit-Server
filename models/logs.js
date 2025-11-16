const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  time: { type: Date, default: Date.now },
  // End-to-end encrypted payload (client-only decryptable)
  // Shape: { v:1, alg:'AES-GCM', iv: base64, ct: base64 }
  cipher: { type: mongoose.Schema.Types.Mixed },

  // Non-sensitive derived metadata (stored in plaintext)
  // Used for aggregations like trends without accessing sensitive fields
  moodScore: { type: Number, min: 1, max: 10 },

  // Backwards-compat fields (plaintext). Kept for migration/read-compat.
  trigger: { type: String, default: "" },
  emotion: { type: String, default: "" },
  intensity: { type: Number, default: 5 },
  anchor: { type: String, default: "" },
});

module.exports = mongoose.model("Log", LogSchema);
