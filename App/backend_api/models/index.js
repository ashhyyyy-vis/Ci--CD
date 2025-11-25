const sequelize = require("../config/db");
const Teacher = require("./Teacher");
const Student = require("./Student");
const Course = require("./Course");
const Session = require("./Session");
const Attendance = require("./Attendance");
const CourseStats = require("./CourseStats");
const StudentCourses = require("./StudentCourses");
const Class = require("./Class");
const SessionClass = require("./SessionClass");

// Relations

Teacher.hasMany(Course, { foreignKey: "teacherId" });
Course.belongsTo(Teacher, { foreignKey: "teacherId" });

Teacher.hasMany(Session, { foreignKey: "teacherId" });
Session.belongsTo(Teacher, { foreignKey: "teacherId" });

Course.hasMany(Session, { foreignKey: "courseId" });
Session.belongsTo(Course, { foreignKey: "courseId" });

Course.belongsToMany(Class, {
  through: CourseStats,
  foreignKey: "courseId",
  otherKey: "classId",
});

Class.belongsToMany(Course, {
  through: CourseStats,
  foreignKey: "classId",
  otherKey: "courseId",
});

CourseStats.belongsTo(Course, { foreignKey: "courseId" });
CourseStats.belongsTo(Class, { foreignKey: "classId" });
Course.hasMany(CourseStats, { foreignKey: "courseId" });
Class.hasMany(CourseStats, { foreignKey: "classId" });

Student.belongsToMany(Course, {
  through: StudentCourses,
  foreignKey: "studentId",
});
Course.belongsToMany(Student, {
  through: StudentCourses,
  foreignKey: "courseId",
});

Student.hasMany(Attendance, { foreignKey: "studentId" });
Attendance.belongsTo(Student, { foreignKey: "studentId" });

Session.hasMany(Attendance, { foreignKey: "sessionId" });
Attendance.belongsTo(Session, { foreignKey: "sessionId" });

Session.belongsToMany(Class, {
  through: SessionClass,
  foreignKey: "sessionId",
  otherKey: "classId",
});
Class.belongsToMany(Session, {
  through: SessionClass,
  foreignKey: "classId",
  otherKey: "sessionId",
});

Student.belongsTo(Class, { foreignKey: "classId", as: "class" });
Class.hasMany(Student, { foreignKey: "classId", as: "students" });

Session.belongsToMany(Class, {
  through: SessionClass,
  foreignKey: "sessionId",
});
Class.belongsToMany(Session, {
  through: SessionClass,
  foreignKey: "classId",
});

// Sync models to the database
(async () => {
  try {
    await sequelize.sync();
    console.log("All models synced successfully");
  } catch (error) {
    console.error("Model sync failed:", error);
  }
})();

module.exports = {
  sequelize,
  Attendance,
  Class,
  Course,
  CourseStats,
  Session,
  SessionClass,
  Student,
  StudentCourses,
  Teacher,
};
