const sequelize = require("../config/db");
const Teacher = require("./Teacher");
const Student = require("./Student");
const Course = require("./Course");
const Session = require("./Session");
const Attendance = require("./Attendance");

Teacher.hasMany(Course, { foreignKey: "teacherId" });
Course.belongsTo(Teacher, { foreignKey: "teacherId" });

Teacher.hasMany(Session, { foreignKey: "teacherId" });
Session.belongsTo(Teacher, { foreignKey: "teacherId" });

Course.hasMany(Session, { foreignKey: "courseId" });
Session.belongsTo(Course, { foreignKey: "courseId" });

Student.hasMany(Attendance, { foreignKey: "studentId" });
Attendance.belongsTo(Student, { foreignKey: "studentId" });

Session.hasMany(Attendance, { foreignKey: "sessionId" });
Attendance.belongsTo(Session, { foreignKey: "sessionId" });

// Sync models to the database
(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("All models synced successfully");
  } catch (error) {
    console.error("Model sync failed:", error);
  }
})();

module.exports = {
  sequelize,
  Teacher,
  Student,
  Course,
  Session,
  Attendance,
};
