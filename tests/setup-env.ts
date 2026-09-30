// Loads .env.test before any test file imports the Prisma client.
import path from "node:path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.test"), override: true });
