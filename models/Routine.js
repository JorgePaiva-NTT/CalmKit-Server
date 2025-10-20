const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const StepSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  text: {
    type: [String],
    required: true,
  },
});

const RoutineSchema = new Schema({
  name: { type: String, required: true, unique: true },
  steps: [StepSchema],
});

module.exports = mongoose.model("routine", RoutineSchema);
