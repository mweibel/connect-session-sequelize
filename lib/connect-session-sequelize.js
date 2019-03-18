/**
 * Sequelize based session store.
 *
 * Author: Michael Weibel <michael.weibel@gmail.com>
 * License: MIT
 */

var util = require('util')
var path = require('path')
var Op = require('sequelize').Op || {}
var debug = require('debug')('connect:session-sequelize')
var defaultOptions = {
  checkExpirationInterval: 15 * 60 * 1000, // The interval at which to cleanup expired sessions.
  expiration: 24 * 60 * 60 * 1000, // The maximum age (in milliseconds) of a valid session. Used when cookie.expires is not set.
  disableTouch: false, // When true, we will not update the db in the touch function call. Useful when you want more control over db writes.
  useCache: false
}

function SequelizeStoreException (message) {
  this.name = 'SequelizeStoreException'
  this.message = message
  Error.call(this)
}

util.inherits(SequelizeStoreException, Error)

module.exports = function SequelizeSessionInit (Store) {
  function SequelizeStore (options) {
    this.options = options = options || {}
    if (!options.db) {
      throw new SequelizeStoreException('Database connection is required')
    }

    for (var key in defaultOptions) {
      if (key in options === false) {
        this.options[key] = defaultOptions[key]
      }
    }

    Store.call(this, options)

    this.startExpiringSessions()

    // Check if specific table should be used for DB connection
    if (options.table) {
      debug('Using table: %s for sessions', options.table)
      // Get Specifed Table from Sequelize Object
      this.sessionModel = options.db[options.table] || options.db.models[options.table]
    } else {
      // No Table specified, default to ./model
      debug('No table specified, using default table.')
      this.sessionModel = options.db.import(path.join(__dirname, 'model'))
    }
    if (options.useCache) {
      debug('Using in memory cache for sessions')
      this.cache = {}
    }
  }

  util.inherits(SequelizeStore, Store)

  SequelizeStore.prototype.sync = function sync () {
    return this.sessionModel.sync()
  }

  SequelizeStore.prototype.get = function getSession (sid, fn) {
    debug('SELECT "%s"', sid)
    if (this.options.useCache && this.cache[sid]) {
      debug('FOUND "%s" in cache with data %s', sid, this.cache[sid].data)
      return require('sequelize')
        .Promise.resolve(JSON.parse(this.cache[sid].data))
        .asCallback(fn)
    }
    var self = this
    return this.sessionModel.findOne({ where: { 'sid': sid } }).then(function (session) {
      if (!session) {
        debug('Did not find session %s', sid)
        return null
      }
      debug('FOUND %s with data %s', session.sid, session.data)

      if (self.options.useCache) {
        debug('Setting cache with data for %s', session.sid)
        self.cache[sid] = session
      }
      return JSON.parse(session.data)
    }).asCallback(fn)
  }

  SequelizeStore.prototype.set = function setSession (sid, data, fn) {
    debug('INSERT "%s"', sid)
    var stringData = JSON.stringify(data)
    var expires

    var self = this
    if (data.cookie && data.cookie.expires) {
      expires = data.cookie.expires
    } else {
      expires = new Date(Date.now() + this.options.expiration)
    }

    var defaults = { 'data': stringData, 'expires': expires }
    if (this.options.extendDefaultFields) {
      defaults = this.options.extendDefaultFields(defaults, data)
    }

    return this.sessionModel.findCreateFind({ where: { 'sid': sid }, defaults: defaults, raw: false })
      .spread(function sessionCreated (session) {
        var changed = false
        Object.keys(defaults).forEach(function (key) {
          if (key === 'data') {
            return
          }

          if (session.dataValues[key] !== defaults[key]) {
            session[key] = defaults[key]
            changed = true
          }
        })
        if (session.data !== stringData) {
          session.data = JSON.stringify(data)
          changed = true
        }
        if (changed) {
          session.expires = expires
          return session.save().return(session)
        }
        if (self.options.useCache) {
          debug('Persisting "%s" in cache also', sid)
          self.cache[sid] = session
        }
        return session
      }).asCallback(fn)
  }

  SequelizeStore.prototype.touch = function touchSession (sid, data, fn) {
    debug('TOUCH "%s"', sid)

    if (this.options.disableTouch) {
      debug('TOUCH skipped due to disableTouch "%s"', sid)
      return fn()
    }

    var expires

    if (data.cookie && data.cookie.expires) {
      expires = data.cookie.expires
    } else {
      expires = new Date(Date.now() + this.options.expiration)
    }
    if (this.options.useCache) {
      debug('Modifying expiry for "%s" in cache also', sid)
      this.cache[sid].expires = expires
    }

    return this.sessionModel.update({ 'expires': expires }, { where: { 'sid': sid } }).then(function (rows) {
      return rows
    }).asCallback(fn)
  }

  SequelizeStore.prototype.destroy = function destroySession (sid, fn) {
    debug('DESTROYING %s', sid)
    if (this.options.useCache) {
      debug('Removing %s from cache', sid)
      delete this.cache[sid]
    }
    return this.sessionModel.findOne({ where: { 'sid': sid }, raw: false }).then(function foundSession (session) {
      // If the session wasn't found, then consider it destroyed already.
      if (session === null) {
        debug('Session not found, assuming destroyed %s', sid)
        return null
      }
      return session.destroy()
    }).asCallback(fn)
  }

  SequelizeStore.prototype.length = function calcLength (fn) {
    return this.sessionModel.count().asCallback(fn)
  }

  SequelizeStore.prototype.clearExpiredSessions = function clearExpiredSessions (fn) {
    debug('CLEARING EXPIRED SESSIONS')
    if (this.options.useCache) {
      for (const [sid, entry] of Object.entries(this.cache)) {
        if (entry.expires < new Date()) {
          delete this.cache[sid]
        }
      }
    }
    return this.sessionModel.destroy({ where: { 'expires': { [Op.lt || 'lt']: new Date() } } }).asCallback(fn)
  }

  SequelizeStore.prototype.startExpiringSessions = function startExpiringSessions () {
    // Don't allow multiple intervals to run at once.
    this.stopExpiringSessions()
    if (this.options.checkExpirationInterval > 0) {
      this._expirationInterval = setInterval(this.clearExpiredSessions.bind(this), this.options.checkExpirationInterval)
      // allow to terminate the node process even if this interval is still running
      this._expirationInterval.unref()
    }
  }

  SequelizeStore.prototype.stopExpiringSessions = function stopExpiringSessions () {
    if (this._expirationInterval) {
      clearInterval(this._expirationInterval)
      // added as a sanity check for testing
      this._expirationInterval = null
    }
  }

  return SequelizeStore
}
