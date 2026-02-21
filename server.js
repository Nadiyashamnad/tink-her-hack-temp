const express = require("express");
const sequelize = require("./config/database");
const cors = require("cors");
require("dotenv").config({ override: true });

// const authRoutes = require("./routes/auth");
const periodRoutes = require("./routes/period");
const appointmentRoutes = require("./routes/appointment");
const foodRoutes = require("./routes/food");
const analysisRoutes = require("./routes/analysis");
const aiRoutes = require("./routes/ai");

const app = express();

const path = require("path");

// Sync Database & Models
sequelize.sync()
  .then(() => console.log("SQLite Database & Models Synced"))
  .catch(err => console.log("Sequelize Sync Error: ", err));

app.use(cors());
app.use(express.json());

// Serve static files from the 'cyclesense' directory
app.use(express.static(path.join(__dirname, "cyclesense")));

// app.use("/api/auth", authRoutes);
app.use("/api/period", periodRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/ai", aiRoutes);

// Catch-all route to serve the SPA index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "cyclesense", "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
