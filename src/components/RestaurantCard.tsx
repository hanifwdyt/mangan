"use client";

import Image from "next/image";

function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M views`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K views`;
  }
  return `${count} views`;
}

interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  videoId: string;
  videoTitle: string;
  thumbnail: string;
  channelName: string;
  viewCount?: number | null;
  distance?: number;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick?: () => void;
}

export default function RestaurantCard({
  restaurant,
  onClick,
}: RestaurantCardProps) {
  return (
    <div
      className="bg-surface rounded-xl shadow-sm border border-stone-100 overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/20 transition-all active:scale-[0.98] min-h-[44px]"
      onClick={onClick}
    >
      <div className="relative h-32">
        <Image
          src={restaurant.thumbnail}
          alt={restaurant.name}
          fill
          className="object-cover"
        />
        {/* Popular badge (1M+ views) */}
        {restaurant.viewCount && restaurant.viewCount >= 1000000 && (
          <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
            🔥
          </div>
        )}
        {/* Distance badge */}
        {restaurant.distance !== undefined && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-stone-700 text-xs font-medium px-2 py-1 rounded-full shadow-sm">
            {restaurant.distance.toFixed(1)} km
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 text-stone-900">
          {restaurant.name}
        </h3>
        <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
          <span className="text-youtube">▶</span>
          {restaurant.channelName}
          {restaurant.viewCount && (
            <>
              <span className="text-stone-300">•</span>
              <span>{formatViewCount(restaurant.viewCount)}</span>
            </>
          )}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <a
            href={`https://www.youtube.com/watch?v=${restaurant.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-youtube hover:text-red-700 transition-colors min-h-[44px]"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Watch Review
          </a>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-dark transition-colors min-h-[44px]"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Direction
          </a>
        </div>
      </div>
    </div>
  );
}
