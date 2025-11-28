// Note: Prisma 7.x requires database adapter configuration.
// The database connection is not yet configured for this project.
// Ingestion routes will work once Supabase/PostgreSQL adapter is set up.
// For now, throw a clear error if db is accessed without configuration.

import { PrismaClient } from "@/lib/generated/prisma";

const prismaInstance: PrismaClient | null = null;

/**
 * Get the Prisma database client.
 * Throws an error if the database is not configured.
 */
export function getDb(): PrismaClient {
  if (!prismaInstance) {
    // Check if database URL is configured
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "Database not configured. Set DATABASE_URL environment variable to use database features."
      );
    }
    
    // Prisma 7.x with Supabase requires adapter configuration
    // This will be implemented when database connection is set up
    throw new Error(
      "Database adapter not configured. Prisma 7.x requires adapter configuration for Supabase."
    );
  }
  
  return prismaInstance;
}

// Legacy export for compatibility (will throw if used without configuration)
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
});
