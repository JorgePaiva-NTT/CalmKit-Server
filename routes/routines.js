const express = require("express");
const router = express.Router();
const Routine = require("../models/Routine");

// @route   GET api/routines
// @desc    Get all routines
// @access  Public
router.get("/", async (req, res) => {
  try {
    const routines = await Routine.find().sort({ name: 1 });
    res.json(routines);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
