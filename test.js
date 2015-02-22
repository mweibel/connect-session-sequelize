
var assert = require('assert')
	, session = require('express-session')
	, SequelizeStore = require('./lib/connect-session-sequelize')(session.Store)
	, Sequelize = require('sequelize');

var db = new Sequelize('session_test', 'test', '12345', {
		dialect: 'sqlite'
		, logging: false
	})
	, store = new SequelizeStore({db: db})
	, sessionId = '1234a'
	, sessionData = {foo: 'bar', 'baz': 42};

describe('connect-session-middleware', function() {
	before(function() {
		return store.sync();
	});
	it('should have no length', function() {
		store.length(function(_err, c) {
			assert.equal(0, c);
		});
	});
	it('should save the session', function() {
		store.set(sessionId, sessionData, function(err, session) {
			assert.ok(!err, '#set() got an error');
			assert.ok(session, '#set() is not ok');

			store.length(function(c) {
				assert.equals(1, c);

				store.get(sessionId, function(err, data) {
					assert.ok(!err, '#get() got an error');
					assert.deepEqual(sessionData, data);

					store.destroy(sessionId, function(err) {
						assert.ok(err, '#destroy() got an error');
					});
				});
			});
		});
	});
});