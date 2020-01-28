/**
 * Sequelize based session store.
 *
 * Author: Michael Weibel <michael.weibel@gmail.com>
 * License: MIT
 */

const Op = require('sequelize').Op || {}
const defaultModel = require('./model')
const debug = require('debug')('connect:session-sequelize')
const defaultOptions = {
  checkExpirationInterval: 15 * 60 * 1000, // The interval at which to cleanup expired sessions.
  expiration: 24 * 60 * 60 * 1000, // The maximum age (in milliseconds) of a valid session. Used when cookie.expires is not set.
  disableTouch: false, // When true, we will not update the db in the touch function call. Useful when you want more control over db writes.
  modelKey: 'Session',
  tableName: null
}

class SequelizeStoreException extends Error {
  constructor (message) {
    super(message)
    this.name = 'SequelizeStoreException'
  }
}

module.exports = function SequelizeSessionInit (Store) {
  class SequelizeStore extends Store {
    constructor (options) {
      super(options)
      this.options = options = options || {}

      if (!options.db) {
        throw new SequelizeStoreException('Database connection is required')
      }

      this.options = Object.assign(defaultOptions, this.options)

      this.startExpiringSessions()

      // Check if specific table should be used for DB connection
      if (options.table) {
        debug('Using table: %s for sessions', options.table)
        // Get Specifed Table from Sequelize Object
        this.sessionModel =
          options.db[options.table] || options.db.models[options.table]
      } else {
        // No Table specified, default to ./model
        debug('No table specified, using default table.')
        const modelKey = options.modelKey || 'Session'
        this.sessionModel = options.db.define(modelKey, defaultModel, {
          tableName: options.tableName || modelKey
        })
      }
    }

    sync () {
      return this.sessionModel.sync()
    }

    get (sid, fn) {
      debug('SELECT "%s"', sid)
      return this.sessionModel
        .findOne({ where: { sid: sid } })
        .then(function (session) {
          if (!session) {
            debug('Did not find session %s', sid)
            return null
          }
          debug('FOUND %s with data %s', session.sid, session.data)

          return JSON.parse(session.data)
        })
        .asCallback(fn)
    }

    set (sid, data, fn) {
      debug('INSERT "%s"', sid)
      const stringData = JSON.stringify(data)
      const expires = this.expiration(data)

      let defaults = { data: stringData, expires: expires }
      if (this.options.extendDefaultFields) {
        defaults = this.options.extendDefaultFields(defaults, data)
      }

      return this.sessionModel
        .findCreateFind({
          where: { sid: sid },
          defaults: defaults,
          raw: false
        })
        .spread(function sessionCreated (session) {
          let changed = false
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
          return session
        })
        .asCallback(fn)
    }

    touch (sid, data, fn) {
      debug('TOUCH "%s"', sid)

      if (this.options.disableTouch) {
        debug('TOUCH skipped due to disableTouch "%s"', sid)
        return fn()
      }

      const expires = this.expiration(data)

      return this.sessionModel
        .update({ expires: expires }, { where: { sid: sid } })
        .then(function (rows) {
          return rows
        })
        .asCallback(fn)
    }

    destroy (sid, fn) {
      debug('DESTROYING %s', sid)
      return this.sessionModel
        .findOne({ where: { sid: sid }, raw: false })
        .then(function foundSession (session) {
          // If the session wasn't found, then consider it destroyed already.
          if (session === null) {
            debug('Session not found, assuming destroyed %s', sid)
            return null
          }
          return session.destroy()
        })
        .asCallback(fn)
    }

    length (fn) {
      return this.sessionModel.count().asCallback(fn)
    }

    clearExpiredSessions (fn) {
      debug('CLEARING EXPIRED SESSIONS')
      return this.sessionModel
        .destroy({ where: { expires: { [Op.lt || 'lt']: new Date() } } })
        .asCallback(fn)
    }

    startExpiringSessions () {
      // Don't allow multiple intervals to run at once.
      this.stopExpiringSessions()
      if (this.options.checkExpirationInterval > 0) {
        this._expirationInterval = setInterval(
          this.clearExpiredSessions.bind(this),
          this.options.checkExpirationInterval
        )
        // allow to terminate the node process even if this interval is still running
        this._expirationInterval.unref()
      }
    }

    stopExpiringSessions () {
      if (this._expirationInterval) {
        clearInterval(this._expirationInterval)
        // added as a sanity check for testing
        this._expirationInterval = null
      }
    }

    expiration (data) {
      if (data.cookie && data.cookie.expires) {
        return data.cookie.expires
      }
      return new Date(Date.now() + this.options.expiration)
    }
  }

  return SequelizeStore
}
