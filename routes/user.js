const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// @route   GET api/user/me
// @desc    Get current user's info
// @access  Private
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(500).send("Server Error");
  }
  res.json({ user: req.user });
});

// @route   PUT api/user/avatar
// @desc    Update user's avatar color
// @access  Private
router.put("/avatar", auth, async (req, res) => {
  try {
    const { color } = req.body;
    if (!color) {
      return res.status(400).json({ msg: "Color is required" });
    }
    // Validate the color format (simple hex color code validation)
    // allow name colors as well
    if (
      typeof color !== "string" ||
      !/^#([0-9A-F]{3}){1,2}$/i.test(color) ||
      !/^[a-zA-Z]+$/.test(color)
    ) {
      return res.status(400).json({ msg: "Invalid color format" });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    user.avatarColor = color;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).send(res.err);
  }
});

module.exports = router;
