const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Log = require("../models/logs");

// Emotion base ratings (1-10 scale)
const emotionBaseRatings = {
  Happy: 9,
  Calm: 7,
  Neutral: 5,
  Anxious: 4,
  Sad: 3,
  Angry: 2,
};

// Calculate mood score for a single log
const calculateLogScore = (emotion, intensity) => {
  const baseRating = emotionBaseRatings[emotion] || 5;
  const intensityEffect = (intensity - 5) * 0.4;
  return Math.max(1, Math.min(10, baseRating + intensityEffect));
};

// Calculate daily mood score with time decay
const calculateDailyMoodScore = (logs) => {
  if (logs.length === 0) return null;

  // Sort logs by time
  const sortedLogs = logs.sort((a, b) => new Date(a.time) - new Date(b.time));
  const firstLogTime = new Date(sortedLogs[0].time);

  let weightedSum = 0;
  let totalWeight = 0;

  sortedLogs.forEach((log) => {
    const logScore = calculateLogScore(log.emotion, log.intensity);
    const hoursSinceFirst =
      (new Date(log.time) - firstLogTime) / (1000 * 60 * 60);
    const weight = 1 + hoursSinceFirst * 0.1; // 10% more weight per hour

    weightedSum += logScore * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : null;
};

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

    await Log.findByIdAndDelete(req.params.id);

    res.json({ msg: "Log removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/logs/mood-trends/:year/:month
// @desc    Get daily mood scores for a specific month
// @access  Private
router.get("/mood-trends/:year/:month", auth, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const logs = await Log.find({
      user: req.user.id,
      time: { $gte: startDate, $lte: endDate },
    }).sort({ time: 1 });

    const logsByDay = {};
    logs.forEach((log) => {
      const day = new Date(log.time).getDate();
      if (!logsByDay[day]) {
        logsByDay[day] = [];
      }
      logsByDay[day].push(log);
    });

    const dailyScores = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayLogs = logsByDay[day] || [];
      const moodScore = calculateDailyMoodScore(dayLogs);

      dailyScores.push({
        day,
        date: new Date(year, month - 1, day).toISOString().split("T")[0],
        moodScore: moodScore ? parseFloat(moodScore.toFixed(2)) : null,
        logCount: dayLogs.length,
        emotions: dayLogs.map((log) => ({
          emotion: log.emotion,
          intensity: log.intensity,
          time: log.time,
        })),
      });
    }

    res.json({
      year: parseInt(year),
      month: parseInt(month),
      dailyScores,
      monthAverage:
        dailyScores.filter((d) => d.moodScore !== null).length > 0
          ? parseFloat(
              (
                dailyScores.reduce((sum, d) => sum + (d.moodScore || 0), 0) /
                dailyScores.filter((d) => d.moodScore !== null).length
              ).toFixed(2)
            )
          : null,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
