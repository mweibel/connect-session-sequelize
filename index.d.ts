declare module 'connect-session-sequelize' {

  import { Store } from 'express-session';
  import { Sequelize, Model } from 'sequelize';

  interface DefaultFields {
    data: string;
    expires: Date;
  }

  interface Data {
    [column: string]: any;
  }

  interface SequelizeStoreOptions {
    db: Sequelize;
    table?: Model<any, any>;
    extendDefaultFields?: (defaults: DefaultFields, session: any) => Data;
    checkExpirationInterval?: number;
    expiration?: number;
  }

  class SequelizeStore extends Store {
    sync(): void
    touch: (sid: string, data: any, callback?: (err: any) => void) => void
  }

  interface SequelizeStoreConstructor {
    new(options: SequelizeStoreOptions): SequelizeStore;
  }

  export default function init(store: typeof Store): SequelizeStoreConstructor;
}
