const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const AiSettingsSchema = new Schema({
  persona: {
    type: String,
    required: true,
  },
  temperature: {
    type: Number,
    required: true,
  },
  topP: {
    type: Number,
    required: true,
  },
  maxOutputTokens: {
    type: Number,
    required: true,
  },
  topK: {
    type: Number,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("ai_settings", AiSettingsSchema);
