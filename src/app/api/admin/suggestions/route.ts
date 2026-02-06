import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { resolveChannelId } from "@/lib/youtube";

// GET /api/admin/suggestions - List all suggestions
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suggestions = await prisma.channelSuggestion.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(suggestions);
}

// PUT /api/admin/suggestions - Approve or reject a suggestion
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, action, rejectReason } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: "id and action are required" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const suggestion = await prisma.channelSuggestion.findUnique({
      where: { id },
    });

    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    if (suggestion.status !== "pending") {
      return NextResponse.json(
        { error: "Suggestion has already been processed" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Resolve channel info from YouTube
      const channelInfo = await resolveChannelId(suggestion.youtubeId);

      if (!channelInfo) {
        return NextResponse.json(
          { error: "Could not resolve YouTube channel" },
          { status: 400 }
        );
      }

      // Check if channel already exists
      const existingChannel = await prisma.channel.findUnique({
        where: { youtubeId: channelInfo.id },
      });

      if (existingChannel) {
        // Update suggestion as rejected since channel exists
        await prisma.channelSuggestion.update({
          where: { id },
          data: {
            status: "rejected",
            rejectReason: "Channel already exists in database",
            processedAt: new Date(),
          },
        });

        return NextResponse.json(
          { error: "Channel already exists in database" },
          { status: 400 }
        );
      }

      // Create channel and update suggestion
      await prisma.$transaction([
        prisma.channel.create({
          data: {
            name: channelInfo.title,
            youtubeId: channelInfo.id,
          },
        }),
        prisma.channelSuggestion.update({
          where: { id },
          data: {
            channelName: channelInfo.title,
            status: "approved",
            processedAt: new Date(),
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Channel "${channelInfo.title}" added successfully`,
      });
    } else {
      // Reject the suggestion
      await prisma.channelSuggestion.update({
        where: { id },
        data: {
          status: "rejected",
          rejectReason: rejectReason || null,
          processedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Suggestion rejected",
      });
    }
  } catch (error) {
    console.error("Failed to process suggestion:", error);
    return NextResponse.json(
      { error: "Failed to process suggestion" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/suggestions - Delete a suggestion
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.channelSuggestion.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
