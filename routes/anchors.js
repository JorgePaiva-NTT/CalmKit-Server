const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const Anchor = require("../models/Anchor");

// @route   GET api/anchors
// @desc    Get all anchors for a user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const anchors = await Anchor.find({ user: req.user.id }).sort({
      group: 1,
      text: 1,
    });
    res.json(anchors);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/anchors/:id/toggle-favorite
// @desc    Toggle an anchor's favorite status
// @access  Private
router.post("/:id/toggle-favorite", auth, async (req, res) => {
  try {
    const anchor = await Anchor.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!anchor) {
      return res.status(404).json({ msg: "Anchor not found" });
    }

    // If it's already a favorite, unfavorite it.
    if (anchor.isFavorite) {
      anchor.isFavorite = false;
      anchor.favoriteRank = null;
      await anchor.save();
      return res.json(anchor);
    }

    // If it's not a favorite, make it one.
    // First, check how many favorites the user already has.
    const favoriteCount = await Anchor.countDocuments({
      user: req.user.id,
      isFavorite: true,
    });

    // If they have 3 or more, remove the oldest one.
    if (favoriteCount >= 3) {
      const oldestFavorite = await Anchor.findOne({
        user: req.user.id,
        isFavorite: true,
      }).sort({ favoriteRank: 1 });
      if (oldestFavorite) {
        oldestFavorite.isFavorite = false;
        oldestFavorite.favoriteRank = null;
        await oldestFavorite.save();
      }
    }

    // Now, favorite the new anchor.
    anchor.isFavorite = true;
    anchor.favoriteRank = Date.now();
    await anchor.save();

    res.json(anchor);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
