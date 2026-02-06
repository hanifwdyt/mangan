"use client";

interface Channel {
  id: string;
  name: string;
  youtubeId: string;
}

interface FilterBarProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  channels: Channel[];
  selectedChannel: string | null;
  onChannelChange: (channelId: string | null) => void;
  sort: "distance" | "newest" | "views";
  onSortChange: (sort: "distance" | "newest" | "views") => void;
}

const RADIUS_OPTIONS = [1, 3, 5, 10, 20];

export default function FilterBar({
  radius,
  onRadiusChange,
  channels,
  selectedChannel,
  onChannelChange,
  sort,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="bg-surface border-b border-stone-200 p-3">
      {/* Horizontal scrollable filters */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {/* Radius pills */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm text-stone-500 font-medium">Radius</span>
          <div className="flex gap-1">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => onRadiusChange(r)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium transition-all min-w-[44px] min-h-[36px] ${
                  radius === r
                    ? "bg-primary text-white shadow-sm"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200 active:scale-95"
                }`}
              >
                {r}km
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-stone-200 flex-shrink-0" />

        {/* Channel filter */}
        {channels.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm text-stone-500 font-medium">Channel</span>
            <select
              value={selectedChannel || ""}
              onChange={(e) => onChannelChange(e.target.value || null)}
              className="text-sm border border-stone-200 rounded-full px-3 py-1.5 bg-white min-h-[36px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.youtubeId}>
                  {channel.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Divider */}
        <div className="w-px bg-stone-200 flex-shrink-0" />

        {/* Sort */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm text-stone-500 font-medium">Sort</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as "distance" | "newest" | "views")}
            className="text-sm border border-stone-200 rounded-full px-3 py-1.5 bg-white min-h-[36px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="distance">Nearest</option>
            <option value="newest">Newest</option>
            <option value="views">Most Viewed</option>
          </select>
        </div>
      </div>
    </div>
  );
}
