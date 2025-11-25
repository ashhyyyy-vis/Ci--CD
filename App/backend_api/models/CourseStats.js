const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Class = require("./Class");

const CourseStats = sequelize.define("CourseStats", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  courseId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  classId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "classes", key: "id" },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },
  totalClasses: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

module.exports = CourseStats;
