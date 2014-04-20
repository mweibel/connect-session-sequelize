# Connect Session Store using Sequelize
[![Build Status](https://travis-ci.org/mweibel/connect-session-sequelize.png)](https://travis-ci.org/mweibel/connect-session-sequelize)

connect-session-sequelize is a SQL session store using [Sequelize.js](http://sequelizejs.com).

# Installation

```
$ npm install connect-session-sequelize
```

# Options

* `db` a successfully connected Sequelize instance

# Usage

```javascript
var connect = require('connect')
	// for express, just call it with 'require('express-session').Store'
	, SequelizeStore = require('connect-session-sequelize')(connect.session.Store);

connect().use(connect.session({
	store: new SequelizeStore(options)
	, secret: 'CHANGEME'
}));
```

# License

MIT
