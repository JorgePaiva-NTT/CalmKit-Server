const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const AiSettings = require("../models/AiSettings");

router.get("/", auth, async (req, res) => {
  // #swagger.summary = 'Get AI settings'
  // #swagger.tags = ['AI Settings']
  try {
    const aiSettings = await AiSettings.findOne();
    res.json(aiSettings);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

router.put("/", auth, async (req, res) => {
  // #swagger.tags = ['AI Settings']
  // #swagger.summary = 'Update AI settings'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = {
    in: 'body',
    description: 'AI settings',
    schema: {
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      topP: 0.9
    }
  } */
  const { model, temperature, topP } = req.body;

  try {
    let aiSettings = await AiSettings.findOne();

    if (aiSettings) {
      aiSettings.model = model || aiSettings.model;
      aiSettings.temperature = temperature || aiSettings.temperature;
      aiSettings.topP = topP || aiSettings.topP;

      await aiSettings.save();
      return res.json(aiSettings);
    }

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

module.exports = router;
