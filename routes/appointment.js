const express = require("express");
const Appointment = require("../models/Appointment");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/book", auth, async (req, res) => {
  const appt = new Appointment({ ...req.body, userId: req.user.id });
  await appt.save();
  res.json(appt);
});

router.get("/", auth, async (req, res) => {
  const data = await Appointment.find({ userId: req.user.id });
  res.json(data);
});

module.exports = router;