/**
 * Database Client Singleton
 * 
 * Provides a singleton PrismaClient instance for database operations.
 * Uses the PostgreSQL adapter for Prisma 7.x compatibility with Supabase.
 */

import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Extend globalThis to store both the Prisma instance AND the pool
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
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

  // Reuse existing pool or create a new one with conservative limits
  // Supabase Session mode limits connections, so keep pool small
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5, // Keep pool small for Supabase Session mode
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 30000, // Timeout after 30s (Supabase cold starts can be slow)
    });
  }

  // Create the Prisma adapter with the shared pool
  const adapter = new PrismaPg(globalForPrisma.pool);

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
