const express = require("express");
const Period = require("../models/Period");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// Add period data
router.post("/add", auth, async (req, res) => {
  const entry = new Period({
    ...req.body,
    userId: req.user.id
  });

  await entry.save();
  res.json(entry);
});

// Get user period history
router.get("/", auth, async (req, res) => {
  const data = await Period.find({ userId: req.user.id });
  res.json(data);
});

module.exports = router;