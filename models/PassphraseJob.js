const mongoose = require("mongoose");

const PassphraseJobSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    state: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
    },
    total: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    errors: { type: Number, default: 0 },
    lastError: { type: String },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    encVersionTarget: { type: Number, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PassphraseJob", PassphraseJobSchema);
