"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  mapsUrl: string;
  videoId: string;
  videoTitle: string;
  thumbnail: string;
  channelId: string;
  channelName: string;
  viewCount: number | null;
  publishedAt: string;
  createdAt: string;
}

interface Channel {
  id: string;
  name: string;
  youtubeId: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type SortField = "createdAt" | "publishedAt" | "name" | "channelName" | "viewCount";
type SortOrder = "asc" | "desc";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "createdAt", label: "Date Added" },
  { value: "publishedAt", label: "Video Date" },
  { value: "viewCount", label: "Views" },
  { value: "name", label: "Restaurant Name" },
  { value: "channelName", label: "Channel Name" },
];

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);

  // Fetch channels for filter dropdown
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

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sortBy,
        sortOrder,
      });

      if (search) {
        params.set("search", search);
      }
      if (selectedChannel) {
        params.set("channelId", selectedChannel);
      }

      const res = await fetch(`/api/admin/restaurants?${params}`);
      const data = await res.json();

      setRestaurants(data.data || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error("Failed to fetch restaurants:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedChannel, sortBy, sortOrder]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this restaurant?")) return;

    try {
      const res = await fetch(`/api/admin/restaurants?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setRestaurants(restaurants.filter((r) => r.id !== id));
        if (pagination) {
          setPagination({ ...pagination, total: pagination.total - 1 });
        }
      }
    } catch (error) {
      console.error("Failed to delete restaurant:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setSelectedChannel("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const hasActiveFilters = search || selectedChannel || sortBy !== "createdAt" || sortOrder !== "desc";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Restaurants</h1>
        {pagination && (
          <span className="text-sm text-gray-500">
            {pagination.total} total
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 space-y-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, video title, or channel..."
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Channel Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Channel:</label>
            <select
              value={selectedChannel}
              onChange={(e) => {
                setSelectedChannel(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
            >
              <option value="">All Channels</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.youtubeId}>
                  {channel.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortField);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <button
            onClick={() => {
              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              setPage(1);
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            title={sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            {sortOrder === "asc" ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                A-Z / Oldest
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
                Z-A / Newest
              </>
            )}
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Search: "{search}"
                <button
                  onClick={() => {
                    setSearch("");
                    setSearchInput("");
                  }}
                  className="hover:text-blue-900"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {selectedChannel && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Channel: {channels.find((c) => c.youtubeId === selectedChannel)?.name}
                <button
                  onClick={() => setSelectedChannel("")}
                  className="hover:text-green-900"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <svg
              className="animate-spin h-8 w-8 mx-auto mb-2 text-blue-600"
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
            Loading restaurants...
          </div>
        ) : restaurants.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <p className="font-medium">No restaurants found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-[1fr_2fr_1fr_auto] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div>Restaurant</div>
              <div>Video</div>
              <div>Channel</div>
              <div className="w-24 text-right">Actions</div>
            </div>

            <div className="divide-y divide-gray-200">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="p-4 flex flex-col md:grid md:grid-cols-[1fr_2fr_1fr_auto] gap-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Restaurant Info */}
                  <div className="flex gap-3">
                    <div className="relative w-20 h-14 flex-shrink-0">
                      <Image
                        src={restaurant.thumbnail}
                        alt={restaurant.name}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {restaurant.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {restaurant.lat.toFixed(4)}, {restaurant.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  {/* Video Info */}
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {restaurant.videoTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400">
                        Published: {new Date(restaurant.publishedAt).toLocaleDateString()}
                      </p>
                      {restaurant.viewCount && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {formatViewCount(restaurant.viewCount)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Channel */}
                  <div>
                    <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {restaurant.channelName}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      Added: {new Date(restaurant.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-start gap-2 md:w-24 md:justify-end">
                    <a
                      href={`https://www.youtube.com/watch?v=${restaurant.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Watch on YouTube"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    </a>
                    <a
                      href={restaurant.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View on Maps"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </a>
                    <button
                      onClick={() => handleDelete(restaurant.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="border-t border-gray-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
                  {" "}to{" "}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>
                  {" "}of{" "}
                  <span className="font-medium">{pagination.total}</span>
                </div>
                <div className="flex items-center gap-1">
                  {/* First Page */}
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="p-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="First page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  {/* Previous */}
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {/* Page indicator */}
                  <span className="px-3 py-2 text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  {/* Next */}
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  {/* Last Page */}
                  <button
                    onClick={() => setPage(pagination.totalPages)}
                    disabled={page >= pagination.totalPages}
                    className="p-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Last page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
