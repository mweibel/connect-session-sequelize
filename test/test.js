/* global describe,before,beforeEach,after,afterEach,it */

const assert = require('assert')
const session = require('express-session')
const path = require('path')
const SequelizeStore = require('../lib/connect-session-sequelize')(session.Store)
const Sequelize = require('sequelize')

const db = new Sequelize('session_test', 'test', '12345', {
  dialect: 'sqlite',
  logging: false
})
const store = new SequelizeStore({
  db,
  // the expiration check interval is removed up in an `after` block
  checkExpirationInterval: 100
})
const sessionId = '1234a'
const sessionData = { foo: 'bar', baz: '42' }

after('clean up resources, allowing tests to terminate', function () {
  store.stopExpiringSessions()
})

describe('store', function () {
  before(function () {
    return store.sync()
  })
  it('should have no length', function (done) {
    store.length(function (_err, c) {
      assert.strictEqual(0, c)
      done()
    })
  })
})

describe('store db', function () {
  let db = {}
  beforeEach(function () {
    db = new Sequelize('session_test', 'test', '12345', { dialect: 'sqlite', logging: false })
    require(path.join(__dirname, 'resources/model'))(db, Sequelize.DataTypes)
  })

  it('should take a specific table from Sequelize DB', function () {
    assert.ok(db.models.TestSession, 'Session model added to Sequelize Object')
    const store = new SequelizeStore({ db, table: 'TestSession', checkExpirationInterval: -1 })
    assert.strictEqual(store.sessionModel.name, 'TestSession')
  })

  it('should load the default model if No Table is specified in options', function () {
    const store = new SequelizeStore({ db, checkExpirationInterval: -1 })
    assert.strictEqual(store.sessionModel.name, 'Session')
  })

  it('should use the default model key if not specified in options', function () {
    const store = new SequelizeStore({ db, checkExpirationInterval: -1 })
    assert.strictEqual(store.sessionModel.name, 'Session')
  })

  it('should use an explicit model key', function () {
    const store = new SequelizeStore({ db, modelKey: 'CustomSessionModel', checkExpirationInterval: -1 })
    assert.strictEqual(store.sessionModel.name, 'CustomSessionModel')
  })

  it('should use the default table name if not specified in options', function () {
    const store = new SequelizeStore({ db, checkExpirationInterval: -1 })
    assert.strictEqual(store.sessionModel.tableName, 'Sessions')
  })

  it('should use an explicit table name', function () {
    const store = new SequelizeStore({ db, tableName: 'CustomSessionsTable', checkExpirationInterval: -1 })
    assert.strictEqual(store.sessionModel.tableName, 'CustomSessionsTable')
  })

  it('should use explicit model/table options', function () {
    const store = new SequelizeStore({ db, modelKey: 'CustomSessionModel', tableName: 'CustomSessionsTable', checkExpirationInterval: -1 })
    assert.strictEqual(store.sessionModel.name, 'CustomSessionModel')
    assert.strictEqual(store.sessionModel.tableName, 'CustomSessionsTable')
  })
})

describe('#set()', function () {
  before(function () {
    return store.sync()
  })
  it('should save the session', function (done) {
    store.set(sessionId, sessionData, function (err, session) {
      assert.ok(!err, '#set() got an error')
      assert.ok(session, '#set() is not ok')

      store.length(function (err, c) {
        assert.ok(!err, '#length() got an error')
        assert.strictEqual(1, c, '#length() is not 1')

        store.get(sessionId, function (err, data) {
          assert.ok(!err, '#get() got an error')
          assert.deepStrictEqual(sessionData, data)

          store.destroy(sessionId, function (err) {
            assert.ok(!err, '#destroy() got an error')
            done()
          })
        })
      })
    })
  })
  it('should have a future expires', function (done) {
    store.set(sessionId, sessionData, function (err, session) {
      assert.ok(!err, '#set() got an error')
      assert.ok(session, '#set() is not ok')

      assert.ok(session.expires, '.expires does not exist')
      assert.ok(session.expires instanceof Date, '.expires is not a date')
      assert.ok(session.expires > new Date(), '.expires is not in the future')

      store.destroy(sessionId, function (err) {
        assert.ok(!err, '#destroy() got an error')
        done()
      })
    })
  })
  it('should have model instance methods', function (done) {
    store.set(sessionId, sessionData, function (err, session) {
      assert.ok(!err, '#set() got an error')
      assert.ok(session, '#set() is not ok')

      assert.ok(session.dataValues)
      assert.ok(session.update)
      assert.ok(session.save)

      store.destroy(sessionId, function (err) {
        assert.ok(!err, '#destroy() got an error')
        done()
      })
    })
  })
})

describe('extendDefaultFields', function () {
  let db, store
  before(function () {
    function extend (defaults, session) {
      defaults.userId = session.baz
      return defaults
    }

    db = new Sequelize('session_test', 'test', '12345', { dialect: 'sqlite', logging: console.log })
    require(path.join(__dirname, 'resources/model'))(db, Sequelize.DataTypes)
    store = new SequelizeStore({ db, table: 'TestSession', extendDefaultFields: extend, checkExpirationInterval: -1 })
    return store.sync()
  })
  it('should extend defaults when extendDefaultFields is set', function (done) {
    store.sync().then(function () {
      store.set(sessionId, sessionData, function (err, session) {
        assert.ok(!err, '#set() got an error')
        assert.ok(session, '#set() is not ok')

        db.models.TestSession.findOne({
          where: {
            userId: sessionData.baz
          }
        })
          .then(function (_session) {
            assert.ok(_session, 'session userId not saved')
            assert.deepStrictEqual(session.dataValues, _session.dataValues)

            store.destroy(sessionId, function (err) {
              assert.ok(!err, '#destroy() got an error')
              done()
            })
          })
      })
        .catch(function (err) {
          assert.ifError(err)
        })
    })
  })

  it('should update fields when extendDefaultFields is set', function (done) {
    store.set('testupdateFields', { foo: 'bar' }, function (err, session) {
      assert.ok(!err, '#set() got an error')
      assert.ok(session, '#set() is not ok')

      store.set('testupdateFields', { baz: 'baz', yolo: 'haha' }, function (err, innerSession) {
        assert.ok(!err, '#set() got an error')
        assert.ok(innerSession, '#set() is not ok')

        db.models.TestSession.findOne({
          where: {
            userId: 'baz'
          }
        })
          .then(function (_session) {
            assert.ok(_session, 'session userId not saved')
            assert.deepStrictEqual(innerSession.dataValues, _session.dataValues)

            store.destroy(sessionId, function (err) {
              assert.ok(!err, '#destroy() got an error')
              done()
            })
          })
      })
    })
  })
})

describe('#touch()', function () {
  before(function () {
    return store.sync()
  })
  it('should update the expires', function (done) {
    store.set(sessionId, sessionData, function (err, session) {
      assert.ok(!err, '#set() got an error')
      assert.ok(session, '#set() is not ok')

      const firstExpires = session.expires
      store.touch(sessionId, sessionData, function (err) {
        assert.ok(!err, '#touch() got an error')

        store.sessionModel.findOne({ where: { sid: sessionId } }).then(function (session) {
          assert.ok(session.expires.getTime() !== firstExpires.getTime(), '.expires has not changed')
          assert.ok(session.expires > firstExpires, '.expires is not newer')

          store.destroy(sessionId, function (err) {
            assert.ok(!err, '#destroy() got an error')
            done()
          })
        }, function (err) {
          assert.ok(!err, 'store.sessionModel.findOne() got an error')
          done(err)
        })
      })
    })
  })
})

describe('#disableTouch()', function () {
  before(function () {
    store.options.disableTouch = true
    return store.sync()
  })
  after('set disableTouch back to false.', function () {
    store.options.disableTouch = false
  })
  it('should NOT update the expires', function (done) {
    store.set(sessionId, sessionData, function (err, session) {
      assert.ok(!err, '#set() got an error')
      assert.ok(session, '#set() is not ok')

      const firstExpires = session.expires
      store.touch(sessionId, sessionData, function (err) {
        assert.ok(!err, '#touch() got an error')

        store.sessionModel.findOne({ where: { sid: sessionId } }).then(function (session) {
          assert.ok(session.expires.getTime() === firstExpires.getTime(), '.expires was incorrectly changed')

          store.destroy(sessionId, function (err) {
            assert.ok(!err, '#destroy() got an error')
            done()
          })
        }, function (err) {
          assert.ok(!err, 'store.sessionModel.findOne() got an error')
          done(err)
        })
      })
    })
  })
})

describe('#clearExpiredSessions()', function () {
  before(function () {
    return store.sync()
  })
  it('should delete expired sessions', function (done) {
    store.set(sessionId, sessionData, function (err, session) {
      assert.ok(!err, '#set() got an error')
      assert.ok(session, '#set() is not ok')

      session.expires = new Date(Date.now() - 3600000)
      session.save().then(function () {
        store.clearExpiredSessions(function (err) {
          assert.ok(!err, '#clearExpiredSessions() got an error')

          store.length(function (err, c) {
            assert.ok(!err, '#length() got an error')
            assert.strictEqual(0, c, 'the expired session wasn\'t deleted')
            done()
          })
        })
      }, function (err) {
        assert.ok(!err, 'session.save() got an error')
        done(err)
      })
    })
  })
})

describe('#stopExpiringSessions()', function () {
  let store
  beforeEach(function () {
    const db = new Sequelize(
      'session_test',
      'test',
      '12345',
      { dialect: 'sqlite', logging: false }
    )
    require(path.join(__dirname, 'resources/model'))(db, Sequelize.DataTypes)
    store = new SequelizeStore({
      db,
      table: 'TestSession',
      checkExpirationInterval: 100
    })
  })
  afterEach('clean up resources', function () {
    store.stopExpiringSessions()
  })
  it('should cancel the session check timer', function () {
    assert.ok(store._expirationInterval, 'missing timeout object')
    store.stopExpiringSessions()
    assert.strictEqual(store._expirationInterval, null, 'expiration interval not nullified')
  })
})
