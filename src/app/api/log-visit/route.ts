import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng } = body;

    // Get IP and user agent
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1"; // Fallback for local dev
    const userAgent = request.headers.get("user-agent") || null;

    // Detect device type from user agent
    let device: string | null = null;
    if (userAgent) {
      if (/mobile/i.test(userAgent)) {
        device = "mobile";
      } else if (/tablet|ipad/i.test(userAgent)) {
        device = "tablet";
      } else {
        device = "desktop";
      }
    }

    await prisma.visitorLog.create({
      data: {
        lat: lat || null,
        lng: lng || null,
        ip,
        userAgent,
        device,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to log visit:", error);
    return NextResponse.json({ success: true }); // Don't fail silently
  }
}
