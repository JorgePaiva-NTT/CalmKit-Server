const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const AnchorSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "users",
  },
  text: {
    type: String,
    required: true,
  },
  group: {
    type: String,
    required: true,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  favoriteRank: {
    type: Number,
    default: null,
  },
  isUserCreated: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("anchor", AnchorSchema);
