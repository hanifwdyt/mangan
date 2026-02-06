import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || "";
  const channelId = searchParams.get("channelId") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  // Build where clause
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { videoTitle: { contains: search } },
      { channelName: { contains: search } },
    ];
  }

  if (channelId) {
    where.channelId = channelId;
  }

  // Build orderBy
  const validSortFields = ["createdAt", "publishedAt", "name", "channelName", "viewCount"];
  const orderField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  const orderDir = sortOrder === "asc" ? "asc" : "desc";

  const [restaurants, total] = await Promise.all([
    prisma.restaurant.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.restaurant.count({ where }),
  ]);

  return NextResponse.json({
    data: restaurants,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, address, lat, lng } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(lat && { lat }),
        ...(lng && { lng }),
      },
    });

    return NextResponse.json(restaurant);
  } catch {
    return NextResponse.json(
      { error: "Failed to update restaurant" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.restaurant.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
