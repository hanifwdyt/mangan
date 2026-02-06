const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
}

interface YouTubeSearchResult {
  kind: string;
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      channelId: string;
      channelTitle: string;
      thumbnails: {
        high?: { url: string };
        medium?: { url: string };
        default?: { url: string };
      };
    };
  }>;
  nextPageToken?: string;
}

interface YouTubeVideoListResult {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      channelId: string;
      channelTitle: string;
      thumbnails: {
        high?: { url: string };
        medium?: { url: string };
        default?: { url: string };
      };
    };
  }>;
}

/**
 * Get YouTube API key from environment
 */
function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error("YOUTUBE_API_KEY is not configured");
  }
  return key;
}

/**
 * Search for videos from a specific channel
 */
export async function searchChannelVideos(
  channelId: string,
  maxResults: number = 50,
  pageToken?: string
): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    part: "snippet",
    channelId,
    type: "video",
    maxResults: maxResults.toString(),
    order: "date",
    key: getApiKey(),
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`YouTube API error: ${error}`);
  }

  const data: YouTubeSearchResult = await response.json();

  const videos: YouTubeVideo[] = data.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail:
      item.snippet.thumbnails.high?.url ||
      item.snippet.thumbnails.medium?.url ||
      item.snippet.thumbnails.default?.url ||
      "",
    publishedAt: item.snippet.publishedAt,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
  }));

  return { videos, nextPageToken: data.nextPageToken };
}

/**
 * Get full video details including full description
 * Search API only returns truncated description
 */
export async function getVideoDetails(
  videoIds: string[]
): Promise<YouTubeVideo[]> {
  if (videoIds.length === 0) return [];

  // API allows max 50 IDs per request
  const batches: string[][] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    batches.push(videoIds.slice(i, i + 50));
  }

  const allVideos: YouTubeVideo[] = [];

  for (const batch of batches) {
    const params = new URLSearchParams({
      part: "snippet",
      id: batch.join(","),
      key: getApiKey(),
    });

    const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`YouTube API error: ${error}`);
    }

    const data: YouTubeVideoListResult = await response.json();

    const videos: YouTubeVideo[] = data.items.map((item) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail:
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url ||
        "",
      publishedAt: item.snippet.publishedAt,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
    }));

    allVideos.push(...videos);
  }

  return allVideos;
}

/**
 * Resolve @username to channel ID
 */
export async function resolveChannelId(
  handleOrId: string
): Promise<{ id: string; title: string } | null> {
  // If it's already a channel ID (starts with UC), return as-is
  if (handleOrId.startsWith("UC")) {
    // Get channel info
    const params = new URLSearchParams({
      part: "snippet",
      id: handleOrId,
      key: getApiKey(),
    });

    const response = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return {
        id: data.items[0].id,
        title: data.items[0].snippet.title,
      };
    }
    return null;
  }

  // Handle @username format
  const handle = handleOrId.startsWith("@")
    ? handleOrId.substring(1)
    : handleOrId;

  const params = new URLSearchParams({
    part: "snippet",
    forHandle: handle,
    key: getApiKey(),
  });

  const response = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`);
  if (!response.ok) return null;

  const data = await response.json();
  if (data.items && data.items.length > 0) {
    return {
      id: data.items[0].id,
      title: data.items[0].snippet.title,
    };
  }

  return null;
}

/**
 * Get channel avatar/thumbnail URL
 */
export async function getChannelAvatar(
  channelId: string
): Promise<string | null> {
  const params = new URLSearchParams({
    part: "snippet",
    id: channelId,
    key: getApiKey(),
  });

  const response = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`);
  if (!response.ok) return null;

  const data = await response.json();
  if (data.items && data.items.length > 0) {
    const thumbnails = data.items[0].snippet.thumbnails;
    return (
      thumbnails.default?.url ||
      thumbnails.medium?.url ||
      thumbnails.high?.url ||
      null
    );
  }

  return null;
}
