import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/suggestions - Submit a channel suggestion (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { youtubeId, reason } = body;

    if (!youtubeId || typeof youtubeId !== "string") {
      return NextResponse.json(
        { error: "YouTube channel ID is required" },
        { status: 400 }
      );
    }

    // Clean up the youtubeId - extract from URL if needed
    let cleanYoutubeId = youtubeId.trim();

    // Handle full URLs
    if (cleanYoutubeId.includes("youtube.com")) {
      const match = cleanYoutubeId.match(/@[\w-]+/);
      if (match) {
        cleanYoutubeId = match[0];
      }
    }

    // Check if this channel is already suggested (pending)
    const existing = await prisma.channelSuggestion.findFirst({
      where: {
        youtubeId: cleanYoutubeId,
        status: "pending",
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This channel has already been suggested and is pending review" },
        { status: 400 }
      );
    }

    // Check if channel is already in the approved channels
    const existingChannel = await prisma.channel.findFirst({
      where: {
        youtubeId: cleanYoutubeId,
      },
    });

    if (existingChannel) {
      return NextResponse.json(
        { error: "This channel is already in our database" },
        { status: 400 }
      );
    }

    // Create the suggestion
    const suggestion = await prisma.channelSuggestion.create({
      data: {
        youtubeId: cleanYoutubeId,
        reason: reason || null,
        status: "pending",
      },
    });

    return NextResponse.json({ success: true, id: suggestion.id });
  } catch (error) {
    console.error("Failed to create suggestion:", error);
    return NextResponse.json(
      { error: "Failed to submit suggestion" },
      { status: 500 }
    );
  }
}
