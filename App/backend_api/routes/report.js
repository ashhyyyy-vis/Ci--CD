const express = require("express");
const { auth } = require("../middleware/authMiddleWare");
const {
  Student,
  Course,
  Attendance,
  Session,
  StudentCourses,
  CourseStats,
  Class,
} = require("../models");

const router = express.Router();

// GET /api/report/student/:studentId
router.get("/student/:studentId", auth(["student"]), async (req, res) => {
  try {
    const { studentId } = req.params;

    // Ensure students only access their own report
    if (req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view another student's report",
      });
    }

    // Fetch the student to get classId
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const classId = student.classId;

    // All courses where this student is enrolled (CourseStats maps course → class)
    const courseStats = await CourseStats.findAll({
      where: { classId },
      include: [{ model: Course }],
    });

    const report = [];

    for (const stat of courseStats) {
      const course = stat.Course;
      const totalClasses = stat.totalClasses;

      // Fetch all sessions of that course for this class
      const sessions = await Session.findAll({
        where: { courseId: course.id },
        include: [
          {
            model: Class,
            where: { id: classId }, // ensures session belongs to student's class
            through: { attributes: [] },
          },
        ],
        attributes: ["id"],
      });

      const sessionIds = sessions.map((s) => s.id);

      // Count attendance for student
      const presentCount = await Attendance.count({
        where: {
          studentId,
          sessionId: sessionIds,
        },
      });

      const percentage =
        totalClasses === 0
          ? 0
          : Number(((presentCount / totalClasses) * 100).toFixed(2));

      report.push({
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code,
        present: presentCount,
        total: totalClasses,
        percentage,
      });
    }

    return res.json({
      success: true,
      attendance: report,
    });
  } catch (err) {
    console.error("Student Report Error:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// GET /api/report/session/:sessionId
router.get("/session/:sessionId", auth(["teacher"]), async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findByPk(sessionId, {
      include: [{ model: Course }],
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // 1. Fetch all class IDs attached to session
    const classIds = session.classIds || []; // depends on your DB design

    // 2. Fetch all students in those classes
    const enrolledStudents = await Student.findAll({
      include: [
        {
          model: StudentCourses,
          where: { courseId: session.courseId },
          required: false,
        },
      ],
    });

    // 3. Fetch marked attendance
    const attendance = await Attendance.findAll({
      where: { sessionId },
    });

    const presentMap = {};
    attendance.forEach((a) => (presentMap[a.studentId] = true));

    // 4. Build full attendance list
    const report = enrolledStudents.map((stu) => ({
      id: stu.id,
      firstName: stu.firstName,
      lastName: stu.lastName,
      MIS: stu.MIS,
      department: stu.department,
      present: !!presentMap[stu.id],
    }));

    res.json({
      success: true,
      sessionId,
      course: {
        id: session.Course.id,
        name: session.Course.name,
        code: session.Course.code,
      },
      students: report,
    });
  } catch (err) {
    console.error("Session Report Error:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

module.exports = router;
