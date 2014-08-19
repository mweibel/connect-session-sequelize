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

		this.sessionModel = options.db.import(path.join(__dirname, 'model'));
	}

	util.inherits(SequelizeStore, Store);

	SequelizeStore.prototype.sync = function sync() {
		return this.sessionModel.sync();
	};

	SequelizeStore.prototype.get = function getSession(sid, fn) {
		debug('SELECT "%s"', sid);
		this.sessionModel.find({where: {'sid': sid}}).success(function(session) {
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
		}).error(function(error) {
			debug('Error finding session: %s', error);
			fn(error);
		});
	};

	SequelizeStore.prototype.set = function setSession(sid, data, fn) {
		debug('INSERT "%s"', sid);
		var stringData = JSON.stringify(data);
		this.sessionModel.findOrCreate({'sid': sid}, {'data': stringData}).spread(function sessionCreated(session) {
			if(session['data'] !== stringData) {
				session['data'] = JSON.stringify(data);
				session.save().success(function updated(session) {
					if (fn) {
						fn(null, data);
					}
				}).error(function errorUpdating(error) {
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
		this.sessionModel.find({where: {'sid': sid}}).success(function foundSession(session) {
			// If the session wasn't found, then consider it destroyed already.
			if (session === null) {
				debug('Session not found, assuming destroyed %s', sid);
				fn();
			}
			else {
				session.destroy().success(function destroyedSession() {
					debug('Destroyed %s', sid);
					fn();
				}).error(function errorDestroying(error) {
					debug('Error destroying session: %s', error);
					fn(error);
				});
			}
		}).error(function errorFindingSession(error) {
			debug('Error finding session: %s', error);
			fn(error);
		});
	};

	SequelizeStore.prototype.length = function calcLength(fn) {
		this.sessionModel.count().success(function sessionsCount(c) {
			fn(null, c);
		}).error(function countFailed(error) {
			fn(error);
		});
	};

	return SequelizeStore;
};