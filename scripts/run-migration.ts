import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { Client } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: tsx scripts/run-migration.ts <path-to-sql>");
  const sql = readFileSync(join(process.cwd(), file), "utf-8");

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log(`Applied migration: ${file}`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
