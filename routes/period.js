const express = require("express");
const Period = require("../models/Period");
// const auth = require("../middleware/authMiddleware");
const { GUEST_USER_ID } = require("../config/constants");

const router = express.Router();

router.post("/add", async (req, res) => {
  console.log("2S")
  try {
    const period = await Period.create({ ...req.body, userId: GUEST_USER_ID });
    res.json(period);
    console.log(res)
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const data = await Period.findAll({
      where: { userId: GUEST_USER_ID },
      order: [['startDate', 'DESC']]
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;