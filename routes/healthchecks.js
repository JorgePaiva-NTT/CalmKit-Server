const express = require("express");
const router = express.Router();
const Anchor = require("../models/Anchor");

router.get("/", async (req, res) => {
  try {
    console.log("Healthcheck route hit: GET /api/health"); // Log when the healthcheck route is accessed
    // Check mongo connection
    await Anchor.find();
    res.status(200).send("Mongo access OK");
  } catch (err) {
    console.error("Healthcheck Mongo access error:", err.message); // More specific error logging
    res.status(500).send("Mongo access NOT OK");
  }
});

module.exports = router;
