const mongoose = require("mongoose");

const FoodSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    category: { type: String, enum: ['healthy', 'junk', 'sugar', 'caffeine'], required: true },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Food", FoodSchema);
