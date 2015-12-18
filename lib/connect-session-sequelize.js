/**
 * Sequelize based session store.
 *
 * Author: Michael Weibel <michael.weibel@gmail.com>
 * License: MIT
 */

var util = require('util')
  , path = require('path')
  , debug = require('debug')('connect:session-sequelize')
  , defaultOptions = {
    checkExpirationInterval: 15 * 60 * 1000 // The interval at which to cleanup expired sessions.
    , expiration: 24 * 60 * 60 * 1000  // The maximum age (in milliseconds) of a valid session. Used when cookie.expires is not set.
  };


function SequelizeStoreException(message) {
  this.name = 'SequelizeStoreException';
  this.message = message;
  Error.call(this);
}
util.inherits(SequelizeStoreException, Error);

module.exports = function SequelizeSessionInit(Store) {
  function SequelizeStore(options) {
    options = options || {};
    if (!options.db) {
      throw new SequelizeStoreException('Database connection is required');
    }

    var key;
    this.options = defaultOptions;
    for (key in options) {
      if (key !== 'db') {
        this.options[key] = options[key];
      }
    }

    Store.call(this, options);

    this.startExpiringSessions();

    // Check if specific table should be used for DB connection
    if (options.table) {
      debug('Using table: %s for sessions', options.table);
      // Get Specifed Table from Sequelize Object
      this.sessionModel =  options.db[options.table] || options.db.models[options.table];
    } else {
      // No Table specified, default to ./model
      debug('No table specified, using default table.');
      this.sessionModel = options.db.import(path.join(__dirname, 'model'));
    }
  }

  util.inherits(SequelizeStore, Store);

  SequelizeStore.prototype.sync = function sync() {
    return this.sessionModel.sync();
  };

  SequelizeStore.prototype.get = function getSession(sid, fn) {
    debug('SELECT "%s"', sid);
    return this.sessionModel.find({where: {'sid': sid}}).then(function(session) {
      if(!session) {
        debug('Did not find session %s', sid);
        return null;
      }
      debug('FOUND %s with data %s', session.sid, session.data);

      return JSON.parse(session.data);
    }).asCallback(fn);
  };

  SequelizeStore.prototype.set = function setSession(sid, data, fn) {
    debug('INSERT "%s"', sid);
    var stringData = JSON.stringify(data)
      , expires;

    if (data.cookie && data.cookie.expires) {
      expires = data.cookie.expires;
    } else {
      expires = new Date(Date.now() + this.options.expiration);
    }

    return this.sessionModel.findOrCreate({where: {'sid': sid}, defaults: {'data': stringData, 'expires': expires}}).spread(function sessionCreated(session) {
      if(session['data'] !== stringData) {
        session['data'] = JSON.stringify(data);
        session['expires'] = expires;
        return session.save().return(data);
      }
      return session;
    }).asCallback(fn);
  };

  SequelizeStore.prototype.touch = function touchSession(sid, data, fn) {
    debug('TOUCH "%s"', sid);
    var expires;

    if (data.cookie && data.cookie.expires) {
      expires = data.cookie.expires;
    } else {
      expires = new Date(Date.now() + this.options.expiration);
    }

    return this.sessionModel.update({'expires': expires}, {where: {'sid': sid}}).return(null).asCallback(fn);
  };

  SequelizeStore.prototype.destroy = function destroySession(sid, fn) {
    debug('DESTROYING %s', sid);
    return this.sessionModel.find({where: {'sid': sid}}).then(function foundSession(session) {
      // If the session wasn't found, then consider it destroyed already.
      if (session === null) {
        debug('Session not found, assuming destroyed %s', sid);
        return null;
      }
      return session.destroy();
    }).asCallback(fn);
  };

  SequelizeStore.prototype.length = function calcLength(fn) {
    return this.sessionModel.count().asCallback(fn);
  };

  SequelizeStore.prototype.clearExpiredSessions = function clearExpiredSessions(fn) {
    debug('CLEARING EXPIRED SESSIONS');
    return this.sessionModel.destroy({where: {'expires': {lt: new Date()}}}).asCallback(fn);
  };

  SequelizeStore.prototype.startExpiringSessions = function startExpiringSessions() {
    // Don't allow multiple intervals to run at once.
    this.stopExpiringSessions();
    if (this.options.checkExpirationInterval > 0) {
      this._expirationInterval = setInterval(this.clearExpiredSessions.bind(this), this.options.checkExpirationInterval);
    }
  };

  SequelizeStore.prototype.stopExpiringSessions = function stopExpiringSessions() {
    if (this._expirationInterval) {
      clearInterval(this._expirationInterval);
    }
  };

  return SequelizeStore;
};
