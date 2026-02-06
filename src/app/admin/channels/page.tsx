"use client";

import { useState, useEffect } from "react";

interface Channel {
  id: string;
  name: string;
  youtubeId: string;
  createdAt: string;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChannelId, setNewChannelId] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/admin/channels");
      const data = await res.json();
      if (Array.isArray(data)) {
        setChannels(data);
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelId.trim()) return;

    setAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeId: newChannelId.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setChannels([data, ...channels]);
        setNewChannelId("");
      } else {
        setError(data.error || "Failed to add channel");
      }
    } catch {
      setError("Failed to add channel");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm("Are you sure you want to delete this channel?")) return;

    try {
      const res = await fetch(`/api/admin/channels?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setChannels(channels.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete channel:", error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">YouTube Channels</h1>

      {/* Add channel form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Add New Channel
        </h2>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleAddChannel} className="flex gap-3">
          <input
            type="text"
            value={newChannelId}
            onChange={(e) => setNewChannelId(e.target.value)}
            placeholder="Enter @username or channel ID (UCxxx)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={adding || !newChannelId.trim()}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add Channel"}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          You can enter either a YouTube handle (e.g., @KenAndGrat) or a channel
          ID (e.g., UCxxxxxxx)
        </p>
      </div>

      {/* Channel list */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Channel Name
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                YouTube ID
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Added
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : channels.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No channels configured. Add a channel above to get started.
                </td>
              </tr>
            ) : (
              channels.map((channel) => (
                <tr key={channel.id}>
                  <td className="px-6 py-4">
                    <a
                      href={`https://www.youtube.com/channel/${channel.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {channel.name}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {channel.youtubeId}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(channel.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteChannel(channel.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
