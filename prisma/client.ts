// Cliente Prisma para scripts executados fora do Next.js (seed e demo).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { parseDatabaseUrl } from "../src/lib/db-config";

const { pool, schema } = parseDatabaseUrl(process.env.DATABASE_URL);

export const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });

export const databaseInfo = `${pool.host}/${pool.database} (schema ${schema})`;
