const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const Anchor = require("../models/AiSettings");
const AiSettings = require("../models/AiSettings");

// @route   GET api/ai-settings
// @desc    Get AI settings for a user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const aiSettings = await AiSettings.findOne();
    res.json(aiSettings);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// @route  PUT api/ai-settings
// @desc   Update AI settings for a user
// @access Private
router.put("/", auth, async (req, res) => {
  const { model, temperature, topP } = req.body;

  try {
    // get the first and only settings document
    // same for all users
    let aiSettings = await AiSettings.findOne();

    if (aiSettings) {
      // Update existing settings
      aiSettings.model = model || aiSettings.model;
      aiSettings.temperature = temperature || aiSettings.temperature;
      aiSettings.topP = topP || aiSettings.topP;

      await aiSettings.save();
      return res.json(aiSettings);
    }

    // Create new settings
    aiSettings = new AiSettings({
      user: req.user.id,
      model,
      temperature,
      topP,
    });

    await aiSettings.save();
    res.json(aiSettings);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});
