
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
	it('should have no length', function(done) {
		store.length(function(_err, c) {
			assert.equal(0, c);
			done();
		});
	});
	it('should save the session', function(done) {
		store.set(sessionId, sessionData, function(err, session) {
			assert.ok(!err, '#set() got an error');
			assert.ok(session, '#set() is not ok');

			store.length(function(err, c) {
				assert.ok(!err, '#length() got an error');
				assert.equal(1, c, '#length() is not 1');

				store.get(sessionId, function(err, data) {
					assert.ok(!err, '#get() got an error');
					assert.deepEqual(sessionData, data);

					store.destroy(sessionId, function(err) {
						assert.ok(err, '#destroy() got an error');
						done();
					});
				});
			});
		});
	});
});