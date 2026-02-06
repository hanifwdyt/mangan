"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface LocationPromptProps {
  onLocationSet: (lat: number, lng: number) => void;
  onClose: () => void;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function LocationPrompt({
  onLocationSet,
  onClose,
}: LocationPromptProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualLat, setManualLat] = useState("-6.2088");
  const [manualLng, setManualLng] = useState("106.8456");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search using Nominatim API
  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=id&limit=5`,
        {
          headers: {
            "Accept-Language": "id,en",
          },
        }
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch {
      console.error("Search failed");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setError(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchLocation(value);
    }, 300);
  };

  // Select search result
  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onLocationSet(lat, lng);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false);
        onLocationSet(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        setLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location access denied. Try searching or enter manually.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location unavailable. Try searching or enter manually.");
            break;
          case err.TIMEOUT:
            setError("Location request timed out. Try searching or enter manually.");
            break;
          default:
            setError("Failed to get location. Try searching or enter manually.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      setError("Please enter valid coordinates");
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Coordinates out of range");
      return;
    }

    onLocationSet(lat, lng);
  };

  const handleUseJakarta = () => {
    onLocationSet(-6.2088, 106.8456); // Jakarta center
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

        <h2 className="text-xl font-bold text-stone-900 mb-2">
          Find Restaurants Near You
        </h2>
        <p className="text-stone-500 text-sm mb-6">
          We need your location to show nearby restaurants reviewed by food YouTubers.
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {!manualMode ? (
          <div className="space-y-4">
            {/* Location Search Input */}
            <div ref={searchRef} className="relative">
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Search Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  className="w-full px-4 py-3 pr-10 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Search city, area, or place..."
                />
                {isSearching ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      className="animate-spin h-5 w-5 text-stone-400"
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
                  </div>
                ) : (
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
                  {searchResults.map((result) => (
                    <button
                      key={result.place_id}
                      onClick={() => handleSelectResult(result)}
                      className="w-full text-left px-4 py-3 hover:bg-stone-50 active:bg-stone-100 transition-colors border-b border-stone-100 last:border-b-0 min-h-[44px]"
                    >
                      <p className="text-sm text-stone-900 line-clamp-2">
                        {result.display_name}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200"></div>
              </div>
              <span className="relative bg-surface px-3 text-sm text-stone-500">or</span>
            </div>

            <button
              onClick={handleGetLocation}
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
                  Getting location...
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Use My Current Location
                </>
              )}
            </button>

            <button
              onClick={handleUseJakarta}
              className="w-full bg-stone-100 text-stone-700 py-3 px-4 rounded-xl font-medium hover:bg-stone-200 transition-all active:scale-[0.98] min-h-[48px]"
            >
              Use Jakarta (Default)
            </button>

            <button
              onClick={() => setManualMode(true)}
              className="w-full text-stone-500 text-sm hover:text-stone-700 py-2 min-h-[44px]"
            >
              Enter coordinates manually
            </button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Latitude
              </label>
              <input
                type="text"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="-6.2088"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Longitude
              </label>
              <input
                type="text"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="106.8456"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="flex-1 bg-stone-100 text-stone-700 py-3 px-4 rounded-xl font-medium hover:bg-stone-200 transition-all active:scale-[0.98] min-h-[48px]"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary text-white py-3 px-4 rounded-xl font-medium hover:bg-primary-dark transition-all active:scale-[0.98] min-h-[48px]"
              >
                Set Location
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
