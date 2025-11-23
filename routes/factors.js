const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

const DEFAULT_FACTORS = [
  "Grateful",
  "Stressed",
  "Productive",
  "Tired",
  "Excited",
];

router.get("/", auth, async (req, res) => {
  // #swagger.tags = ['Factors']
  // #swagger.summary = 'Get all factors'
  // #swagger.security = [{ "bearerAuth": [] }]
  try {
    const user = await User.findById(req.user.id).select("customFactors");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({
      defaultFactors: DEFAULT_FACTORS,
      customFactors: user.customFactors || [],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

router.post("/", auth, async (req, res) => {
  // #swagger.tags = ['Factors']
  // #swagger.summary = 'Add a custom factor'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = {
    in: 'body',
    description: 'Factor data',
    required: true,
    schema: {
      factor: 'Energized'
    }
  } */
  try {
    const { factor } = req.body;
    if (!factor || typeof factor !== "string" || !factor.trim()) {
      return res.status(400).json({ msg: "Factor is required" });
    }

    const trimmedFactor = factor.trim();

    if (DEFAULT_FACTORS.includes(trimmedFactor)) {
      return res
        .status(400)
        .json({ msg: "Factor already exists in default list" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.customFactors.includes(trimmedFactor)) {
      return res.status(400).json({ msg: "Factor already exists" });
    }

    user.customFactors.push(trimmedFactor);
    await user.save();

    res.json({
      defaultFactors: DEFAULT_FACTORS,
      customFactors: user.customFactors,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
