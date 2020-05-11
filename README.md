# Connect Session Store using Sequelize

[![Build Status](https://travis-ci.org/mweibel/connect-session-sequelize.png)](https://travis-ci.org/mweibel/connect-session-sequelize)

connect-session-sequelize is a SQL session store using [Sequelize.js](http://sequelizejs.com).

# Installation

Please note that the most recent version requires **express 4.** If you use _express 3_ you should install version 0.0.5 and follow [the instructions in the previous README](https://github.com/mweibel/connect-session-sequelize/blob/7a446de5a7a2ebc562d288a22896d55f0fbe6e5d/README.md).

```
$ npm install connect-session-sequelize
```

# Options

- `db` a successfully connected Sequelize instance
- `table` _(optional)_ a table/model which has already been imported to your Sequelize instance, this can be used if you want to use a specific table in your db
- `modelKey` _(optional)_ a string for the key in sequelize's models-object but it is also the name of the class to which it references (conventionally written in Camelcase) that's why it is "Session" by default if `table` is not defined.
- `tableName` _(optional)_ a string for naming the generated table if `table` is not defined.
  Default is the value of `modelKey`.
- `extendDefaultFields` _(optional)_ a way add custom data to table columns. Useful if using a custom model definition
- `disableTouch` _(optional)_ When true, the store will not update the db when receiving a touch() call. This can be useful in limiting db writes and introducing more manual control of session updates.

# Usage

With connect

```javascript
const connect = require("connect");
// for express, just call it with 'require('connect-session-sequelize')(session.Store)'
const SequelizeStore = require("connect-session-sequelize")(
  connect.session.Store
);

connect().use(
  connect.session({
    store: new SequelizeStore(options),
    secret: "CHANGEME",
  })
);
```

With express 4:

```javascript
// load dependencies
var express = require("express");
var Sequelize = require("sequelize");
var session = require("express-session");

// initalize sequelize with session store
var SequelizeStore = require("connect-session-sequelize")(session.Store);

// create database, ensure 'sqlite3' in your package.json
var sequelize = new Sequelize("database", "username", "password", {
  dialect: "sqlite",
  storage: "./session.sqlite",
});

// configure express
var app = express();
app.use(
  session({
    secret: "keyboard cat",
    store: new SequelizeStore({
      db: sequelize,
    }),
    resave: false, // we support the touch method so per the express-session docs this should be set to false
    proxy: true, // if you do SSL outside of node.
  })
);
// continue as normal
```

If you want SequelizeStore to create/sync the database table for you, you can call `sync()` against an instance of `SequelizeStore` - this will run a sequelize `sync()` operation on the model for an initialized SequelizeStore object:

```javascript
var myStore = new SequelizeStore({
  db: sequelize,
});
app.use(
  session({
    secret: "keyboard cat",
    store: myStore,
    resave: false,
    proxy: true,
  })
);

myStore.sync();
```

# Session expiry

Session records are automatically expired and removed from the database on an interval. The `cookie.expires` property is used to set session expiry time. If that property doesn't exist, a default expiry of 24 hours is used. Expired session are removed from the database every 15 minutes by default. That interval as well as the default expiry time can be set as store options:

```javascript
new SequelizeStore({
  ...
  checkExpirationInterval: 15 * 60 * 1000, // The interval at which to cleanup expired sessions in milliseconds.
  expiration: 24 * 60 * 60 * 1000  // The maximum age (in milliseconds) of a valid session.
});
```

## Expiration interval cleanup: `stopExpiringSessions`

As expirations are checked on an interval timer, `connect-session-sequelize` can keep your process from exiting. This can be problematic e.g. in testing when it is known that the application code will no longer be used, but the test script never terminates. If you know that the process will no longer be used, you can manually clean up the interval by calling the `stopExpiringSessions` method:

```js
// assuming you have set up a typical session store, for example:
var myStore = new SequelizeStore({
  db: sequelize,
});

// you can stop expiring sessions (cancel the interval). Example using Mocha:
after("clean up resources", () => {
  myStore.stopExpiringSessions();
});
```

# Add custom field(s) as a column

The `extendDefaultFields` can be used to add custom fields to the session table. These fields will be read-only as they will be inserted only when the session is first created as `defaults`. Make sure to return an object which contains unmodified `data` and `expires` properties, or else the module functionality will be broken:

```javascript
var Session = sequelize.define("Session", {
  sid: {
    type: Sequelize.STRING,
    primaryKey: true,
  },
  userId: Sequelize.STRING,
  expires: Sequelize.DATE,
  data: Sequelize.STRING(50000),
});

function extendDefaultFields(defaults, session) {
  return {
    data: defaults.data,
    expires: defaults.expires,
    userId: session.userId,
  };
}

var store = new SessionStore({
  db: sequelize,
  table: "Session",
  extendDefaultFields: extendDefaultFields,
});
```

# Contributing/Reporting Bugs

Try to replicate your issue using [mweibel/connect-session-sequelize-example](https://github.com/mweibel/connect-session-sequelize-example/) and add that as a link to your issue.

This way it's much simpler to reproduce and help you.

# License

MIT
