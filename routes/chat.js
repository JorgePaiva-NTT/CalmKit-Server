const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");
const auth = require("../middleware/auth");
const AiSettings = require("../models/AiSettings");

// Initialize the SDK with the API key from server environment variables
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.post("/", auth, async (req, res) => {
  // #swagger.tags = ['Chat']
  // #swagger.summary = 'Send message to AI coach'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = {
    in: 'body',
    description: 'Chat data',
    required: true,
    schema: {
      message: 'How can I manage my anxiety?',
      history: [],
      logContext: {
        emotion: 'Anxious',
        intensity: 7,
        trigger: 'Work meeting'
      }
    }
  } */
  const { message, history, logContext } = req.body;
  const aiSettings = await AiSettings.findOne();
  if (!message) {
    return res.status(400).json({ msg: "Please provide a message" });
  }

  try {
    const contents = [...(history || [])];

    if (logContext) {
      const logTime = new Date(logContext.time).toLocaleString("en-US", {
        dateStyle: "long",
        timeStyle: "short",
      });

      const contextParts = [
        `The user wants to discuss the following emotional log entry:`,
        `- Date/Time: ${logTime}`,
        `- Emotion: ${logContext.emotion}`,
        `- Intensity: ${logContext.intensity}/10`,
      ];

      if (logContext.trigger) {
        contextParts.push(`- What triggered this: ${logContext.trigger}`);
      }
      if (logContext.anchor) {
        contextParts.push(`- Anchor phrase they used: "${logContext.anchor}"`);
      }
      if (logContext.contributing && logContext.contributing.length > 0) {
        contextParts.push(
          `- Contributing factors: ${logContext.contributing.join(", ")}`
        );
      }

      contextParts.push(
        `\nPlease help them reflect on and process this experience.`
      );

      const contextMessage = contextParts.join("\n");

      contents.push({ role: "user", parts: [{ text: contextMessage }] });
    }

    contents.push({ role: "user", parts: [{ text: message }] });

    const result = await genAI.models.generateContent({
      model: aiSettings ? aiSettings.model : "gemini-2.5-flash",
      contents,
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
