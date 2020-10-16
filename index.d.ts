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
  table?: string;
  tableName?: string;
  extendDefaultFields?: (defaults: DefaultFields, session: any) => Data;
  checkExpirationInterval?: number;
  expiration?: number;
}

declare class SequelizeStore extends Store {
  sync(): void
  touch: (sid: string, data: any, callback?: (err: any) => void) => void
  stopExpiringSessions: () => void
}

interface SequelizeStoreConstructor {
  new(options: SequelizeStoreOptions): SequelizeStore;
}

declare namespace init {}
declare function init(store: typeof Store): SequelizeStoreConstructor;

export = init;
