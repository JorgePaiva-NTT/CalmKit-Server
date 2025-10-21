const express = require("express");
const router = express.Router();
const Anchor = require("../models/Anchor");

router.get("/", async (req, res) => {
  try {
    // Check mongo connection
    await Anchor.find();
    res.status(200).send("Mongo access OK");
  } catch (err) {
    // More specific error logging
    res.status(500).send("Mongo access NOT OK", err.message);
  }
});

module.exports = router;
