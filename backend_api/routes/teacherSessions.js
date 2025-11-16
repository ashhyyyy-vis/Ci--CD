const express = require("express");
const { auth } = require("../middleware/authMiddleware");
const {
  Course,
  Session,
  Attendance,
  SessionClass,
  CourseStats,
  Class,
} = require("../models");
const { Op } = require("sequelize");
const redis = require("../config/redis");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

// Run cleanup before each session
router.use(async (req, res, next) => {
  await cleanupExpiredSessions();
  next();
});

// GET teacher courses and classes under that course
router.get("/courses", auth(["teacher"]), async (req, res) => {
  try {
    const courses = await Course.findAll({
      where: { teacherId: req.user.id },
      include: [
        {
          model: Class,
          through: {
            attributes: ["totalClasses"], // from CourseStats
          },
        },
      ],
    });

    res.json({ success: true, courses });
  } catch (err) {
    console.error("Teacher Courses Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// POST start a session
router.post("/start", auth(["teacher"]), async (req, res) => {
  try {
    const { courseId, classIds, duration = 3 } = req.body; //duration in minutes

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const session = await Session.create({
      id: uuidv4(),
      courseId,
      teacherId: req.user.id,
      startTime,
      endTime,
      active: true,
    });

    //store session -> class
    for (const classId of classIds) {
      await SessionClass.create({
        id: uuidv4(),
        sessionId: session.id,
        classId,
      });

      //incrementing total for each class
      await CourseStats.increment("totalClasses", {
        where: { courseId, classId },
      });
    }

    // redis store cache for fast access
    await redis.set(
      `activeSession:${session.id}`,
      JSON.stringify({
        teacherId: req.user.id,
        courseId,
        classIds,
        startTime,
        endTime,
      }),
      "EX",
      duration * 60 // expire after duration
    );

    res.json({ success: true, session });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET QR (generate dynamic QR token)
router.get("/:sessionId/qr", auth(["teacher"]), async (req, res) => {
  try {
    const { sessionId } = req.params;

    const sessionActive = await redis.get(`activeSession:${sessionId}`);
    if (!sessionActive)
      return res.status(400).json({
        success: false,
        message: "Session is inactive or has expired",
      });

    const nonce = uuidv4();
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 500; // QR expiry 500 seconds
    const qrPayload = { sessionId, nonce, iat, exp };
    const qrToken = jwt.sign(qrPayload, process.env.QR_JWT_SECRET);

    await redis.set(
      `qr:${nonce}`,
      JSON.stringify({ sessionId, iat, exp }),
      "EX",
      520 // 500 seconds + 20 extra seconds in redis
    ); // Store nonce with 65 seconds expiry

    res.json({
      success: true,
      qrToken,
      validFrom: iat * 1000,
      validTo: exp * 1000,
    });
  } catch (error) {
    console.error("QR generation Error: ", error);
    res.status(500).json({ success: false, message: "QR generation Error" });
  }
});

//GET live attendance
router.get("/:sessionId/live", auth(["teacher"]), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentIds = await redis.smembers(`liveAttendance:${sessionId}`);
    res.json({ success: true, presentStudents: studentIds });
  } catch (error) {
    console.error("Live attendance Error: ", error);
    res.status(500).json({ success: false, message: "Live attendance Error" });
  }
});

//POST extend session
router.post("/:sessionId/extend", auth(["teacher"]), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { extraMinutes } = req.body;

    const session = await Session.findByPk(sessionId);
    if (!session || !session.active)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or inactive session" });
    const newEnd = new Date(session.endTime.getTime() + extraMinutes * 60000);
    session.endTime = newEnd;
    await session.save();

    await redis.expire(`activeSession:${session.id}`, extraMinutes * 60);

    res.json({ success: true, message: "Session extended", newEnd });
  } catch (error) {
    console.error("Extend session Error: ", error);
    res.status(500).json({ success: false, message: "Extend session Error" });
  }
});

// Post end session
router.post("/:sessionId/end", auth(["teacher"]), async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findByPk(sessionId);
    if (!session || !session.active)
      return res
        .status(400)
        .json({ success: false, message: "Session not found" });

    session.active = false;
    session.endTime = new Date();
    await session.save();

    const studentIds = await redis.smembers(`liveAttendance:${sessionId}`);
    for (const sid of studentIds) {
      await Attendance.findOrCreate({
        where: { sessionId, studentId: sid },
        defaults: { markedAt: new Date() },
      });
    }
    await redis.del(`activeSession:${sessionId}`);
    await redis.del(`liveAttendance:${sessionId}`);
    res.json({
      success: true,
      message: "Session closed Successfully",
    });
  } catch (error) {
    console.error("End session Error: ", error);
    res.status(500).json({ success: false, message: "End session Error" });
  }
});

// Auto Cleanup of expired sessions
async function cleanupExpiredSessions() {
  try {
    const now = new Date();
    const expiredSessions = await Session.findAll({
      where: {
        active: true,
        endTime: { [Op.lt]: now },
      },
    });
    for (const session of expiredSessions) {
      session.active = false;
      await session.save();
      const studentIds = await redis.smembers(`liveAttendance:${session.id}`);
      for (const sid of studentIds) {
        await Attendance.findOrCreate({
          where: { sessionId: session.id, studentId: sid },
          defaults: { markedAt: new Date() },
        });
      }
      // Clean Redis
      await redis.del(`activeSession:${session.id}`);
      await redis.del(`liveAttendance:${session.id}`);
      //console.log(`Cleaned up expired session ${session.id}`);
    }
  } catch (error) {
    console.error("Cleanup Error: ", error);
  }
}

module.exports = router;
