
var assert = require('assert')
  , path = require('path')
	, session = require('express-session')
	, SequelizeStore = require('../lib/connect-session-sequelize')(session.Store)
	, Sequelize = require('sequelize');

describe('connect-session-middleware', function() {
  var db = new Sequelize('session_test', 'test', '12345', {
      dialect: 'sqlite'
      , logging: false
    })
    , store = new SequelizeStore({db: db})
    , sessionId = '1234a'
    , sessionData = {foo: 'bar', 'baz': 42};

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

describe('connect-session-sequelize', function() {
  	var db = {};
	beforeEach(function() {
    		db = new Sequelize('session_test', 'test', '12345', { dialect: 'sqlite', logging: false }),
    		db.import(path.join(__dirname, 'resources/model'));
	});

  	it('should take a specific table from Sequelize DB', function() {
    		assert.ok(db.models.TestSession, 'Session model added to Sequelize Object');
    		var store = new SequelizeStore({db: db, table: 'TestSession'});
    		assert.equal(store.sessionModel.name, 'TestSession');
  	});

  	it('should load the default model if No Table is specified in options', function() {
    		var store = new SequelizeStore({db: db});
    		assert.equal(store.sessionModel.name, 'Session');
  	});
});
