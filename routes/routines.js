const express = require("express");
const router = express.Router();
const Routine = require("../models/Routine");

const auth = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  // #swagger.tags = ['Routines']
  // #swagger.summary = 'Get all routines'
  // #swagger.security = [{ "bearerAuth": [] }]
  try {
    const routines = await Routine.find().sort({ name: 1 });
    res.json(routines);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

router.post("/", auth, async (req, res) => {
  // #swagger.tags = ['Routines']
  // #swagger.summary = 'Create a new routine'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = {
    in: 'body',
    description: 'Routine data',
    required: true,
    schema: {
      name: 'Deep Breathing',
      description: 'A calming breathing exercise',
      icon: '🫁',
      tags: ['Breathing', 'Quick'],
      steps: [{ title: 'Prepare', text: 'Find a comfortable position', duration: 30 }]
    }
  } */
  const { name, tags, description, icon, steps } = req.body;

  if (!name || !steps) {
    return res.status(400).json({ msg: "Please provide name and steps" });
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ msg: "Steps must be a non-empty array" });
  }
  steps.forEach((step) => {
    if (!step.title || !step.text) {
      return res
        .status(400)
        .json({ msg: "Each step must have a title and text" });
    }
  });

  // Validate tags
  // Can be empty or an array of valid tags
  const validTags = Routine.getRoutineTags();
  if (tags) {
    if (!Array.isArray(tags)) {
      return res.status(400).json({ msg: "Tags must be an array" });
    }
    for (let tag of tags) {
      if (!validTags.includes(tag)) {
        return res.status(400).json({ msg: `Invalid tag: ${tag}` });
      }
    }
  }

  try {
    let routine = new Routine({
      name,
      tags,
      description,
      icon,
      steps,
    });

    await routine.save();
    res.json(routine);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
