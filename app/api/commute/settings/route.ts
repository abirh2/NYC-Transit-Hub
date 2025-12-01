/**
 * Commute Settings API
 * 
 * GET - Fetch all commutes for authenticated user
 * POST - Create or update a commute
 * DELETE - Delete a commute
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// Response helper
function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json({
    success: status < 400,
    data,
    timestamp: new Date().toISOString(),
  }, { status });
}

function errorResponse(error: string, status = 400) {
  return NextResponse.json({
    success: false,
    data: null,
    error,
    timestamp: new Date().toISOString(),
  }, { status });
}

/**
 * GET /api/commute/settings
 * Fetch all commutes for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    // Get all commutes for user, ordered by sortOrder
    const commutes = await db.commute.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
    });

    // Also check legacy CommuteSettings for migration
    const legacySettings = await db.commuteSettings.findUnique({
      where: { userId: user.id },
    });

    // If user has legacy settings but no commutes, migrate them
    if (legacySettings && commutes.length === 0 && legacySettings.homeAddress) {
      // Create two default commutes from legacy settings
      const morningCommute = await db.commute.create({
        data: {
          userId: user.id,
          label: "Morning Commute",
          fromAddress: legacySettings.homeAddress,
          fromLat: legacySettings.homeLat,
          fromLon: legacySettings.homeLon,
          toAddress: legacySettings.workAddress,
          toLat: legacySettings.workLat,
          toLon: legacySettings.workLon,
          targetArrival: legacySettings.targetArrival,
          isDefault: true,
          sortOrder: 0,
        },
      });

      const eveningCommute = await db.commute.create({
        data: {
          userId: user.id,
          label: "Evening Commute",
          fromAddress: legacySettings.workAddress,
          fromLat: legacySettings.workLat,
          fromLon: legacySettings.workLon,
          toAddress: legacySettings.homeAddress,
          toLat: legacySettings.homeLat,
          toLon: legacySettings.homeLon,
          targetArrival: "18:00", // Default 6 PM
          isDefault: false,
          sortOrder: 1,
        },
      });

      return jsonResponse({
        commutes: [morningCommute, eveningCommute],
      });
    }

    return jsonResponse({
      commutes: commutes.map(c => ({
        id: c.id,
        label: c.label,
        fromAddress: c.fromAddress,
        fromLat: c.fromLat,
        fromLon: c.fromLon,
        toAddress: c.toAddress,
        toLat: c.toLat,
        toLon: c.toLon,
        targetArrival: c.targetArrival,
        isDefault: c.isDefault,
        sortOrder: c.sortOrder,
      })),
    });
  } catch (error) {
    console.error("Error fetching commutes:", error);
    return errorResponse("Failed to fetch commutes", 500);
  }
}

/**
 * POST /api/commute/settings
 * Create or update a commute
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const { 
      id, // If provided, update existing
      label,
      fromAddress, 
      fromLat, 
      fromLon, 
      toAddress, 
      toLat, 
      toLon,
      targetArrival,
      isDefault,
    } = body;

    // Validate coordinates if addresses are provided
    if (fromAddress && (typeof fromLat !== "number" || typeof fromLon !== "number")) {
      return errorResponse("From address requires valid coordinates");
    }
    if (toAddress && (typeof toLat !== "number" || typeof toLon !== "number")) {
      return errorResponse("To address requires valid coordinates");
    }

    // Validate target arrival format (HH:MM in 24h)
    if (targetArrival && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(targetArrival)) {
      return errorResponse("Target arrival must be in HH:MM format (24-hour)");
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.commute.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    let commute;

    if (id) {
      // Update existing commute
      commute = await db.commute.update({
        where: { id, userId: user.id },
        data: {
          label: label || undefined,
          fromAddress: fromAddress || null,
          fromLat: fromLat ?? null,
          fromLon: fromLon ?? null,
          toAddress: toAddress || null,
          toLat: toLat ?? null,
          toLon: toLon ?? null,
          targetArrival: targetArrival || null,
          isDefault: isDefault ?? undefined,
        },
      });
    } else {
      // Create new commute
      const count = await db.commute.count({ where: { userId: user.id } });
      
      commute = await db.commute.create({
        data: {
          userId: user.id,
          label: label || `Commute ${count + 1}`,
          fromAddress: fromAddress || null,
          fromLat: fromLat ?? null,
          fromLon: fromLon ?? null,
          toAddress: toAddress || null,
          toLat: toLat ?? null,
          toLon: toLon ?? null,
          targetArrival: targetArrival || null,
          isDefault: isDefault ?? (count === 0), // First commute is default
          sortOrder: count,
        },
      });
    }

    return jsonResponse({
      commute: {
        id: commute.id,
        label: commute.label,
        fromAddress: commute.fromAddress,
        fromLat: commute.fromLat,
        fromLon: commute.fromLon,
        toAddress: commute.toAddress,
        toLat: commute.toLat,
        toLon: commute.toLon,
        targetArrival: commute.targetArrival,
        isDefault: commute.isDefault,
        sortOrder: commute.sortOrder,
      },
    });
  } catch (error) {
    console.error("Error saving commute:", error);
    return errorResponse("Failed to save commute", 500);
  }
}

/**
 * DELETE /api/commute/settings
 * Delete a commute by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const commuteId = searchParams.get("id");

    if (!commuteId) {
      return errorResponse("Commute ID required");
    }

    await db.commute.delete({
      where: { id: commuteId, userId: user.id },
    });

    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error("Error deleting commute:", error);
    return errorResponse("Failed to delete commute", 500);
  }
}
