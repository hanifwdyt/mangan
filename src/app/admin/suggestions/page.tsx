"use client";

import { useEffect, useState } from "react";

interface Suggestion {
  id: string;
  youtubeId: string;
  channelName: string | null;
  suggestedBy: string | null;
  reason: string | null;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  processedAt: string | null;
}

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rejectModal, setRejectModal] = useState<{ id: string; youtubeId: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/admin/suggestions");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch("/api/admin/suggestions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "approve" }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to approve");
        return;
      }

      alert(data.message);
      fetchSuggestions();
    } catch (error) {
      console.error("Failed to approve:", error);
      alert("Failed to approve suggestion");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;

    setProcessing(rejectModal.id);
    try {
      const res = await fetch("/api/admin/suggestions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rejectModal.id,
          action: "reject",
          rejectReason: rejectReason || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to reject");
        return;
      }

      setRejectModal(null);
      setRejectReason("");
      fetchSuggestions();
    } catch (error) {
      console.error("Failed to reject:", error);
      alert("Failed to reject suggestion");
    } finally {
      setProcessing(null);
    }
  };

  const filteredSuggestions = suggestions.filter((s) => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-stone-500">Loading suggestions...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Channel Suggestions</h1>
          <p className="text-stone-500 text-sm mt-1">
            Review and approve channel suggestions from users
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
            {pendingCount} pending
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filteredSuggestions.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          No {filter === "all" ? "" : filter} suggestions found.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-stone-700">
                  Channel
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-stone-700">
                  Reason
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-stone-700">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-stone-700">
                  Date
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-stone-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSuggestions.map((suggestion) => (
                <tr key={suggestion.id} className="hover:bg-stone-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-stone-900">
                        {suggestion.channelName || suggestion.youtubeId}
                      </p>
                      <a
                        href={`https://youtube.com/${suggestion.youtubeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View on YouTube
                      </a>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-stone-500 max-w-xs truncate">
                      {suggestion.reason || "-"}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        suggestion.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : suggestion.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {suggestion.status}
                    </span>
                    {suggestion.rejectReason && (
                      <p className="text-xs text-stone-400 mt-1">
                        {suggestion.rejectReason}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-stone-500">
                      {new Date(suggestion.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {suggestion.status === "pending" && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleApprove(suggestion.id)}
                          disabled={processing === suggestion.id}
                          className="px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                          {processing === suggestion.id ? "..." : "Approve"}
                        </button>
                        <button
                          onClick={() =>
                            setRejectModal({
                              id: suggestion.id,
                              youtubeId: suggestion.youtubeId,
                            })
                          }
                          disabled={processing === suggestion.id}
                          className="px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Reject Suggestion
            </h2>
            <p className="text-stone-500 text-sm mb-4">
              Rejecting suggestion for: <strong>{rejectModal.youtubeId}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                rows={3}
                placeholder="Not a food channel, etc."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                className="flex-1 bg-stone-100 text-stone-700 py-2 px-4 rounded-lg font-medium hover:bg-stone-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing === rejectModal.id}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {processing === rejectModal.id ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
