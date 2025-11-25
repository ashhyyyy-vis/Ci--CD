const express = require("express");
const jwt = require("jsonwebtoken");
const { auth } = require("../middleware/authMiddleware");
const redis = require("../config/redis");
const { Session, Attendance, Student, SessionClass } = require("../models");
require("dotenv").config();

const router = express.Router();

// Time limits for scan validation
const CLOCK_SKEW_MS = 500 * 1000; // 500 seconds backward time drift allowed
const LATE_WINDOW_MS = 500 * 1000; // 500 sec late scan allowance
const MAX_DELAY_MS = 500 * 1000; // 500 sec network delay allowed

// POST /api/student/scan
router.post("/scan", auth(["student"]), async (req, res) => {
  try {
    const { qrToken, scannedAt } = req.body;

    if (!qrToken || !scannedAt) {
      return res.status(400).json({
        success: false,
        message: "qrToken and scannedAt are required",
      });
    }

    const clientScannedAt = Number(scannedAt);
    if (Number.isNaN(clientScannedAt)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid scannedAt timestamp" });
    }

    // Verify QR token
    let decoded;
    try {
      decoded = jwt.verify(qrToken, process.env.QR_JWT_SECRET);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired QR token",
      });
    }

    const { sessionId, nonce, iat, exp } = decoded;

    // Check if session is active in redis or DB
    const activeSession = await redis.get(`activeSession:${sessionId}`);

    let sessionRecord = null;

    if (!activeSession) {
      // Fallback to DB
      sessionRecord = await Session.findByPk(sessionId);
      if (!sessionRecord || !sessionRecord.active) {
        return res.status(400).json({
          success: false,
          message: "Session is inactive or has expired",
        });
      }
    } else {
      sessionRecord = JSON.parse(activeSession);
    }

    // Verify QR metadata stored in redis
    const qrMeta = await redis.get(`qr:${nonce}`);
    if (qrMeta) {
      const data = JSON.parse(qrMeta);
      if (data.sessionId !== sessionId) {
        return res.status(400).json({
          success: false,
          message: "QR token session mismatch",
        });
      }
    }

    // Time-based validation
    const tokenIatMs = iat * 1000;
    const tokenExpMs = exp * 1000;
    const now = Date.now();

    const lowerBound = tokenIatMs - CLOCK_SKEW_MS;
    const upperBound = tokenExpMs + LATE_WINDOW_MS;

    if (clientScannedAt < lowerBound || clientScannedAt > upperBound) {
      return res.status(400).json({
        success: false,
        message: "QR scan time is outside the valid window",
      });
    }

    if (now - clientScannedAt > MAX_DELAY_MS) {
      return res.status(400).json({
        success: false,
        message: "QR scan submission delayed beyond acceptable limit",
      });
    }

    // ---- CLASS VALIDATION ----
    const student = await Student.findByPk(req.user.id);

    if (!student || !student.classId) {
      return res.status(400).json({
        success: false,
        message: "Student class information missing",
      });
    }

    const allowedClasses = await SessionClass.findAll({
      where: { sessionId },
      attributes: ["classId"],
    });

    const allowedClassIds = allowedClasses.map((c) => c.classId);

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
      defaults: { markedAt: new Date(clientScannedAt) },
    });

    // Add to Redis live attendance
    await redis.sadd(`liveAttendance:${sessionId}`, studentId);

    // -------------------------------------------------
    // ✅ SEND SESSION END TIME IN UNIX TIMESTAMP (ms)
    // -------------------------------------------------
    const sessionEndTime =
      sessionRecord.endTime instanceof Date
        ? sessionRecord.endTime.getTime()
        : new Date(sessionRecord.endTime).getTime();

    return res.json({
      success: true,
      message: "Attendance marked successfully",
      sessionId,
      sessionEndTime, // ⬅ returned here
    });
  } catch (error) {
    console.error("Scan Error: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during scan processing",
    });
  }
});

module.exports = router;
