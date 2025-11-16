const express = require("express");
const { auth } = require("../middleware/authMiddleWare");
const {
  Student,
  Course,
  Attendance,
  Session,
  StudentCourses,
  CourseStats,
} = require("../models");

const router = express.Router();

// GET /api/report/student/:studentId
router.get("/student/:studentId", auth(["student"]), async (req, res) => {
  try {
    const { studentId } = req.params;

    // check to ensure only authorized student access their record
    if (req.user.id != studentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - cannot view another student's report",
      });
    }

    // fetch all courses student is enrolled in
    const enrolled = await StudentCourses.findAll({
      where: { studentId },
    });

    if (!enrolled.length) return res.json({ success: true, attendance: [] });

    // fetch course info
    const courseIds = enrolled.map((e) => e.courseId);
    const courses = await Course.findAll({ where: { id: courseIds } });

    //fetch attendance count per course
    const attendance = await Attendance.findAll({
      include: [
        {
          model: Session,
          attributes: ["courseId"],
        },
      ],
      where: { studentId },
    });

    // count per course
    const presentCount = {};
    attendance.forEach((a) => {
      const cid = a.Session.courseId;
      presentCount[cid] = (presentCount[cid] || 0) + 1;
    });

    // fetch total class count
    const stats = await CourseStats.findAll({
      where: { courseId: courseIds },
    });

    const totalMap = {};
    stats.forEach((s) => {
      totalMap[s.courseId] = s.totalClasses;
    });

    // build respose
    const report = courses.map((c) => {
      const present = presentCount[c.id] || 0;
      const total = totalMap[c.id] || 0;

      return {
        courseId: c.id,
        courseName: c.name,
        courseCode: c.code,
        present,
        total,
        percentage:
          total === 0 ? 0 : Number(((present / total) * 100).toFixed(2)),
      };
    });

    res.json({ success: true, attendance: report });
  } catch (err) {
    console.error("Student Report Error: ", err);
    res.status(500).json({ success: false, message: "Server Error." });
  }
});

// GET /api/report/session/:sessionId

router.get("/session/:sessionId", auth(["teacher"]), async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findByPk(sessionId, {
      include: [{ model: Course }],
    });

    if (!session)
      return res
        .status(404)
        .json({ sucess: false, message: "Session not found" });

    // fetch all attendance entries already marked
    const attendance = await Attendance.findAll({
      where: { sessionId },
      include: [{ model: Student }],
    });

    const presentStudents = attendance.map((a) => ({
      id: a.Student.id,
      firstName: a.Student.firstName,
      lastName: a.Student.lastName,
      MIS: a.Student.MIS,
      department: a.Student.department,
    }));

    res.json({
      success: true,
      sessionId,
      courseName: session.Course.name,
      presentStudents,
    });
  } catch (err) {
    console.error("Session Report Error: ", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
