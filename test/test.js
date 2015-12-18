var assert = require('assert')
  , session = require('express-session')
  , path = require('path')
  , SequelizeStore = require('../lib/connect-session-sequelize')(session.Store)
  , Sequelize = require('sequelize');

Sequelize.Promise.longStackTraces();

var db = new Sequelize('session_test', 'test', '12345', {
    dialect: 'sqlite'
    , logging: false
  })
  , store = new SequelizeStore({db: db})
  , sessionId = '1234a'
  , sessionData = {foo: 'bar', 'baz': 42};

describe('store', function() {
  before(function() {
    return store.sync();
  });
  it('should have no length', function(done) {
    store.length(function(_err, c) {
      assert.equal(0, c);
      done();
    });
  });
});

describe('store db', function() {
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

describe('#set()', function() {
  before(function() {
    return store.sync();
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
            assert.ok(!err, '#destroy() got an error');
            done();
          });
        });
      });
    });
  });
  it('should have a future expires', function(done) {
    store.set(sessionId, sessionData, function(err, session) {
      assert.ok(!err, '#set() got an error');
      assert.ok(session, '#set() is not ok');

      assert.ok(session.expires, '.expires does not exist');
      assert.ok(session.expires instanceof Date, '.expires is not a date');
      assert.ok(session.expires > new Date(), '.expires is not in the future');

      store.destroy(sessionId, function(err) {
        assert.ok(!err, '#destroy() got an error');
        done();
      });
    });
  });
});

describe('#touch()', function() {
  before(function() {
    return store.sync();
  });
  it('should update the expires', function(done) {
    store.set(sessionId, sessionData, function(err, session) {
      assert.ok(!err, '#set() got an error');
      assert.ok(session, '#set() is not ok');

      var firstExpires = session.expires;
      store.touch(sessionId, sessionData, function(err) {
        assert.ok(!err, '#touch() got an error');

        store.sessionModel.find({where: {'sid': sessionId}}).then(function(session) {
          assert.ok(session.expires.getTime() !== firstExpires.getTime(), '.expires has not changed');
          assert.ok(session.expires > firstExpires, '.expires is not newer');

          store.destroy(sessionId, function(err) {
            assert.ok(!err, '#destroy() got an error');
            done();
          });
        }, function(err) {
          assert.ok(!err, 'store.sessionModel.find() got an error');
          done(err);
        });
      });
    });
  });
});

describe('#clearExpiredSessions()', function() {
  before(function() {
    return store.sync();
  });
  it('should delete expired sessions', function(done) {
    store.set(sessionId, sessionData, function(err, session) {
      assert.ok(!err, '#set() got an error');
      assert.ok(session, '#set() is not ok');

      session.expires = new Date(Date.now() - 3600000);
      session.save().then(function() {
        store.clearExpiredSessions(function(err) {
          assert.ok(!err, '#clearExpiredSessions() got an error');

          store.length(function(err, c) {
            assert.ok(!err, '#length() got an error');
            assert.equal(0, c, "the expired session wasn't deleted");
            done();
          });
        });
      }, function(err) {
        assert.ok(!err, 'session.save() got an error');
        done(err);
      });
    });
  });
});
