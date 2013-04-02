/**
 * Session Model
 */
module.exports = function(sequelize, DataTypes) {
	return sequelize.define('Session', {
		sid: {
			type: DataTypes.STRING,
			primaryKey: true
		}
		, data: DataTypes.TEXT
	});
};