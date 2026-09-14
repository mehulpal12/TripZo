"use client";

import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { useRideStore } from "@/stores/ride.store";
import { MOCK_RIDER_LOCATION } from "@/config/mockLocation";
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader";

const containerStyle = {
  width: "100%",
  height: "100%",
};

// Subtle silver map style matching the Tripzo aesthetic
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#f8f9fa" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#1e293b" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  ],
};

export default function MapContainer() {
  const { isLoaded, loadError } = useGoogleMapsLoader();

  const { pickup, destination, activeRide } = useRideStore();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  // Effective coordinates: active ride takes precedence, then store, then mock rider location
  const effectivePickup = useMemo(() => {
    if (activeRide?.pickup) return activeRide.pickup;
    if (pickup) return pickup;
    return MOCK_RIDER_LOCATION;
  }, [activeRide?.pickup, pickup]);

  const effectiveDestination = useMemo(() => {
    if (activeRide?.destination) return activeRide.destination;
    return destination;
  }, [activeRide?.destination, destination]);

  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  // Traffic layer toggle
  useEffect(() => {
    if (!map || !window.google?.maps) return;
    if (showTraffic) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new window.google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(map);
    } else {
      trafficLayerRef.current?.setMap(null);
    }
  }, [map, showTraffic]);

  // Fetch directions between pickup and destination
  useEffect(() => {
    if (!isLoaded || !window.google?.maps || !effectivePickup || !effectiveDestination) {
      setDirections(null);
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: { lat: effectivePickup.lat, lng: effectivePickup.lng },
        destination: { lat: effectiveDestination.lat, lng: effectiveDestination.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);

          if (map) {
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(effectivePickup);
            bounds.extend(effectiveDestination);
            if (activeRide?.captainLocation) {
              bounds.extend(activeRide.captainLocation);
            }
            map.fitBounds(bounds, { top: 50, bottom: 200, left: 50, right: 50 });
          }
        }
      }
    );
  }, [isLoaded, effectivePickup, effectiveDestination, map, activeRide?.captainLocation]);

  // High-contrast self-contained SVG markers
  const riderMarkerIcon = useMemo(() => {
    if (!isLoaded || !window.google?.maps) return undefined;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="17" fill="#111111" stroke="#FFD600" stroke-width="3"/>
        <circle cx="20" cy="20" r="7" fill="#FFD600"/>
        <circle cx="20" cy="20" r="3" fill="#111111"/>
      </svg>
    `;
    return {
      url: `data:image/svg+xml;utf-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(38, 38),
      anchor: new window.google.maps.Point(19, 19),
    };
  }, [isLoaded]);

  const destMarkerIcon = useMemo(() => {
    if (!isLoaded || !window.google?.maps) return undefined;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="17" fill="#111111" stroke="#10B981" stroke-width="3"/>
        <rect x="14" y="14" width="12" height="12" rx="2" fill="#10B981"/>
        <path d="M16 20 L19 23 L24 17" stroke="#111111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      </svg>
    `;
    return {
      url: `data:image/svg+xml;utf-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(38, 38),
      anchor: new window.google.maps.Point(19, 19),
    };
  }, [isLoaded]);

  const captainMarkerIcon = useMemo(() => {
    if (!isLoaded || !window.google?.maps) return undefined;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46">
        <circle cx="23" cy="23" r="21" fill="#111111" stroke="#FFD600" stroke-width="3.5"/>
        <circle cx="23" cy="23" r="14" fill="#1E293B"/>
        <polygon points="23,12 30,30 23,26 16,30" fill="#FFD600"/>
      </svg>
    `;
    return {
      url: `data:image/svg+xml;utf-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(46, 46),
      anchor: new window.google.maps.Point(23, 23),
    };
  }, [isLoaded]);

  const handleRecenter = () => {
    if (!map) return;
    if (activeRide?.captainLocation) {
      map.panTo(activeRide.captainLocation);
      map.setZoom(16);
    } else if (effectivePickup) {
      map.panTo(effectivePickup);
      map.setZoom(15);
    }
  };

  if (loadError) {
    return (
      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <span className="material-symbols-outlined text-4xl text-rose-400 mb-2">map_error</span>
        <p className="text-sm font-bold">Failed to load Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) return <div className="w-full h-full bg-muted animate-pulse" />;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={effectivePickup}
      zoom={14}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      {/* Rider Pickup Marker (Mock Location or Active Ride Pickup) */}
      {effectivePickup && (
        <Marker
          position={{ lat: effectivePickup.lat, lng: effectivePickup.lng }}
          icon={riderMarkerIcon}
          zIndex={90}
          title={`Pickup: ${effectivePickup.address || "Your Location"}`}
        />
      )}

      {/* Destination Marker */}
      {effectiveDestination && (
        <Marker
          position={{ lat: effectiveDestination.lat, lng: effectiveDestination.lng }}
          icon={destMarkerIcon}
          zIndex={90}
          title={`Destination: ${effectiveDestination.address || "Dropoff Point"}`}
        />
      )}

      {/* Directions Polyline */}
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            polylineOptions: { strokeColor: "#111827", strokeWeight: 5, strokeOpacity: 0.85 },
            suppressMarkers: true,
          }}
        />
      )}

      {/* Captain Live Location Marker (Updated Real-Time via Socket.IO) */}
      {activeRide?.captainLocation && (
        <Marker
          position={{
            lat: activeRide.captainLocation.lat,
            lng: activeRide.captainLocation.lng,
          }}
          icon={captainMarkerIcon}
          zIndex={100}
          title="Captain Live GPS Position"
        />
      )}

      {/* Map Overlays (Only visible during active ride) */}
      {activeRide && (
        <>
          {/* Interactive State Selector Bar (Top Right) */}
          <div className="absolute top-space-md right-space-md z-30 flex flex-wrap items-center gap-1 p-1 rounded-full bg-[#111111] border border-gray-800 shadow-xl">
            <span className="font-telemetry-sm text-[11px] text-gray-300 px-2 uppercase font-bold hidden sm:inline">State:</span>
            <span className={`px-space-sm py-1 rounded-full font-label-sm text-xs font-black shadow-md ${activeRide.status === 'IN_PROGRESS'
                ? 'bg-emerald-400 text-black'
                : 'bg-[#FFD600] text-[#111111]'
              }`}>
              {activeRide.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Captain Live Movement Badge (Top Center) */}
          {activeRide.captainLocation && (
            <div className="absolute top-space-md left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-sm pointer-events-none">
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-full bg-[#111111]/95 text-white border border-slate-700 shadow-xl backdrop-blur-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD600] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFD600]"></span>
                </span>
                <span className="text-xs font-extrabold text-[#FFD600] tracking-wide">
                  Captain is Live on GPS ({activeRide.captainLocation.lat.toFixed(4)}, {activeRide.captainLocation.lng.toFixed(4)})
                </span>
              </div>
            </div>
          )}

          {/* Map Controller Floating Buttons */}
          <div className="absolute bottom-space-lg right-space-md z-20 flex flex-col gap-space-xs">
            <button
              onClick={handleRecenter}
              aria-label="Recenter live track"
              className="w-11 h-11 rounded-full bg-[#111111] text-white hover:text-[#FFD600] hover:bg-black border border-gray-800 flex items-center justify-center shadow-xl transition-all"
              type="button"
              title="Recenter Map on Captain / Pickup"
            >
              <span className="material-symbols-outlined text-xl">my_location</span>
            </button>
            <button
              onClick={() => setShowTraffic(prev => !prev)}
              aria-label="Traffic conditions"
              className={`w-11 h-11 rounded-full border flex items-center justify-center shadow-xl transition-all ${showTraffic ? 'bg-[#FFD600] text-black border-yellow-400' : 'bg-[#111111] text-white hover:text-[#FFD600] hover:bg-black border-gray-800'
                }`}
              type="button"
              title="Toggle Traffic Conditions"
            >
              <span className="material-symbols-outlined text-xl">traffic</span>
            </button>
          </div>
        </>
      )}
    </GoogleMap>
  );
}
