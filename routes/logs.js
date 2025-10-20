const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Log = require("../models/logs");

// @route   GET api/logs
// @desc    Get all user's logs
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const logs = await Log.find({ user: req.user.id }).sort({ time: -1 });
    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/logs
// @desc    Add new log
// @access  Private
router.post("/", auth, async (req, res) => {
  const { trigger, emotion, intensity, anchor } = req.body;
  try {
    const newLog = new Log({
      trigger,
      emotion,
      intensity,
      anchor,
      user: req.user.id,
    });
    const log = await newLog.save();
    res.json(log);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE api/logs/:id
// @desc    Delete a log
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    let log = await Log.findById(req.params.id);
    if (!log) return res.status(404).json({ msg: "Log not found" });

    // Make sure user owns the log
    if (log.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    await Log.findByIdAndRemove(req.params.id);
    res.json({ msg: "Log removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
