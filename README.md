# Connect Session Store using Sequelize
[![Build Status](https://travis-ci.org/mweibel/connect-session-sequelize.png)](https://travis-ci.org/mweibel/connect-session-sequelize)

connect-session-sequelize is a SQL session store using [Sequelize.js](http://sequelizejs.com).

# Installation
Please note that the most recent version requires **express 4.** If you use *express 3* you should install version 0.0.5 and follow [the instructions in the previous README](https://github.com/mweibel/connect-session-sequelize/blob/7a446de5a7a2ebc562d288a22896d55f0fbe6e5d/README.md).

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
