"use client";

import { useState, useEffect, useCallback } from "react";

interface Stats {
  channels: number;
  restaurants: number;
  visitors: number;
}

interface SyncStatus {
  id?: string;
  status: "idle" | "running" | "completed" | "failed";
  totalChannels: number;
  currentChannel: number;
  channelName: string | null;
  totalVideos: number;
  processedVideos: number;
  skippedVideos: number;
  added: number;
  updated: number;
  progress: number;
  errors: string[];
  startedAt: string | null;
  completedAt: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ channels: 0, restaurants: 0, visitors: 0 });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sync/status");
      const data = await res.json();
      setSyncStatus(data);

      // Check if sync just completed
      if (data.status === "running") {
        setSyncing(true);
      } else if (syncing && (data.status === "completed" || data.status === "failed")) {
        setSyncing(false);
        if (data.status === "completed") {
          setSyncResult(`Sync complete! Added ${data.added}, updated ${data.updated}`);
        } else {
          setSyncResult(`Sync failed: ${data.errors?.[0] || "Unknown error"}`);
        }
        fetchStats();
      }
    } catch (error) {
      console.error("Failed to fetch sync status:", error);
    }
  }, [syncing]);

  useEffect(() => {
    fetchStats();
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  // Poll for sync status every 2 seconds while syncing
  useEffect(() => {
    if (!syncing) return;

    const interval = setInterval(fetchSyncStatus, 2000);
    return () => clearInterval(interval);
  }, [syncing, fetchSyncStatus]);

  const fetchStats = async () => {
    try {
      const [channelsRes, restaurantsRes, logsRes] = await Promise.all([
        fetch("/api/admin/channels"),
        fetch("/api/admin/restaurants"),
        fetch("/api/admin/logs"),
      ]);

      const channels = await channelsRes.json();
      const restaurants = await restaurantsRes.json();
      const logs = await logsRes.json();

      setStats({
        channels: Array.isArray(channels) ? channels.length : 0,
        restaurants: restaurants.pagination?.total || 0,
        visitors: logs.pagination?.total || 0,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncStatus(null);

    try {
      // Start sync - this will run in background
      fetch("/api/admin/sync", { method: "POST" }).then(async (res) => {
        const data = await res.json();
        // Final status will be picked up by polling
        if (!res.ok) {
          setSyncResult(`Error: ${data.error}`);
          setSyncing(false);
        }
      }).catch((error) => {
        setSyncResult(`Error: ${error}`);
        setSyncing(false);
      });

      // Give a moment for sync to start, then start polling
      setTimeout(fetchSyncStatus, 500);
    } catch (error) {
      setSyncResult(`Error: ${error}`);
      setSyncing(false);
    }
  };

  // Format elapsed time
  const formatElapsed = (startedAt: string | null) => {
    if (!startedAt) return "";
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - start) / 1000);

    if (elapsed < 60) return `${elapsed}s`;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-blue-600">{stats.channels}</div>
          <div className="text-gray-600 text-sm mt-1">YouTube Channels</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-green-600">{stats.restaurants}</div>
          <div className="text-gray-600 text-sm mt-1">Restaurants</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-purple-600">{stats.visitors}</div>
          <div className="text-gray-600 text-sm mt-1">Visitor Logs</div>
        </div>
      </div>

      {/* Sync */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Sync YouTube Data
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Fetch latest videos from all configured channels and extract restaurant
          locations from Google Maps links in descriptions.
        </p>

        {/* Sync Progress */}
        {syncing && syncStatus?.status === "running" && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {syncStatus.channelName
                  ? `Channel: ${syncStatus.channelName} (${syncStatus.currentChannel}/${syncStatus.totalChannels})`
                  : "Starting sync..."}
              </span>
              <span className="text-sm text-gray-500">
                {formatElapsed(syncStatus.startedAt)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${syncStatus.progress}%` }}
              />
            </div>

            <div className="flex flex-wrap justify-between text-sm text-gray-600 gap-2">
              <span>
                Videos: {syncStatus.processedVideos} / {syncStatus.totalVideos}
              </span>
              <span>
                Added: {syncStatus.added} | Updated: {syncStatus.updated}
                {syncStatus.skippedVideos > 0 && (
                  <> | Skipped: {syncStatus.skippedVideos}</>
                )}
              </span>
            </div>
          </div>
        )}

        {syncResult && (
          <div
            className={`text-sm p-3 rounded-lg mb-4 ${
              syncResult.startsWith("Error")
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {syncResult}
          </div>
        )}

        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {syncing ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
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
              Syncing...
            </>
          ) : (
            <>
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync Now
            </>
          )}
        </button>
      </div>
    </div>
  );
}
