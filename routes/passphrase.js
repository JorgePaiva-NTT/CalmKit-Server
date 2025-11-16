const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Log = require("../models/logs");
const User = require("../models/User");
const crypto = require("crypto");
const PassphraseJob = require("../models/PassphraseJob");

// Utility: base64 helpers
function b64encode(buf) {
  return Buffer.from(buf).toString("base64");
}
function b64decode(b64) {
  return Buffer.from(b64, "base64");
}

// Derive AES-256-GCM key from passcode + salt (PBKDF2-SHA256, 200k)
function deriveKey(passcode, saltB64) {
  const salt = b64decode(saltB64);
  const key = crypto.pbkdf2Sync(
    Buffer.from(String(passcode), "utf8"),
    salt,
    200000,
    32,
    "sha256"
  );
  return key;
}

// Decrypt WebCrypto-format {iv, ct} where ct includes GCM tag at the end
function decryptJSON(cipher, key) {
  if (!cipher || cipher.alg !== "AES-GCM")
    throw new Error("Unsupported cipher");
  const iv = b64decode(cipher.iv);
  const ctWithTag = b64decode(cipher.ct);
  const tag = ctWithTag.slice(ctWithTag.length - 16);
  const ct = ctWithTag.slice(0, ctWithTag.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

function encryptJSON(obj, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const ctWithTag = Buffer.concat([ct, tag]);
  return { v: 1, alg: "AES-GCM", iv: b64encode(iv), ct: b64encode(ctWithTag) };
}

async function startReencryptJob(jobId, userId, oldKey, newKey) {
  const job = await PassphraseJob.findById(jobId);
  if (!job) return;
  job.state = "running";
  job.startedAt = new Date();
  job.total = await Log.countDocuments({ user: userId });
  job.processed = 0;
  job.skipped = 0;
  job.errors = 0;
  await job.save();

  const cursor = Log.find({ user: userId }).cursor();
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    try {
      let plain = null;
      if (doc.cipher) {
        if (oldKey) {
          try {
            plain = decryptJSON(doc.cipher, oldKey);
          } catch (e) {
            try {
              plain = decryptJSON(doc.cipher, newKey);
              job.skipped += 1;
              await job.save();
              continue;
            } catch (e2) {
              job.skipped += 1;
              await job.save();
              continue;
            }
          }
        } else {
          try {
            plain = decryptJSON(doc.cipher, newKey);
            job.skipped += 1;
            await job.save();
            continue;
          } catch (e) {
            job.skipped += 1;
            await job.save();
            continue;
          }
        }
      } else {
        plain = {
          trigger: doc.trigger || "",
          emotion: doc.emotion || "",
          intensity: typeof doc.intensity === "number" ? doc.intensity : 5,
          anchor: doc.anchor || "",
          time: doc.time,
          moodScore: doc.moodScore,
        };
      }

      if (plain) {
        const newCipher = encryptJSON(plain, newKey);
        doc.cipher = newCipher;
        doc.trigger = "";
        doc.emotion = "";
        doc.intensity = undefined;
        doc.anchor = "";
        await doc.save();
        job.processed += 1;
        await job.save();
      }
    } catch (err) {
      job.errors += 1;
      job.lastError = err?.message?.slice(0, 300);
      await job.save();
      continue;
    }
  }

  job.state = "completed";
  job.finishedAt = new Date();
  await job.save();
}

// @route   PUT /api/passphrase
// @desc    Trigger server-side re-encryption of all user logs with new passcode
// @access  Private
router.put("/", auth, async (req, res) => {
  try {
    const { passcode, clientSalt } = req.body || {};
    if (!/^[0-9]{4}$/.test(String(passcode || "").trim())) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid passcode format" });
    }

    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ success: false, msg: "User not found" });

    if (!user.encSalt) {
      const serverSalt = crypto.randomBytes(16);
      user.encSalt = b64encode(serverSalt);
      await user.save();
    }

    const newKey = deriveKey(passcode, user.encSalt);
    const oldKey = clientSalt ? deriveKey(passcode, clientSalt) : null;

    user.encKey = b64encode(newKey);
    await user.save();

    const job = await new PassphraseJob({
      user: user._id,
      state: "pending",
      encVersionTarget: user.encVersion || 1,
    }).save();

    setImmediate(() => {
      startReencryptJob(job._id, user._id, oldKey, newKey).catch(async (e) => {
        try {
          const j = await PassphraseJob.findById(job._id);
          if (j) {
            j.state = "failed";
            j.lastError = e?.message?.slice(0, 300);
            j.finishedAt = new Date();
            await j.save();
          }
        } catch {}
      });
    });

    return res
      .status(202)
      .json({ success: true, started: true, jobId: job._id });
  } catch (err) {
    console.error("/api/passphrase error:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
});

// @route   GET /api/passphrase/status
// @desc    Get the latest passphrase migration job status for the current user
// @access  Private
router.get("/status", auth, async (req, res) => {
  try {
    const job = await PassphraseJob.findOne({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    if (!job) return res.json({ success: true, job: null });
    return res.json({ success: true, job });
  } catch (err) {
    console.error("/api/passphrase/status error:", err);
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
});

module.exports = router;
