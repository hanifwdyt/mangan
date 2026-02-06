/**
 * Extract coordinates from various Google Maps URL formats
 */
export async function extractCoordsFromMapsUrl(
  url: string
): Promise<{ lat: number; lng: number } | null> {
  let fullUrl = url;

  // Handle short URLs - need to follow redirect
  if (url.includes("maps.app.goo.gl") || url.includes("goo.gl/maps")) {
    try {
      const resolved = await resolveShortUrl(url);
      if (resolved) {
        fullUrl = resolved;
      }
    } catch {
      return null;
    }
  }

  return parseCoordinates(fullUrl);
}

/**
 * Parse coordinates from a full Google Maps URL
 */
export function parseCoordinates(
  url: string
): { lat: number; lng: number } | null {
  // Format: /@-6.123,106.456,17z
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    return {
      lat: parseFloat(atMatch[1]),
      lng: parseFloat(atMatch[2]),
    };
  }

  // Format: ?q=-6.123,106.456
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) {
    return {
      lat: parseFloat(qMatch[1]),
      lng: parseFloat(qMatch[2]),
    };
  }

  // Format: !3d-6.123!4d106.456
  const dMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (dMatch) {
    return {
      lat: parseFloat(dMatch[1]),
      lng: parseFloat(dMatch[2]),
    };
  }

  // Format: /place/.../@-6.123,106.456
  const placeMatch = url.match(/\/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (placeMatch) {
    return {
      lat: parseFloat(placeMatch[1]),
      lng: parseFloat(placeMatch[2]),
    };
  }

  return null;
}

/**
 * Resolve short URL to full URL by following redirects
 */
async function resolveShortUrl(shortUrl: string): Promise<string | null> {
  try {
    const response = await fetch(shortUrl, {
      method: "HEAD",
      redirect: "follow",
    });
    return response.url;
  } catch {
    // If HEAD fails, try GET with manual redirect handling
    try {
      const response = await fetch(shortUrl, {
        redirect: "manual",
      });
      const location = response.headers.get("location");
      if (location) {
        // Might need to follow another redirect
        if (
          location.includes("maps.app.goo.gl") ||
          location.includes("goo.gl")
        ) {
          return resolveShortUrl(location);
        }
        return location;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Find all Google Maps URLs in a text
 */
export function findMapsUrls(text: string): string[] {
  const patterns = [
    /https?:\/\/maps\.app\.goo\.gl\/[a-zA-Z0-9]+/g,
    /https?:\/\/goo\.gl\/maps\/[a-zA-Z0-9]+/g,
    /https?:\/\/(?:www\.)?google\.com\/maps\/[^\s)>\]]+/g,
    /https?:\/\/maps\.google\.com\/[^\s)>\]]+/g,
  ];

  const urls: string[] = [];
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      urls.push(...matches);
    }
  }

  // Deduplicate
  return [...new Set(urls)];
}

/**
 * Extract restaurant name from Maps URL or video context
 */
export function extractPlaceName(url: string): string | null {
  // Try to extract from /place/Name+Here/ format
  const placeMatch = url.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    // Decode URL encoding and replace + with space
    return decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
  }

  return null;
}
