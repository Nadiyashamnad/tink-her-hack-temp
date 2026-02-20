const express = require("express");
const Food = require("../models/Food");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// Add food log
router.post("/add", auth, async (req, res) => {
    try {
        const food = new Food({
            ...req.body,
            userId: req.user.id
        });
        await food.save();
        res.json(food);
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

// Get user food history
router.get("/", auth, async (req, res) => {
    try {
        const data = await Food.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(data);
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

// Delete food item
router.delete("/:id", auth, async (req, res) => {
    try {
        const food = await Food.findById(req.params.id);
        if (!food) return res.status(404).json({ msg: "Not found" });
        if (food.userId.toString() !== req.user.id) return res.status(401).json({ msg: "Unauthorized" });

        await food.deleteOne();
        res.json({ msg: "Removed" });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

module.exports = router;
