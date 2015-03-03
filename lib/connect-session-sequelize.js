/**
 * Sequelize based session store.
 *
 * Author: Michael Weibel <michael.weibel@gmail.com>
 * License: MIT
 */

var util = require('util')
	, path = require('path')
	, debug = require('debug')('connect:session-sequelize');


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
		Store.call(this, options);

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
		this.sessionModel.find({where: {'sid': sid}}).then(function(session) {
			if(!session) {
				debug('Did not find session %s', sid);
				return fn();
			}
			debug('FOUND %s with data %s', session.sid, session.data);
			try {
				var data = JSON.parse(session.data);
				debug('Found %s', data);
				fn(null, data);
			} catch(e) {
				debug('Error parsing data: %s', e);
				return fn(e);
			}
		}).catch(function(error) {
			debug('Error finding session: %s', error);
			fn(error);
		});
	};

	SequelizeStore.prototype.set = function setSession(sid, data, fn) {
		debug('INSERT "%s"', sid);
		var stringData = JSON.stringify(data);
		this.sessionModel.findOrCreate({where: {'sid': sid}, defaults: {'data': stringData}}).spread(function sessionCreated(session) {
			if(session['data'] !== stringData) {
				session['data'] = JSON.stringify(data);
				session.save().then(function updated(session) {
					if (fn) {
						fn(null, data);
					}
				}).catch(function errorUpdating(error) {
					debug('Error updating session: %s', error);
					if (fn) {
						fn(error);
					}
				});
			} else {
				fn(null, session);
			}
		}, function sessionCreatedError(error) {
			debug('Error creating session: %s', error);
			if (fn) {
				fn(error);
			}
		});
	};

	SequelizeStore.prototype.destroy = function destroySession(sid, fn) {
		debug('DESTROYING %s', sid);
		this.sessionModel.find({where: {'sid': sid}}).then(function foundSession(session) {
			// If the session wasn't found, then consider it destroyed already.
			if (session === null) {
				debug('Session not found, assuming destroyed %s', sid);
				fn();
			}
			else {
				session.destroy().then(function destroyedSession() {
					debug('Destroyed %s', sid);
					fn();
				}).catch(function errorDestroying(error) {
					debug('Error destroying session: %s', error);
					fn(error);
				});
			}
		}).catch(function errorFindingSession(error) {
			debug('Error finding session: %s', error);
			fn(error);
		});
	};

	SequelizeStore.prototype.length = function calcLength(fn) {
		this.sessionModel.count().then(function sessionsCount(c) {
			fn(null, c);
		}).catch(function countFailed(error) {
			fn(error);
		});
	};

	return SequelizeStore;
};
