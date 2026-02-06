import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { resolveChannelId } from "@/lib/youtube";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(channels);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { youtubeId } = body;

    if (!youtubeId) {
      return NextResponse.json(
        { error: "youtubeId is required" },
        { status: 400 }
      );
    }

    // Resolve to actual channel ID and get name
    const channelInfo = await resolveChannelId(youtubeId);
    if (!channelInfo) {
      return NextResponse.json(
        { error: "Channel not found on YouTube" },
        { status: 404 }
      );
    }

    // Check if already exists
    const existing = await prisma.channel.findUnique({
      where: { youtubeId: channelInfo.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Channel already exists" },
        { status: 409 }
      );
    }

    const channel = await prisma.channel.create({
      data: {
        name: channelInfo.title,
        youtubeId: channelInfo.id,
      },
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error("Failed to add channel:", error);
    return NextResponse.json(
      { error: "Failed to add channel" },
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
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  await prisma.channel.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
