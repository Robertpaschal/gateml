import { DatabaseSync } from "node:sqlite";
import { env } from "../env.js";

export type Db = DatabaseSync;

let instance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!instance) {
    instance = new DatabaseSync(env.DATABASE_URL);
    instance.exec("PRAGMA journal_mode = WAL");
    instance.exec("PRAGMA foreign_keys = ON");
  }
  return instance;
}
