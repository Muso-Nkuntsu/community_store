import { execSync } from "node:child_process";
import path from "node:path";
import { config } from "dotenv";

/**
 * Runs once before all tests: rebuilds the TEST database from prisma/schema.prisma.
 * Refuses to run unless the database name ends in "_test", so it can never
 * wipe your development database by accident.
 */
export default function setup() {
  const result = config({ path: path.resolve(process.cwd(), ".env.test"), override: true });
  if (result.error) {
    throw new Error("Missing .env.test - copy .env.test.example to .env.test and set a *_test database.");
  }

  const url = process.env.DATABASE_URL ?? "";
  const dbName = url.split("?")[0]!.split("/").pop() ?? "";
  if (!dbName.endsWith("_test")) {
    throw new Error(`Refusing to run tests against "${dbName}". DATABASE_URL in .env.test must point to a *_test database.`);
  }

  execSync("npx prisma db push --force-reset --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: process.env,
  });
}
