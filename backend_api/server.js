const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();
const { sequelize } = require("./models");
const authRoutes = require("./routes/auth");

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Authentication routes
app.use("/api/auth", authRoutes);

// Teacher session routes
const teacherSessionRoutes = require("./routes/teacherSessions");
app.use("/api/teacher/sessions", teacherSessionRoutes);

// Student scan routes
const studentScanRoutes = require("./routes/studentScan");
app.use("/api/student", studentScanRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  await sequelize.authenticate();
  console.log(`Server is running on port ${PORT}`);
});
