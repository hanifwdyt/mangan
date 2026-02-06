"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  videoId: string;
  videoTitle: string;
  thumbnail: string;
  channelName: string;
  channelAvatar?: string | null;
  distance?: number;
}

interface MapProps {
  center: [number, number];
  restaurants: Restaurant[];
  onRestaurantClick?: (restaurant: Restaurant) => void;
  selectedRestaurantId?: string | null;
}

export interface MapHandle {
  panToRestaurant: (restaurantId: string) => void;
}

const MapComponent = forwardRef<MapHandle, MapProps>(function MapComponent(
  { center, restaurants, onRestaurantClick, selectedRestaurantId },
  ref
) {
  const mapRef = useRef<L.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Expose panToRestaurant method
  useImperativeHandle(ref, () => ({
    panToRestaurant: (restaurantId: string) => {
      const marker = markerMapRef.current.get(restaurantId);
      if (marker && mapRef.current) {
        const restaurant = restaurants.find((r) => r.id === restaurantId);
        if (restaurant) {
          mapRef.current.setView([restaurant.lat, restaurant.lng], 16, {
            animate: true,
          });
          // Small delay to ensure map has panned before opening popup
          setTimeout(() => {
            marker.openPopup();
          }, 300);
        }
      }
    },
  }));

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Fix default marker icon
    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
      ._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    const map = L.map(containerRef.current).setView(center, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Add user location marker with orange color
    const userIcon = L.divIcon({
      className: "user-marker",
      html: '<div class="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg pulse" style="background-color: #F97316;"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    L.marker(center, { icon: userIcon }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center when it changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, 13);
    }
  }, [center]);

  // Update markers when restaurants change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing markers
    if (markersRef.current) {
      mapRef.current.removeLayer(markersRef.current);
    }

    // Clear marker map
    markerMapRef.current.clear();

    // Create marker cluster group
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markers = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });

    restaurants.forEach((restaurant) => {
      // Create custom icon - use channel avatar if available, fallback to emoji
      let icon: L.DivIcon;

      if (restaurant.channelAvatar) {
        icon = L.divIcon({
          className: "restaurant-marker-avatar",
          html: `<div style="width: 36px; height: 36px; border-radius: 50%; border: 3px solid #F97316; box-shadow: 0 2px 8px rgba(0,0,0,0.3); overflow: hidden; background: white;">
            <img src="${restaurant.channelAvatar}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='🍜'" />
          </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
        });
      } else {
        icon = L.divIcon({
          className: "restaurant-marker",
          html: '<div style="width: 32px; height: 32px; background-color: #F97316; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">🍜</div>',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });
      }

      const marker = L.marker([restaurant.lat, restaurant.lng], {
        icon,
      });

      // Store marker reference
      markerMapRef.current.set(restaurant.id, marker);

      // Create Google Maps directions URL
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`;

      // Create popup content with 2 action buttons
      const popupContent = `
        <div class="restaurant-popup" style="width: 280px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif;">
          <img
            src="${restaurant.thumbnail}"
            alt="${restaurant.name}"
            style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px 8px 0 0;"
          />
          <div style="padding: 12px;">
            <h3 style="font-weight: 600; margin: 0 0 4px; font-size: 14px; line-height: 1.4; color: #1C1917;">
              ${restaurant.name}
            </h3>
            <p style="color: #78716C; font-size: 12px; margin: 0 0 4px; display: flex; align-items: center; gap: 4px;">
              <span style="color: #FF0000;">▶</span>
              ${restaurant.channelName}
            </p>
            ${restaurant.distance ? `<p style="color: #A8A29E; font-size: 11px; margin: 0 0 12px;">${restaurant.distance.toFixed(1)} km away</p>` : '<div style="height: 12px;"></div>'}
            <div style="display: flex; gap: 8px;">
              <a
                href="https://www.youtube.com/watch?v=${restaurant.videoId}"
                target="_blank"
                rel="noopener noreferrer"
                style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; background: #FF0000; color: white; padding: 10px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; text-decoration: none; min-height: 44px;"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Watch
              </a>
              <a
                href="${directionsUrl}"
                target="_blank"
                rel="noopener noreferrer"
                style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; background: #F97316; color: white; padding: 10px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; text-decoration: none; min-height: 44px;"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Directions
              </a>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup',
      });

      marker.on("click", () => {
        onRestaurantClick?.(restaurant);
      });

      markers.addLayer(marker);
    });

    mapRef.current.addLayer(markers);
    markersRef.current = markers;
  }, [restaurants, onRestaurantClick]);

  // Handle selectedRestaurantId changes
  useEffect(() => {
    if (selectedRestaurantId) {
      const marker = markerMapRef.current.get(selectedRestaurantId);
      if (marker && mapRef.current) {
        const restaurant = restaurants.find((r) => r.id === selectedRestaurantId);
        if (restaurant) {
          mapRef.current.setView([restaurant.lat, restaurant.lng], 16, {
            animate: true,
          });
          setTimeout(() => {
            marker.openPopup();
          }, 300);
        }
      }
    }
  }, [selectedRestaurantId, restaurants]);

  return <div ref={containerRef} className="w-full h-full" />;
});

export default MapComponent;
