import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Env } from "../config/env";
import * as schema from "./schema";

export interface DatabaseClient {
  db: NodePgDatabase<typeof schema>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

export const createDatabaseClient = (env: Env): DatabaseClient => {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  return {
    db,
    async ping() {
      try {
        await db.execute(sql`select 1`);
        return true;
      } catch {
        return false;
      }
    },
    async close() {
      await pool.end();
    },
  };
};
