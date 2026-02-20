const mongoose = require("mongoose");

const PeriodSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  startDate: Date,
  endDate: Date,
  painLevel: Number,
  fatigueLevel: Number,
  mood: String,
  acne: Boolean,
  hairFall: Boolean,
  symptoms: [String] // still keeping for general tags
});

module.exports = mongoose.model("period", PeriodSchema);