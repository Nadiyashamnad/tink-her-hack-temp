const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config({ override: true });

const authRoutes = require("./routes/auth");
const periodRoutes = require("./routes/period");
const appointmentRoutes = require("./routes/appointment");
const foodRoutes = require("./routes/food");

const app = express();

const path = require("path");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.use(cors());
app.use(express.json());

// Serve static files from the 'cyclesense' directory
app.use(express.static(path.join(__dirname, "cyclesense")));

app.use("/api/auth", authRoutes);
app.use("/api/period", periodRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/food", foodRoutes);

// Catch-all route to serve the SPA index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "cyclesense", "index.html"));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
