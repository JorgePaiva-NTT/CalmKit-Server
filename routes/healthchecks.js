const express = require("express");
const router = express.Router();
const Anchor = require("../models/Anchor");

router.get("/", async (req, res) => {
  // #swagger.tags = ['Health']
  // #swagger.summary = 'Health check endpoint'
  // #swagger.description = 'Check API and database connectivity'
  try {
    await Anchor.find();
    res.status(200).send("Mongo access OK");
  } catch (err) {
    res.status(500).send("Mongo access NOT OK", err.message);
  }
});

module.exports = router;
