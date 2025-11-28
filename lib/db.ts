/**
 * Database Client Singleton
 * 
 * Provides a singleton PrismaClient instance for database operations.
 * Uses the PostgreSQL adapter for Prisma 7.x compatibility with Supabase.
 */

import { PrismaClient } from "@/lib/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Extend globalThis to store the Prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create a PostgreSQL connection pool and Prisma client.
 */
function createPrismaClient(): PrismaClient {
  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
      "Get your connection string from Supabase Dashboard > Settings > Database > Connection string."
    );
  }

  // Create a PostgreSQL connection pool
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Create the Prisma adapter
  const adapter = new PrismaPg(pool);

  // Create and return the Prisma client with the adapter
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  }) as PrismaClient;
}

// Create the singleton instance
export const db = globalForPrisma.prisma ?? createPrismaClient();

// Preserve instance across hot reloads in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Legacy function export for compatibility
export function getDb(): PrismaClient {
  return db;
}
