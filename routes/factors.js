const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

const DEFAULT_FACTORS = ["Grateful", "Stressed", "Productive", "Tired", "Excited"];

// @route   GET api/factors
// @desc    Get all factors (default + custom)
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("customFactors");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({
      defaultFactors: DEFAULT_FACTORS,
      customFactors: user.customFactors || []
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/factors
// @desc    Add a custom factor
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { factor } = req.body;
    if (!factor || typeof factor !== "string" || !factor.trim()) {
      return res.status(400).json({ msg: "Factor is required" });
    }

    const trimmedFactor = factor.trim();

    if (DEFAULT_FACTORS.includes(trimmedFactor)) {
      return res.status(400).json({ msg: "Factor already exists in default list" });
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
      customFactors: user.customFactors
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
