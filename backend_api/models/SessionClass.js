const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Class = require("./Class");
const Session = require("./Session");

const SessionClass = sequelize.define(
  "SessionClass",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Session, key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    classId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Class, key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  },
  { tableName: "SessionClasses", timestamps: true }
);

module.exports = SessionClass;
