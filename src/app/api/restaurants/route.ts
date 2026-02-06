import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBoundingBox, haversineDistance } from "@/lib/geo";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radius = parseFloat(searchParams.get("radius") || "5"); // default 5km
  const channelId = searchParams.get("channelId");
  const sort = searchParams.get("sort") || "distance"; // distance | newest

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  // Get bounding box for efficient query
  const bbox = getBoundingBox(lat, lng, radius);

  // Build query
  const where: Record<string, unknown> = {
    lat: { gte: bbox.minLat, lte: bbox.maxLat },
    lng: { gte: bbox.minLng, lte: bbox.maxLng },
  };

  if (channelId) {
    where.channelId = channelId;
  }

  // Determine orderBy based on sort param
  let orderBy: Record<string, string> | undefined;
  if (sort === "newest") {
    orderBy = { publishedAt: "desc" };
  } else if (sort === "views") {
    orderBy = { viewCount: "desc" };
  }

  const restaurants = await prisma.restaurant.findMany({
    where,
    orderBy,
  });

  // Calculate actual distances and filter by exact radius
  const withDistance = restaurants
    .map((r) => ({
      ...r,
      distance: haversineDistance(lat, lng, r.lat, r.lng),
    }))
    .filter((r) => r.distance <= radius);

  // Sort by distance if needed
  if (sort === "distance") {
    withDistance.sort((a, b) => a.distance - b.distance);
  }

  return NextResponse.json(withDistance);
}
