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

module.exports = function SequelizeSessionInit(connect) {
	var Store = connect.session.Store;

	function SequelizeStore(options) {
		options = options || {};
		if (!options.db) {
			throw new SequelizeStoreException('Database connection is required');
		}
		Store.call(this, options);

		this.sessionModel = options.db.import(path.join(__dirname, 'model'));
		options.db.sync();
	}

	util.inherits(SequelizeStore, Store);

	SequelizeStore.prototype.get = function getSession(sid, fn) {
		debug('SELECT "%s"', sid);
		console.log(sid, this.sessionModel);
		this.sessionModel.find(sid).success(function foundSession(session) {
			if(!data) {
				return fn();
			}
			try {
				var data = JSON.parse(session.data);
				debug('Found %s', data);
				fn(null, data);
			} catch(e) {
				debug('Error parsing data: %s', e);
				return fn(e);
			}
		}).error(function errorFindingSession(error) {
			debug('Error finding session: %s', error);
			fn(error);
		});
	};

	SequelizeStore.prototype.set = function setSession(sid, data, fn) {
		debug('INSERT "%s"', sid);
		this.sessionModel.create({
			sid: sid
			, data: JSON.stringify(data)
		}).success(function sessionCreated(session) {
			if (fn) {
				fn(null, data);
			}
		}).error(function sessionCreatedError(error) {
			debug('Error creating session: %s', error);
			if (fn) {
				fn(error);
			}
		});
	};

	SequelizeStore.prototype.destroy = function destroySession(sid, fn) {
		this.sessionModel.find(sid).success(function foundSession(session) {
			session.destroy().success(function destroyedSession() {
				fn();
			}).error(function errorDestroying(error) {
				debug('Error destroying session: %s', error);
				fn(error);
			});
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
		})
	};

	return SequelizeStore;
};