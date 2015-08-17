/**
 * Session Model
 */
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Session', {
    sid: {
      type: DataTypes.STRING,
      primaryKey: true
    }
    , expires: {
      type: DataTypes.DATE,
      allowNull: true
    }
    , data: DataTypes.TEXT
  });
};