const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

router.get("/me", auth, async (req, res) => {
  // #swagger.tags = ['User']
  // #swagger.summary = 'Get current user info'
  // #swagger.security = [{ "bearerAuth": [] }]
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(500).send("Server Error");
  }
  res.json({ user: req.user });
});

router.put("/avatar", auth, async (req, res) => {
  // #swagger.tags = ['User']
  // #swagger.summary = 'Update avatar color'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = {
    in: 'body',
    description: 'Avatar data',
    required: true,
    schema: {
      color: '#4A9093'
    }
  } */
  try {
    const { color } = req.body;
    if (!color) {
      return res.status(400).json({ msg: "Color is required" });
    }

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
