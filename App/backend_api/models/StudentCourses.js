const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StudentCourses = sequelize.define("StudentCourses", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  courseId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

module.exports = StudentCourses;
