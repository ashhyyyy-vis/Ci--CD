const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Teacher = sequelize.define(
  "Teacher",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    facultyId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: /^ID-[A-Z]-\d{3}$/i, // Pattern: ID-A-017
      },
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    department: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    profilePic: {
      type: DataTypes.BLOB("long"),
      allowNull: true,
    },
  },
  { timestamps: true }
);

module.exports = Teacher;
