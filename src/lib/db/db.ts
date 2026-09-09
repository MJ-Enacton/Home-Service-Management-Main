import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

// Reuse one pool across Next.js dev HMR reloads: each reload
// re-evaluates this module, and without the global cache every save
// would open fresh WebSocket connections while old ones linger.
const globalForDb = globalThis as unknown as { __pool?: Pool };
const pool =
  globalForDb.__pool ??
  (globalForDb.__pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
  }));

export const db = drizzle(pool, { schema });
export { pool };
