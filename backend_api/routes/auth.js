const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Teacher, Student } = require("../models");
const router = express.Router();

// POST /api/auth/login
router.post("/login/", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role)
      return res
        .status(400)
        .json({ success: false, message: "Missing Credentials." });

    let user;
    if (role === "teacher") user = await Teacher.findOne({ where: { email } });
    else if (role === "student")
      user = await Student.findOne({ where: { email } });
    else
      return res.status(400).json({ success: false, message: "Invalid Role." });
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User Not Found." });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res
        .status(401)
        .json({ success: false, message: "Invalid Password." });

    const token = jwt.sign({ id: user.id, role }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
        },
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Server Error." });
  }
});

// POST /api/auth/register (for testing purposes)
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      enrollmentNumber,
      year,
      semester,
      department,
    } = req.body;
    if (
      !name ||
      !email ||
      !password ||
      !role ||
      // !year ||
      // !semester ||
      !department
    )
      return res
        .status(400)
        .json({ success: false, message: "Missing Fields." });
    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    if (role === "teacher") {
      user = await Teacher.create({ name, email, passwordHash, department });
    } else if (role === "student") {
      if (!enrollmentNumber || !year || !semester) {
        return res
          .status(400)
          .json({ success: false, message: "Missing Fields." });
      }
      user = await Student.create({
        name,
        email,
        passwordHash,
        enrollmentNumber,
        year,
        semester,
        department,
      });
    } else {
      return res.status(400).json({ success: false, message: "Invalid Role." });
    }

    res.json({
      success: true,
      message: "User Registered Successfully.",
      id: user.id,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ success: false, message: "Server Error." });
  }
});

module.exports = router;
