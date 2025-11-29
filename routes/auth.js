const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Anchor = require("../models/Anchor");
const auth = require("../middleware/auth");
const { anchors: seedAnchors } = require("../calmData");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.get("/me", auth, async (req, res) => {
  // #swagger.tags = ['Authentication']
  // #swagger.summary = 'Get current user data'
  // #swagger.security = [{ "bearerAuth": [] }]
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatarColor: user.avatarColor || "#4A9093",
      },
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/register", async (req, res) => {
  // #swagger.tags = ['Authentication']
  // #swagger.summary = 'Register a new user'
  // #swagger.description = 'Create a new user account and receive JWT token'
  /* #swagger.parameters['body'] = {
    in: 'body',
    description: 'User registration info',
    required: true,
    schema: {
      email: 'user@example.com',
      password: 'password123',
      username: 'johndoe'
    }
  } */
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
            isUserCreated: false,
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

router.post("/login", async (req, res) => {
  // #swagger.tags = ['Authentication']
  // #swagger.summary = 'Authenticate user and get JWT token'
  /* #swagger.parameters['body'] = {
    in: 'body',
    description: 'Login credentials',
    required: true,
    schema: {
      email: 'user@example.com',
      password: 'password123'
    }
  } */
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email: { $eq: email } });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
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

router.post("/google", async (req, res) => {
  // #swagger.tags = ['Authentication']
  // #swagger.summary = 'Authenticate with Google'
  const { token } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      user = new User({
        email,
        username: name,
        googleId,
        avatarColor: randomColor(),
      });
      await user.save();
      await seedUserAnchors(user);
    }

    const payload = { user: { id: user.id } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 360000 },
      (err, jwtToken) => {
        if (err) throw err;
        res.json({
          token: jwtToken,
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
    console.error("Google Auth Error:", err);
    res.status(400).json({ msg: "Google authentication failed" });
  }
});

async function seedUserAnchors(user) {
  const anchorCount = await Anchor.countDocuments({ user: user.id });
  if (anchorCount === 0) {
    console.log("No anchors found, seeding database...");
    const anchorsToSeed = Object.entries(seedAnchors).flatMap(([group, list]) =>
      list.map((text) => ({
        user: user.id,
        text,
        group,
        isFavorite: false,
        favoriteRank: null,
        isUserCreated: false,
      }))
    );
    await Anchor.insertMany(anchorsToSeed);
    console.log("Anchors seeded successfully.");
  }
}

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
