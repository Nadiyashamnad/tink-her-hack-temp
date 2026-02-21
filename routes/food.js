const express = require("express");
const Food = require("../models/Food");
// const auth = require("../middleware/authMiddleware");
const { GUEST_USER_ID } = require("../config/constants");

const router = express.Router();

router.post("/add", async (req, res) => {
    try {
        const food = await Food.create({
            ...req.body,
            userId: GUEST_USER_ID
        });
        res.json(food);
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

router.get("/", async (req, res) => {
    try {
        const data = await Food.findAll({
            where: { userId: GUEST_USER_ID },
            order: [['date', 'DESC']]
        });
        res.json(data);
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const food = await Food.findOne({ where: { id: req.params.id, userId: GUEST_USER_ID } });
        if (!food) return res.status(404).json({ msg: "Not found" });

        await food.destroy();
        res.json({ msg: "Removed" });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

module.exports = router;
