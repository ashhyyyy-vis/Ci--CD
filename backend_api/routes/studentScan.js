const express = require("express");
const jwt = require("jsonwebtoken");
const { auth } = require("../middleware/authMiddleware");
const redis = require("../config/redis");
const { Session, Attendance, Student, SessionClass } = require("../models");
require("dotenv").config();

const router = express.Router();

// Time limits for scan validation
const CLOCK_SKEW_MS = 500 * 1000; // 500 seconds for backward drift
const LATE_WINDOW_MS = 500 * 1000; // 500 sec late scan allowance
const MAX_DELAY_MS = 500 * 1000; // 500 sec network delay allowance

// const CLOCK_SKEW_MS = 2000;   // allow 2 sec drift max
// const LATE_WINDOW_MS = 2000;  // allow max 2 sec late scan
// const MAX_DELAY_MS = 4000;    // allow 4 sec delay max

// POST /api/student/scan
router.post("/scan", auth(["student"]), async (req, res) => {
  try {
    const { qrToken, scannedAt } = req.body;
    if (!qrToken || !scannedAt)
      return res.status(400).json({
        success: false,
        message: "qrToken and scannedAt are required",
      });

    const clientScannedAt = Number(scannedAt);
    if (Number.isNaN(clientScannedAt))
      return res
        .status(400)
        .json({ success: false, message: "Invalid scannedAt timestamp" });

    // Verify QR token
    let decoded;
    try {
      decoded = jwt.verify(qrToken, process.env.QR_JWT_SECRET);
    } catch (error) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired QR token" });
    }

    const { sessionId, nonce, iat, exp } = decoded;

    // check if session is active in redis or DB
    const activeSession = await redis.get(`activeSession:${sessionId}`);
    if (!activeSession) {
      const session = await Session.findByPk(sessionId);
      if (!session || !session.active) {
        return res.status(400).json({
          success: false,
          message: "Session is inactive or has expired",
        });
      }
    }

    // verify the QR metadata in redis
    const qrMeta = await redis.get(`qr:${nonce}`);
    if (qrMeta) {
      const data = JSON.parse(qrMeta);
      if (data.sessionId !== sessionId)
        return res
          .status(400)
          .json({ success: false, message: "QR token session mismatch" });
    }

    // Time based Validation
    const tokenIatMs = iat * 1000;
    const tokenExpMs = exp * 1000;
    const now = Date.now();

    const lowerBound = tokenIatMs - CLOCK_SKEW_MS;
    const upperBound = tokenExpMs + LATE_WINDOW_MS;

    if (clientScannedAt < lowerBound || clientScannedAt > upperBound)
      return res.status(400).json({
        success: false,
        message: "QR scan time is outside the valid window",
      });
    if (now - clientScannedAt > MAX_DELAY_MS)
      return res.status(400).json({
        success: false,
        message: "QR scan submission delayed beyond acceptable limit",
      });

    // ---- CLASS VALIDATION ----
    const student = await Student.findByPk(req.user.id);
    if (!student || !student.classId) {
      return res.status(400).json({
        success: false,
        message: "Student class information missing",
      });
    }

    // Fetch all allowed classIds for this session
    const allowedClasses = await SessionClass.findAll({
      where: { sessionId },
      attributes: ["classId"],
    });

    const allowedClassIds = allowedClasses.map((c) => c.classId);

    // Check if student belongs to the allowed classes
    if (!allowedClassIds.includes(student.classId)) {
      return res.status(403).json({
        success: false,
        message: "You are not part of the class for this session",
      });
    }

    // Mark attendance
    const studentId = req.user.id;
    await Attendance.findOrCreate({
      where: { sessionId, studentId },
      defaults: { timestamp: new Date(clientScannedAt) },
    });

    // Live attendance to redis
    await redis.sadd(`liveAttendance:${sessionId}`, studentId);

    return res.json({
      success: true,
      message: "Attendance marked successfully",
      sessionId,
    });
  } catch (error) {
    console.error("Scan Error: ", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during scan processing",
    });
  }
});

module.exports = router;
