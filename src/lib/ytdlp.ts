import YTDlpWrap from "yt-dlp-wrap";

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  upload_date: string;
  channel_id: string;
  channel: string;
  view_count?: number;
}

interface YtdlpPlaylistItem {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url: string }>;
  upload_date?: string;
  channel_id?: string;
  channel?: string;
  uploader?: string;
  uploader_id?: string;
  view_count?: number;
}

/**
 * Get all videos from a YouTube channel using yt-dlp
 * Uses --flat-playlist for fast initial fetch (no description)
 */
export async function getChannelVideoIds(channelUrl: string): Promise<string[]> {
  const ytdlp = new YTDlpWrap();

  const output = await ytdlp.execPromise([
    channelUrl,
    "--flat-playlist",
    "--dump-json",
    "--no-warnings",
    "--ignore-errors",
  ]);

  if (!output || !output.trim()) {
    return [];
  }

  const videoIds = output
    .trim()
    .split("\n")
    .filter((line) => line && line.startsWith("{"))
    .map((line) => {
      try {
        const data = JSON.parse(line) as YtdlpPlaylistItem;
        return data.id;
      } catch {
        return null;
      }
    })
    .filter((id): id is string => id !== null);

  return videoIds;
}

/**
 * Get full video details including description
 * This is slower but gives us complete data
 */
export async function getVideoDetails(videoId: string): Promise<VideoInfo | null> {
  const ytdlp = new YTDlpWrap();

  try {
    const output = await ytdlp.execPromise([
      `https://www.youtube.com/watch?v=${videoId}`,
      "--dump-json",
      "--no-warnings",
      "--skip-download",
    ]);

    const data = JSON.parse(output) as YtdlpPlaylistItem;

    return {
      id: data.id,
      title: data.title || "",
      description: data.description || "",
      thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || "",
      upload_date: data.upload_date || "",
      channel_id: data.channel_id || data.uploader_id || "",
      channel: data.channel || data.uploader || "",
      view_count: data.view_count,
    };
  } catch (error) {
    console.error(`Failed to get details for video ${videoId}:`, error);
    return null;
  }
}

/**
 * Get videos in batches with full details
 * Processes videos with a small delay to be respectful
 */
export async function getVideosWithDetails(
  videoIds: string[],
  onProgress?: (current: number, total: number) => void
): Promise<VideoInfo[]> {
  const videos: VideoInfo[] = [];

  for (let i = 0; i < videoIds.length; i++) {
    const video = await getVideoDetails(videoIds[i]);
    if (video) {
      videos.push(video);
    }

    if (onProgress) {
      onProgress(i + 1, videoIds.length);
    }

    // Small delay to avoid hammering YouTube
    if (i < videoIds.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return videos;
}

/**
 * Construct channel URL from handle or ID
 */
export function getChannelUrl(handleOrId: string): string {
  if (handleOrId.startsWith("UC")) {
    return `https://www.youtube.com/channel/${handleOrId}/videos`;
  }
  if (handleOrId.startsWith("@")) {
    return `https://www.youtube.com/${handleOrId}/videos`;
  }
  return `https://www.youtube.com/@${handleOrId}/videos`;
}

/**
 * Convert upload_date (YYYYMMDD) to Date object
 */
export function parseUploadDate(uploadDate: string): Date {
  if (!uploadDate || uploadDate.length !== 8) {
    return new Date();
  }
  const year = parseInt(uploadDate.substring(0, 4), 10);
  const month = parseInt(uploadDate.substring(4, 6), 10) - 1;
  const day = parseInt(uploadDate.substring(6, 8), 10);
  return new Date(year, month, day);
}
