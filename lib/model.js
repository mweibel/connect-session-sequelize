/**
 * Session Model
 */
module.exports = function (sequelize, DataTypes) {
  return sequelize.define('Session', {
    sid: {
      type: DataTypes.STRING(36),
      primaryKey: true
    },
    expires: DataTypes.DATE,
    data: DataTypes.TEXT
  })
}
