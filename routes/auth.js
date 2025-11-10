const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Anchor = require("../models/Anchor");
const { anchors: seedAnchors, routines: seedRoutines } = require("../calmData");

// @route   POST api/auth/register
// @desc    Register a user
router.post("/register", async (req, res) => {
  const { email, password, username } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }
    user = new User({ email, password, username, avatarColor: randomColor() });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    // count the user anchors, if zero, seed the database
    const anchorCount = await Anchor.countDocuments({ user: user.id });
    if (anchorCount === 0) {
      console.log("No anchors found, seeding database...");
      const anchorsToSeed = Object.entries(seedAnchors).flatMap(
        ([group, list]) =>
          list.map((text) => ({
            user: user.id,
            text,
            group,
            isFavorite: false,
            favoriteRank: null,
          }))
      );
      await Anchor.insertMany(anchorsToSeed);
      console.log("Anchors seeded successfully.");
    }

    const payload = { user: { id: user.id } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatarColor: user.avatarColor,
          },
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // 1. Find user by email
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // 2. Compare password with bcrypt.compare()
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // 3. If valid, sign and return JWT
    const payload = { user: { id: user.id } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatarColor: user.avatarColor,
          },
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

function randomColor() {
  const colors = [
    "#F44336", // Red
    "#E91E63", // Pink
    "#9C27B0", // Purple
    "#673AB7", // Deep Purple
    "#3F51B5", // Indigo
    "#2196F3", // Blue
    "#03A9F4", // Light Blue
    "#00BCD4", // Cyan
    "#009688", // Teal
    "#4CAF50", // Green
    "#8BC34A", // Light Green
    "#CDDC39", // Lime
    "#FFEB3B", // Yellow
    "#FFC107", // Amber
    "#FF9800", // Orange
    "#FF5722", // Deep Orange
    "#795548", // Brown
    "#9E9E9E", // Grey
    "#607D8B", // Blue Grey
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

module.exports = router;
