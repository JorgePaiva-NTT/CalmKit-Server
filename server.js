const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const seedDatabase = require("./seed");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    seedDatabase();
  })
  .catch((err) => console.log(err));

// Define Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/logs", require("./routes/logs"));
app.use("/api/anchors", require("./routes/anchors"));
app.use("/api/routines", require("./routes/routines"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, "127.0.0.1", () =>
  console.log(`Server started on port ${PORT}`)
);
