const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Teacher, Student, Class } = require("../models");
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

    // according to the role match em
    if (role === "teacher") user = await Teacher.findOne({ where: { email } });
    else if (role === "student")
      user = await Student.findOne({
        where: { email },
        include: [{ model: Class, as: "class" }],
      });
    else
      return res.status(400).json({ success: false, message: "Invalid Role." });

    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User Not Found." });

    // psswd validation
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res
        .status(401)
        .json({ success: false, message: "Invalid Password." });

    // token for that session
    const token = jwt.sign({ id: user.id, role }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });

    const profilePicBase64 = user.profilePic
      ? user.profilePic.toString("base64")
      : null;

    const userData =
      role === "teacher"
        ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            facultyId: user.facultyId,
            department: user.department,
            profilePic: profilePicBase64,
            role,
          }
        : {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            MIS: user.MIS,
            year: user.year,
            semester: user.semester,
            department: user.department,
            profilePic: profilePicBase64,
            role,
            class: user.class
              ? {
                  classId: user.class.id,
                  name: user.class.name,
                  code: user.class.code,
                  description: user.class.description,
                }
              : null,
          };
    res.json({
      success: true,
      serverTime: Date.now(),
      data: {
        token,
        user: userData,
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
      role,
      firstName,
      lastName,
      email,
      password,
      department,
      MIS,
      year,
      semester,
      facultyId,
      branch,
    } = req.body;

    if (!role || !firstName || !lastName || !email || !password || !department)
      return res
        .status(400)
        .json({ success: false, message: "Missing fields." });

    const passwordHash = await bcrypt.hash(password, 10);

    let user;

    if (role === "teacher") {
      if (!facultyId)
        return res
          .status(400)
          .json({ success: false, message: "facultyId required." });

      user = await Teacher.create({
        firstName,
        lastName,
        email,
        facultyId,
        department,
        passwordHash,
      });
    } else if (role === "student") {
      if (!MIS || !year || !semester || !branch)
        return res.status(400).json({
          success: false,
          message: "MIS, year, branch & semester are required for students.",
        });

      user = await Student.create({
        firstName,
        lastName,
        email,
        MIS,
        year,
        semester,
        department,
        passwordHash,
        branch,
      });
    } else {
      return res.status(400).json({ success: false, message: "Invalid role." });
    }

    return res.json({
      success: true,
      message: "User registered successfully.",
      id: user.id,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
