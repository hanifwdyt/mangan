import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const syncLog = await prisma.syncLog.findFirst({
    orderBy: { startedAt: "desc" },
  });

  if (!syncLog) {
    return NextResponse.json({ status: "idle" });
  }

  const progress =
    syncLog.totalVideos > 0
      ? Math.round((syncLog.processedVideos / syncLog.totalVideos) * 100)
      : 0;

  return NextResponse.json({
    id: syncLog.id,
    status: syncLog.status,
    totalChannels: syncLog.totalChannels,
    currentChannel: syncLog.currentChannel,
    channelName: syncLog.channelName,
    totalVideos: syncLog.totalVideos,
    processedVideos: syncLog.processedVideos,
    skippedVideos: syncLog.skippedVideos,
    added: syncLog.added,
    updated: syncLog.updated,
    errors: syncLog.errors ? JSON.parse(syncLog.errors) : [],
    progress,
    startedAt: syncLog.startedAt,
    completedAt: syncLog.completedAt,
  });
}
