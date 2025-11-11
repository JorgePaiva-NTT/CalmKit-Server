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
  time: {
    type: Number,
    default: 0,
  },
});

const RoutineSchema = new Schema({
  name: { type: String, required: true, unique: true },
  tags: { type: [String], default: [] },
  description: { type: String },
  icon: { type: String },
  steps: [StepSchema],
});

const RoutineTags = [
  "Breathing",
  "Journaling",
  "5-minute",
  "Meditation",
  "Mindfulness",
];

RoutineSchema.statics.getRoutineTags = function () {
  return RoutineTags;
};

module.exports = mongoose.model("routine", RoutineSchema);
