const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to DB
mongoose.connect(process.env.MONGO_URI).catch((err) => console.log(err));

// Define Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/logs", require("./routes/logs"));
app.use("/api/anchors", require("./routes/anchors"));
app.use("/api/routines", require("./routes/routines"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/health", require("./routes/healthchecks"));
app.use("/api/passphrase", require("./routes/passphrase"));
app.use("/api/factors", require("./routes/factors"));

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "localhost"; // Use HOST from env, fallback to localhost
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
