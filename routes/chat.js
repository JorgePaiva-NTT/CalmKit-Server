const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");
const auth = require("../middleware/auth"); // Assuming you want to keep it private
const AiSettings = require("../models/AiSettings");

// Initialize the SDK with the API key from server environment variables
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// @route   POST api/chat
// @desc    Send a message to the AI
// @access  Private (or Public if you remove auth)
router.post("/", auth, async (req, res) => {
  const { message, history } = req.body;
  const aiSettings = await AiSettings.findOne();
  if (!message) {
    return res.status(400).json({ msg: "Please provide a message" });
  }

  try {
    const result = await genAI.models.generateContent({
      model: aiSettings ? aiSettings.model : "gemini-2.5-flash",
      contents: [
        ...(history || []),
        { role: "user", parts: [{ text: message }] },
      ],
      config: {
        systemInstruction: aiSettings.persona,
      },
      generationConfig: {
        maxOutputTokens: aiSettings ? aiSettings.maxOutputTokens : 32000,
        temperature: aiSettings ? aiSettings.temperature : 0.7,
        topP: aiSettings ? aiSettings.topP : 0.9,
      },
    });

    const text = result.text;

    res.json({ text });
  } catch (error) {
    res.status(500).send(error.message || "Server Error");
  }
});

module.exports = router;
