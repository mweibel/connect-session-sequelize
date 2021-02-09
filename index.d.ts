import { SessionData, Store } from 'express-session';
import { Sequelize, SyncOptions } from 'sequelize';

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
  sync(options?: SyncOptions): void
  touch: (sid: string, data: any, callback?: (err: any) => void) => void
  stopExpiringSessions: () => void
  get(sid: string, callback: (err: any, session?: SessionData | null) => void): void
  set(sid: string, session: SessionData, callback?: (err?: any) => void): void
  destroy(sid: string, callback?: (err?: any) => void): void
}

interface SequelizeStoreConstructor {
  new(options: SequelizeStoreOptions): SequelizeStore;
}

declare namespace init {}
declare function init(store: typeof Store): SequelizeStoreConstructor;

export = init;
