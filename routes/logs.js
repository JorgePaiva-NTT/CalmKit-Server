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

router.get("/", auth, async (req, res) => {
  // #swagger.tags = ['Logs']
  // #swagger.summary = 'Get all user logs'
  // #swagger.description = 'Get all emotion logs with optional date range filtering'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['startDate'] = {
    in: 'query',
    description: 'Filter logs from this date (ISO 8601)',
    type: 'string'
  } */
  /* #swagger.parameters['endDate'] = {
    in: 'query', 
    description: 'Filter logs until this date (ISO 8601)',
    type: 'string'
  } */
  try {
    const { startDate, endDate } = req.query;

    const query = { user: req.user.id };

    if (startDate || endDate) {
      query.time = {};
      if (startDate) {
        query.time.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.time.$lte = end;
      }
    }

    const logs = await Log.find(query).sort({ time: -1 });
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
          contributing: doc.contributing || [],
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

router.post("/", auth, async (req, res) => {
  // #swagger.tags = ['Logs']
  // #swagger.summary = 'Add new emotion log'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['body'] = {
    in: 'body',
    description: 'Log data',
    schema: {
      trigger: 'Meeting with boss',
      emotion: 'Anxious',
      intensity: 7,
      anchor: 'I am grounded',
      contributing: ['Stressed', 'Tired'],
      time: '2024-01-01T12:00:00.000Z'
    }
  } */
  try {
    const {
      trigger = "",
      emotion = "",
      intensity = 5,
      anchor = "",
      contributing = [],
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
      contributing: Array.isArray(contributing) ? contributing : [],
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
      doc.contributing = plain.contributing;
    }
    const saved = await new Log(doc).save();
    res.json({ _id: saved._id, ...plain, moodScore: mood });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

router.delete("/:id", auth, async (req, res) => {
  // #swagger.tags = ['Logs']
  // #swagger.summary = 'Delete a log'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['id'] = {
    in: 'path',
    description: 'Log ID',
    required: true,
    type: 'string'
  } */
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

router.get("/mood-trends/:year/:month", auth, async (req, res) => {
  // #swagger.tags = ['Logs']
  // #swagger.summary = 'Get daily mood trends for a specific month'
  // #swagger.description = 'Get daily logs and mood scores for calendar view'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['year'] = {
    in: 'path',
    description: 'Year (e.g., 2024)',
    required: true,
    type: 'integer'
  } */
  /* #swagger.parameters['month'] = {
    in: 'path',
    description: 'Month (1-12)',
    required: true,
    type: 'integer'
  } */
  try {
    const { year, month } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const logs = await Log.find({
      user: req.user.id,
      time: { $gte: startDate, $lte: endDate },
    }).sort({ time: 1 });

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
          intensity: typeof doc.intensity === "number" ? doc.intensity : 1,
          anchor: doc.anchor || "",
          time: doc.time,
          contributing: doc.contributing || [],
          moodScore: doc.moodScore,
        };
      }
      return { _id: doc._id, ...plain };
    });

    const logsByDay = {};
    plainLogs.forEach((log) => {
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
