/**
 * Session Model with JSON data field
 */
const DataTypes = require('sequelize').DataTypes

module.exports = {
  sid: {
    type: DataTypes.STRING(36),
    primaryKey: true
  },
  expires: DataTypes.DATE,
  data: DataTypes.JSON
}
