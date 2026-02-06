import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mangan - Food Discovery from YouTube Reviewers",
  description:
    "Discover restaurants near you based on recommendations from Indonesian food YouTubers",
  openGraph: {
    title: "Mangan - Food Discovery from YouTube Reviewers",
    description:
      "Discover restaurants near you based on recommendations from Indonesian food YouTubers",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className={plusJakartaSans.className}>{children}</body>
    </html>
  );
}
