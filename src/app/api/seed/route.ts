import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  // Verify secret
  const secret = request.headers.get("x-seed-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { channels, restaurants } = body;

    let channelsAdded = 0;
    let restaurantsAdded = 0;

    // Import channels
    if (channels && Array.isArray(channels)) {
      for (const channel of channels) {
        await prisma.channel.upsert({
          where: { youtubeId: channel.youtubeId },
          create: {
            name: channel.name,
            youtubeId: channel.youtubeId,
          },
          update: {
            name: channel.name,
          },
        });
        channelsAdded++;
      }
    }

    // Import restaurants
    if (restaurants && Array.isArray(restaurants)) {
      for (const restaurant of restaurants) {
        await prisma.restaurant.upsert({
          where: {
            videoId_mapsUrl: {
              videoId: restaurant.videoId,
              mapsUrl: restaurant.mapsUrl,
            },
          },
          create: {
            name: restaurant.name,
            address: restaurant.address,
            lat: restaurant.lat,
            lng: restaurant.lng,
            mapsUrl: restaurant.mapsUrl,
            videoId: restaurant.videoId,
            videoTitle: restaurant.videoTitle,
            thumbnail: restaurant.thumbnail,
            channelId: restaurant.channelId,
            channelName: restaurant.channelName,
            channelAvatar: restaurant.channelAvatar,
            viewCount: restaurant.viewCount,
            publishedAt: new Date(restaurant.publishedAt),
          },
          update: {
            name: restaurant.name,
            viewCount: restaurant.viewCount,
            channelAvatar: restaurant.channelAvatar,
          },
        });
        restaurantsAdded++;
      }
    }

    return NextResponse.json({
      success: true,
      channelsAdded,
      restaurantsAdded,
    });
  } catch (error) {
    console.error("Seed failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
