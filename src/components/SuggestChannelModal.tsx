"use client";

import { useState } from "react";

interface SuggestChannelModalProps {
  onClose: () => void;
}

export default function SuggestChannelModal({ onClose }: SuggestChannelModalProps) {
  const [youtubeId, setYoutubeId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!youtubeId.trim()) {
      setError("Please enter a YouTube channel");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeId: youtubeId.trim(),
          reason: reason.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit suggestion");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit suggestion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
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

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">
              Thanks for your suggestion!
            </h2>
            <p className="text-stone-500 text-sm mb-6">
              We&apos;ll review the channel and add it if it fits our criteria.
            </p>
            <button
              onClick={onClose}
              className="bg-primary text-white py-3 px-6 rounded-xl font-medium hover:bg-primary-dark transition-all active:scale-[0.98] min-h-[48px]"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-stone-900 mb-2">
              Suggest a Food Channel
            </h2>
            <p className="text-stone-500 text-sm mb-6">
              Know a great Indonesian food YouTuber? Let us know and we&apos;ll consider adding them!
            </p>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  YouTube Channel <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={youtubeId}
                  onChange={(e) => setYoutubeId(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="@username or channel URL"
                />
                <p className="text-xs text-stone-400 mt-1">
                  e.g., @NexCarlos or https://youtube.com/@NexCarlos
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Why this channel? (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  rows={3}
                  placeholder="Great reviews, covers unique places, etc."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 px-4 rounded-xl font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[48px]"
              >
                {loading ? (
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
                    Submitting...
                  </>
                ) : (
                  "Submit Suggestion"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
