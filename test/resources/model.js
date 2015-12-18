/*
 * Used to test custom table loading
 */
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('TestSession', {
    sid: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    expires: DataTypes.DATE,
    data: DataTypes.STRING(50000)
  });
};
