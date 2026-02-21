const express = require("express");
const Appointment = require("../models/Appointment");
// const auth = require("../middleware/authMiddleware");
const { GUEST_USER_ID } = require("../config/constants");

const router = express.Router();

router.post("/book", async (req, res) => {
  try {
    const appt = await Appointment.create({ ...req.body, userId: GUEST_USER_ID });
    res.json(appt);
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const data = await Appointment.findAll({ where: { userId: GUEST_USER_ID } });
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;