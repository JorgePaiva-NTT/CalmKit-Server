const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Log = require("../models/logs");
const User = require("../models/User");
const crypto = require("crypto");

function b64encode(buf) {
  return Buffer.from(buf).toString("base64");
}
function b64decode(b64) {
  return Buffer.from(b64, "base64");
}
function decryptJSON(cipher, keyBuf) {
  if (!cipher || cipher.alg !== "AES-GCM")
    throw new Error("Unsupported cipher");
  const iv = b64decode(cipher.iv);
  const ctWithTag = b64decode(cipher.ct);
  const tag = ctWithTag.slice(ctWithTag.length - 16);
  const ct = ctWithTag.slice(0, ctWithTag.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuf, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}
function encryptJSON(obj, keyBuf) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuf, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const ctWithTag = Buffer.concat([ct, tag]);
  return { v: 1, alg: "AES-GCM", iv: b64encode(iv), ct: b64encode(ctWithTag) };
}

const emotionBaseRatings = {
  Happy: 9,
  Calm: 7,
  Neutral: 5,
  Anxious: 4,
  Sad: 3,
  Angry: 2,
};

const calculateLogScore = (emotion, intensity) => {
  const baseRating = emotionBaseRatings[emotion] || 5;
  const intensityEffect = (intensity - 5) * 0.4;
  return Math.max(1, Math.min(10, baseRating + intensityEffect));
};

const calculateDailyMoodScore = (logs) => {
  if (logs.length === 0) return null;

  const sortedLogs = logs
    .slice()
    .sort((a, b) => new Date(a.time) - new Date(b.time));
  const firstLogTime = new Date(sortedLogs[0].time);

  let weightedSum = 0;
  let totalWeight = 0;

  sortedLogs.forEach((log) => {
    const base =
      typeof log.moodScore === "number" && !Number.isNaN(log.moodScore)
        ? log.moodScore
        : calculateLogScore(log.emotion, log.intensity);
    const hoursSinceFirst =
      (new Date(log.time) - firstLogTime) / (1000 * 60 * 60);
    const weight = 1 + hoursSinceFirst * 0.1;
    weightedSum += base * weight;
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
    const user = await User.findById(req.user.id).lean();
    let keyBuf = null;
    if (user?.encKey) keyBuf = b64decode(user.encKey);
    const plainLogs = logs.map((doc) => {
      let plain = null;
      if (doc.cipher && keyBuf) {
        try {
          plain = decryptJSON(doc.cipher, keyBuf);
        } catch (e) {
          plain = null;
        }
      }
      if (!plain) {
        plain = {
          trigger: doc.trigger || "",
          emotion: doc.emotion || "",
          intensity: typeof doc.intensity === "number" ? doc.intensity : 5,
          anchor: doc.anchor || "",
          time: doc.time,
          moodScore: doc.moodScore,
        };
      }
      return { _id: doc._id, ...plain };
    });
    res.json(plainLogs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/logs
// @desc    Add new log
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const {
      trigger = "",
      emotion = "",
      intensity = 5,
      anchor = "",
      time,
    } = req.body || {};
    const user = await User.findById(req.user.id).lean();
    const keyBuf = user?.encKey ? b64decode(user.encKey) : null;
    const plain = {
      trigger: String(trigger),
      emotion: String(emotion),
      intensity:
        typeof intensity === "number" ? intensity : Number(intensity) || 5,
      anchor: String(anchor),
      time: time ? new Date(time) : new Date(),
    };
    const mood = calculateLogScore(plain.emotion, plain.intensity);
    const doc = { user: req.user.id, moodScore: mood };
    if (keyBuf) {
      doc.cipher = encryptJSON({ ...plain, moodScore: mood }, keyBuf);
    } else {
      doc.trigger = plain.trigger;
      doc.emotion = plain.emotion;
      doc.intensity = plain.intensity;
      doc.anchor = plain.anchor;
    }
    const saved = await new Log(doc).save();
    res.json({ _id: saved._id, ...plain, moodScore: mood });
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
        emotions: dayLogs
          .filter((log) => typeof log.emotion === "string" && log.emotion)
          .map((log) => ({
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
