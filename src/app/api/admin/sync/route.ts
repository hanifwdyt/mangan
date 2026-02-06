import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { searchChannelVideos, getVideoDetails as getVideoDetailsApi, getChannelAvatar } from "@/lib/youtube";
import {
  getChannelVideoIds,
  getVideoDetails as getVideoDetailsYtdlp,
  getChannelUrl,
  parseUploadDate,
  VideoInfo,
} from "@/lib/ytdlp";
import {
  findMapsUrls,
  extractCoordsFromMapsUrl,
  extractPlaceName,
} from "@/lib/maps";

// Default max videos per channel
const DEFAULT_MAX_VIDEOS = 500;

// Only sync videos from the last 1 year
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const CUTOFF_DATE = new Date(Date.now() - ONE_YEAR_MS);

// Helper to update sync log
async function updateSyncLog(
  id: string,
  data: {
    currentChannel?: number;
    channelName?: string;
    totalVideos?: number;
    processedVideos?: number;
    skippedVideos?: number;
    added?: number;
    updated?: number;
    status?: string;
    errors?: string[];
    completedAt?: Date;
  }
) {
  await prisma.syncLog.update({
    where: { id },
    data: {
      ...data,
      errors: data.errors ? JSON.stringify(data.errors) : undefined,
    },
  });
}

interface ProcessedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: Date;
  channelId: string;
  channelTitle: string;
  viewCount?: number;
}

interface FetchResult {
  videos: ProcessedVideo[];
  skippedCount: number;
}

/**
 * Fetch videos using yt-dlp (primary method - free, unlimited)
 */
async function fetchVideosYtdlp(
  channelId: string,
  channelName: string,
  existingVideoIds: Set<string>,
  maxVideos: number
): Promise<FetchResult> {
  console.log(`  [yt-dlp] Fetching video list from channel...`);

  const channelUrl = getChannelUrl(channelId);
  const allVideoIds = await getChannelVideoIds(channelUrl);

  console.log(`  [yt-dlp] Found ${allVideoIds.length} total videos`);

  // Filter out videos we already have
  const newVideoIds = allVideoIds.filter((id) => !existingVideoIds.has(id));
  const skippedCount = allVideoIds.length - newVideoIds.length;
  console.log(`  [yt-dlp] ${newVideoIds.length} new videos to process (${skippedCount} already synced)`);

  // Limit to maxVideos
  const videoIdsToProcess = newVideoIds.slice(0, maxVideos);

  if (videoIdsToProcess.length === 0) {
    return { videos: [], skippedCount };
  }

  console.log(`  [yt-dlp] Fetching details for ${videoIdsToProcess.length} videos...`);

  // Fetch full details for new videos
  const videos: ProcessedVideo[] = [];

  for (let i = 0; i < videoIdsToProcess.length; i++) {
    const videoId = videoIdsToProcess[i];
    const video = await getVideoDetailsYtdlp(videoId);

    if (video) {
      const publishedAt = parseUploadDate(video.upload_date);

      // Stop if video is older than 1 year (videos are fetched newest-first)
      if (publishedAt < CUTOFF_DATE) {
        console.log(`  [yt-dlp] Reached videos older than 1 year, stopping...`);
        break;
      }

      videos.push({
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail,
        publishedAt,
        channelId: video.channel_id || channelId,
        channelTitle: video.channel || channelName,
        viewCount: video.view_count,
      });
    }

    if ((i + 1) % 10 === 0 || i === videoIdsToProcess.length - 1) {
      console.log(`  [yt-dlp] Progress: ${i + 1}/${videoIdsToProcess.length}`);
    }
  }

  return { videos, skippedCount };
}

/**
 * Fetch videos using YouTube API (fallback - uses quota)
 * Note: API fallback doesn't track skipped count (no initial list fetch)
 */
async function fetchVideosApi(
  channelId: string,
  maxVideos: number
): Promise<FetchResult> {
  console.log(`  [API] Fetching videos using YouTube API...`);

  const allVideos: ProcessedVideo[] = [];
  let pageToken: string | undefined;
  let fetchedCount = 0;
  let reachedCutoff = false;

  while (fetchedCount < maxVideos && !reachedCutoff) {
    const remainingToFetch = Math.min(50, maxVideos - fetchedCount);
    const { videos, nextPageToken } = await searchChannelVideos(
      channelId,
      remainingToFetch,
      pageToken
    );

    if (videos.length === 0) break;

    // Get full video details (search API returns truncated descriptions)
    const videoIds = videos.map((v) => v.id);
    const fullVideos = await getVideoDetailsApi(videoIds);

    for (const video of fullVideos) {
      const publishedAt = new Date(video.publishedAt);

      // Stop if video is older than 1 year
      if (publishedAt < CUTOFF_DATE) {
        console.log(`  [API] Reached videos older than 1 year, stopping...`);
        reachedCutoff = true;
        break;
      }

      allVideos.push({
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail,
        publishedAt,
        channelId: video.channelId,
        channelTitle: video.channelTitle,
      });
    }

    fetchedCount += videos.length;
    console.log(`  [API] Fetched ${fetchedCount}/${maxVideos} videos`);

    if (!nextPageToken) break;
    pageToken = nextPageToken;

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { videos: allVideos, skippedCount: 0 };
}

export async function POST(request: NextRequest) {
  // Allow cron access with secret key
  const cronSecret = request.headers.get("x-cron-secret");
  const validCronSecret = process.env.CRON_SECRET;
  
  const isCronRequest = cronSecret && validCronSecret && cronSecret === validCronSecret;
  
  if (!isCronRequest && !(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const maxVideosParam = searchParams.get("maxVideos");
  const useApiParam = searchParams.get("useApi"); // Force use YouTube API
  const maxVideos = maxVideosParam
    ? Math.min(parseInt(maxVideosParam, 10), 5000)
    : DEFAULT_MAX_VIDEOS;

  const forceApi = useApiParam === "true";

  const channels = await prisma.channel.findMany();

  if (channels.length === 0) {
    return NextResponse.json({
      message: "No channels configured",
      added: 0,
      updated: 0,
    });
  }

  // Create sync log entry
  const syncLog = await prisma.syncLog.create({
    data: {
      status: "running",
      totalChannels: channels.length,
    },
  });

  try {

    let totalAdded = 0;
    let totalUpdated = 0;
    let totalVideosProcessed = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (let channelIndex = 0; channelIndex < channels.length; channelIndex++) {
      const channel = channels[channelIndex];
      try {
        console.log(`Syncing channel: ${channel.name} (${channel.youtubeId})`);

        // Update sync log with current channel
        await updateSyncLog(syncLog.id, {
          currentChannel: channelIndex + 1,
          channelName: channel.name,
        });

        // Fetch channel avatar
        let channelAvatar: string | null = null;
        try {
          channelAvatar = await getChannelAvatar(channel.youtubeId);
          console.log(`  Channel avatar: ${channelAvatar ? 'fetched' : 'not found'}`);
        } catch (avatarError) {
          console.warn(`  Failed to fetch channel avatar:`, avatarError);
        }

        // Get existing video IDs for this channel
        const existingRestaurants = await prisma.restaurant.findMany({
          where: { channelId: channel.youtubeId },
          select: { videoId: true },
        });
        const existingVideoIds = new Set(existingRestaurants.map((r) => r.videoId));
        console.log(`  Found ${existingVideoIds.size} existing videos in DB`);

        let fetchResult: FetchResult = { videos: [], skippedCount: 0 };
        let method = "yt-dlp";

        if (!forceApi) {
          // Try yt-dlp first (free, unlimited)
          try {
            fetchResult = await fetchVideosYtdlp(
              channel.youtubeId,
              channel.name,
              existingVideoIds,
              maxVideos
            );
          } catch (ytdlpError) {
            console.warn(`  yt-dlp failed, falling back to YouTube API:`, ytdlpError);
            method = "API (fallback)";
            fetchResult = await fetchVideosApi(channel.youtubeId, maxVideos);
          }
        } else {
          method = "API (forced)";
          fetchResult = await fetchVideosApi(channel.youtubeId, maxVideos);
        }

        const { videos, skippedCount } = fetchResult;
        totalSkipped += skippedCount;

        console.log(`  [${method}] Processing ${videos.length} videos...`);
        totalVideosProcessed += videos.length;

        // Update sync log with total videos and skipped count
        await updateSyncLog(syncLog.id, {
          totalVideos: totalVideosProcessed,
          skippedVideos: totalSkipped,
        });

        // Process each video
        let processedInChannel = 0;
        for (const video of videos) {
          const mapsUrls = findMapsUrls(video.description);

          for (const mapsUrl of mapsUrls) {
            try {
              const coords = await extractCoordsFromMapsUrl(mapsUrl);
              if (!coords) continue;

              let name = extractPlaceName(mapsUrl);
              if (!name) {
                name = video.title;
              }

              const existing = await prisma.restaurant.findUnique({
                where: {
                  videoId_mapsUrl: {
                    videoId: video.id,
                    mapsUrl: mapsUrl,
                  },
                },
              });

              if (existing) {
                await prisma.restaurant.update({
                  where: { id: existing.id },
                  data: {
                    name,
                    lat: coords.lat,
                    lng: coords.lng,
                    videoTitle: video.title,
                    thumbnail: video.thumbnail,
                    channelName: video.channelTitle,
                    channelAvatar: channelAvatar || undefined,
                    viewCount: video.viewCount,
                    publishedAt: video.publishedAt,
                  },
                });
                totalUpdated++;
              } else {
                await prisma.restaurant.create({
                  data: {
                    name,
                    lat: coords.lat,
                    lng: coords.lng,
                    mapsUrl,
                    videoId: video.id,
                    videoTitle: video.title,
                    thumbnail: video.thumbnail,
                    channelId: video.channelId,
                    channelName: video.channelTitle,
                    channelAvatar,
                    viewCount: video.viewCount,
                    publishedAt: video.publishedAt,
                  },
                });
                totalAdded++;
              }
            } catch (error) {
              console.error(`Failed to process URL ${mapsUrl}:`, error);
            }
          }

          // Update progress after each video
          processedInChannel++;
          if (processedInChannel % 5 === 0 || processedInChannel === videos.length) {
            await updateSyncLog(syncLog.id, {
              processedVideos: totalVideosProcessed - videos.length + processedInChannel,
              added: totalAdded,
              updated: totalUpdated,
            });
          }
        }

        console.log(`  Done with ${channel.name}: +${totalAdded} added, ${totalUpdated} updated`);
      } catch (error) {
        const msg = `Failed to sync channel ${channel.name}: ${error}`;
        console.error(msg);
        errors.push(msg);

        // Update errors in sync log
        await updateSyncLog(syncLog.id, { errors });
      }
    }

    // Mark sync as completed
    await updateSyncLog(syncLog.id, {
      status: errors.length > 0 ? "completed" : "completed",
      processedVideos: totalVideosProcessed,
      added: totalAdded,
      updated: totalUpdated,
      errors: errors.length > 0 ? errors : undefined,
      completedAt: new Date(),
    });

    return NextResponse.json({
      message: `Sync complete`,
      syncId: syncLog.id,
      videosProcessed: totalVideosProcessed,
      added: totalAdded,
      updated: totalUpdated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Sync failed:", error);

    // Mark sync as failed
    await updateSyncLog(syncLog.id, {
      status: "failed",
      errors: [String(error)],
      completedAt: new Date(),
    });

    return NextResponse.json({ error: "Sync failed", syncId: syncLog.id }, { status: 500 });
  }
}
