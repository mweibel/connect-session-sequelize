/**
 * Session Model
 */
const DataTypes = require('sequelize').DataTypes

module.exports = {
  sid: {
    type: DataTypes.STRING(36),
    primaryKey: true
  },
  expires: DataTypes.DATE,
  data: DataTypes.TEXT
}
