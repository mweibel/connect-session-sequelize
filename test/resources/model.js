var Sequelize = require('sequelize')

/*
 * Used to test custom table loading
 */
module.exports = function (sequelize) {
  return sequelize.define('TestSession', {
    sid: {
      type: Sequelize.DataTypes.STRING,
      primaryKey: true
    },
    userId: Sequelize.DataTypes.STRING,
    expires: Sequelize.DataTypes.DATE,
    data: Sequelize.DataTypes.STRING(50000)
  })
}
