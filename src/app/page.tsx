"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import LocationPrompt from "@/components/LocationPrompt";
import FilterBar from "@/components/FilterBar";
import RestaurantCard from "@/components/RestaurantCard";
import SuggestChannelModal from "@/components/SuggestChannelModal";
import type { MapHandle } from "@/components/Map";

// Dynamic import for Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-background flex items-center justify-center">
      <div className="text-stone-500">Loading map...</div>
    </div>
  ),
});

interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  videoId: string;
  videoTitle: string;
  thumbnail: string;
  channelId: string;
  channelName: string;
  channelAvatar?: string | null;
  viewCount?: number | null;
  distance?: number;
}

interface Channel {
  id: string;
  name: string;
  youtubeId: string;
}

export default function Home() {
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [radius, setRadius] = useState(5);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [sort, setSort] = useState<"distance" | "newest" | "views">("distance");

  // Bottom sheet visibility on mobile
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // Suggest channel modal
  const [showSuggestModal, setShowSuggestModal] = useState(false);

  // Selected restaurant for map pan
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const mapRef = useRef<MapHandle>(null);

  // Fetch channels for filter
  useEffect(() => {
    fetch("/api/admin/channels")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setChannels(data);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch restaurants when location or filters change
  const fetchRestaurants = useCallback(async () => {
    if (!location) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        radius: radius.toString(),
        sort,
      });

      if (selectedChannel) {
        params.set("channelId", selectedChannel);
      }

      const res = await fetch(`/api/restaurants?${params}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setRestaurants(data);
      }
    } catch (error) {
      console.error("Failed to fetch restaurants:", error);
    } finally {
      setLoading(false);
    }
  }, [location, radius, selectedChannel, sort]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Log visit when location is set
  const handleLocationSet = (lat: number, lng: number) => {
    setLocation({ lat, lng });
    setShowLocationPrompt(false);

    // Log visit in background (silent fail)
    fetch("/api/log-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    }).catch(() => {});
  };

  return (
    <main className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900">
          🍜 Mangan
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSuggestModal(true)}
            className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors min-h-[44px]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="hidden sm:inline">Suggest Channel</span>
          </button>
          <button
            onClick={() => setShowLocationPrompt(true)}
            className="text-sm text-stone-600 hover:text-stone-900 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors min-h-[44px]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="hidden sm:inline">Change Location</span>
          </button>
        </div>
      </header>

      {/* Filter bar */}
      {location && (
        <FilterBar
          radius={radius}
          onRadiusChange={setRadius}
          channels={channels}
          selectedChannel={selectedChannel}
          onChannelChange={setSelectedChannel}
          sort={sort}
          onSortChange={setSort}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          {location && (
            <Map
              ref={mapRef}
              center={[location.lat, location.lng]}
              restaurants={restaurants}
              selectedRestaurantId={selectedRestaurantId}
            />
          )}

          {/* Mobile FAB to show restaurant list */}
          <button
            onClick={() => setShowBottomSheet(true)}
            className="lg:hidden absolute bottom-6 right-4 bg-primary text-white shadow-lg rounded-full p-4 z-10 flex items-center gap-2 min-w-[44px] min-h-[44px] active:scale-95 transition-transform"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <span className="font-medium text-sm">
              {restaurants.length} places
            </span>
          </button>

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <div className="bg-surface rounded-xl shadow-lg px-4 py-3 flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-sm text-stone-600">Finding restaurants...</span>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-80 bg-surface border-l border-stone-200">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-stone-200">
              <h2 className="font-semibold text-stone-900 mb-3">
                {restaurants.length} Restaurant{restaurants.length !== 1 ? "s" : ""} Found
              </h2>
              {/* Sort toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSort("distance")}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                    sort === "distance"
                      ? "bg-primary text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  📍 Nearest
                </button>
                <button
                  onClick={() => setSort("views")}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                    sort === "views"
                      ? "bg-primary text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  🔥 Most Viewed
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
              {restaurants.length === 0 && !loading && (
                <div className="text-center text-stone-500 py-8">
                  <p>No restaurants found in this area.</p>
                  <p className="text-sm mt-1">Try expanding the radius.</p>
                </div>
              )}

              {restaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onClick={() => setSelectedRestaurantId(restaurant.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Bottom Sheet */}
        {showBottomSheet && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-20"
            onClick={() => setShowBottomSheet(false)}
          >
            <div
              className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 bg-stone-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-4 pb-3 border-b border-stone-200">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-stone-900">
                    {restaurants.length} Restaurant{restaurants.length !== 1 ? "s" : ""} Found
                  </h2>
                  <button
                    onClick={() => setShowBottomSheet(false)}
                    className="text-stone-400 hover:text-stone-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                {/* Sort toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSort("distance")}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                      sort === "distance"
                        ? "bg-primary text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    📍 Nearest
                  </button>
                  <button
                    onClick={() => setSort("views")}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                      sort === "views"
                        ? "bg-primary text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    🔥 Most Viewed
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
                {restaurants.length === 0 && !loading && (
                  <div className="text-center text-stone-500 py-8">
                    <p>No restaurants found in this area.</p>
                    <p className="text-sm mt-1">Try expanding the radius.</p>
                  </div>
                )}

                {restaurants.map((restaurant) => (
                  <RestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    onClick={() => {
                      setSelectedRestaurantId(restaurant.id);
                      setShowBottomSheet(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location prompt modal */}
      {showLocationPrompt && (
        <LocationPrompt
          onLocationSet={handleLocationSet}
          onClose={() => {
            if (location) {
              setShowLocationPrompt(false);
            }
          }}
        />
      )}

      {/* Suggest channel modal */}
      {showSuggestModal && (
        <SuggestChannelModal onClose={() => setShowSuggestModal(false)} />
      )}
    </main>
  );
}
