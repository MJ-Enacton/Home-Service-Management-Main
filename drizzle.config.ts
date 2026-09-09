import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL!) {
  throw new Error("DATABASE_URL! is not set in the .env file");
}

// Migrations must run on a direct (non-pooled) connection — pooled
// (PgBouncer) endpoints can fail DDL. Prefer an explicit
// DIRECT_DATABASE_URL, otherwise strip the "-pooler" host segment.
const migrationUrl =
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL!.replace("-pooler", "");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
});
