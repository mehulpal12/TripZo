"use client";

import { useJsApiLoader, GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { useCallback, useState, useEffect } from "react";
import { useRideStore } from "@/stores/ride.store";
import { Navigation } from "lucide-react";

const containerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 28.7041, // Default to Delhi
  lng: 77.1025,
};

// Subtle silver map style to match the Tripzo aesthetic
const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
    { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
    { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  ],
};

export default function MapContainer() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const { pickup, destination, activeRide } = useRideStore();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  // Fetch directions when pickup and destination are set
  useEffect(() => {
    if (!isLoaded || !pickup || !destination) return;

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          
          // Fit bounds
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(pickup);
          bounds.extend(destination);
          map?.fitBounds(bounds, { top: 50, bottom: 400, left: 50, right: 50 }); // Padding for bottom sheet
        }
      }
    );
  }, [isLoaded, pickup, destination, map]);

  if (!isLoaded) return <div className="w-full h-full bg-muted animate-pulse" />;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={pickup || defaultCenter}
      zoom={14}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      {/* Pickup Marker */}
      {pickup && !directions && (
        <Marker position={{ lat: pickup.lat, lng: pickup.lng }} icon={{ url: "/markers/pickup.png", scaledSize: new window.google.maps.Size(32, 32) }} />
      )}
      
      {/* Destination Marker */}
      {destination && !directions && (
        <Marker position={{ lat: destination.lat, lng: destination.lng }} icon={{ url: "/markers/drop.png", scaledSize: new window.google.maps.Size(32, 32) }} />
      )}

      {/* Directions Path */}
      {directions && (
        <DirectionsRenderer 
          directions={directions} 
          options={{
            polylineOptions: { strokeColor: "#111827", strokeWeight: 4 },
            suppressMarkers: false,
          }}
        />
      )}

      {/* Captain Live Location Marker */}
      {activeRide?.captainLocation && (
        <Marker 
          position={{ lat: activeRide.captainLocation.lat, lng: activeRide.captainLocation.lng }} 
          icon={{ 
            url: "/markers/captain.png", 
            scaledSize: new window.google.maps.Size(40, 40)
          }} 
          zIndex={100}
        />
      )}

      {/* Map Overlays (Only visible during active ride) */}
      {activeRide && (
        <>
          {/* Interactive State Selector Bar (Top Right) */}
          <div className="absolute top-space-md right-space-md z-30 flex flex-wrap items-center gap-1 p-1 rounded-full bg-[#111111] border border-gray-800 shadow-xl">
            <span className="font-telemetry-sm text-[11px] text-gray-300 px-2 uppercase font-bold hidden sm:inline">State:</span>
            <button className={`px-space-sm py-1 rounded-full font-label-sm text-xs transition-all font-semibold ${activeRide.status === 'SEARCHING' ? 'bg-[#FFD600] text-[#111111] font-black shadow-md' : 'text-gray-300 hover:text-white'}`}>1. Searching</button>
            <button className={`px-space-sm py-1 rounded-full font-label-sm text-xs transition-all font-semibold ${activeRide.status === 'CAPTAIN_ARRIVING' || activeRide.status === 'CAPTAIN_ARRIVED' ? 'bg-[#FFD600] text-[#111111] font-black shadow-md' : 'text-gray-300 hover:text-white'}`}>2. Arrived</button>
            <button className={`px-space-sm py-1 rounded-full font-label-sm text-xs transition-all font-semibold ${activeRide.status === 'IN_PROGRESS' ? 'bg-[#FFD600] text-[#111111] font-black shadow-md' : 'text-gray-300 hover:text-white'}`}>3. In Progress</button>
            <button className={`px-space-sm py-1 rounded-full font-label-sm text-xs transition-all font-semibold ${activeRide.status === 'COMPLETED' ? 'bg-[#FFD600] text-[#111111] font-black shadow-md' : 'text-gray-300 hover:text-white'}`}>4. Completed</button>
          </div>

          {/* Turn-by-turn Navigation HUD Pill (Top Center) */}
          <div className="absolute top-space-md left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-lg">
            <div className="flex items-center gap-space-md p-3.5 rounded-2xl bg-[#111111] text-white border border-gray-800 shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-[#FFD600] text-[#111111] flex items-center justify-center flex-shrink-0 shadow-md font-black">
                <span className="material-symbols-outlined text-2xl font-black">turn_slight_right</span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-headline-sm text-lg text-white font-extrabold">In 600m</span>
                  <span className="font-body-sm text-xs text-gray-300">Take exit 12</span>
                </div>
                <p className="font-body-md text-sm text-[#FFD600] truncate font-bold">Towards Gurugram · Cyber City Loop</p>
              </div>
              <div className="hidden sm:flex flex-col items-end flex-shrink-0 pl-2">
                <span className="font-telemetry-sm text-xs text-[#FFD600] font-black tracking-wider bg-[#1E293B] px-2 py-0.5 rounded border border-slate-700">LANE 3/4</span>
                <span className="font-label-sm text-[11px] text-gray-300 mt-0.5">Smooth flow</span>
              </div>
            </div>
          </div>

          {/* Map Controller Floating Buttons */}
          <div className="absolute bottom-space-lg right-space-md z-20 flex flex-col gap-space-xs">
            <button aria-label="Recenter live track" className="w-11 h-11 rounded-full bg-[#111111] text-white hover:text-[#FFD600] hover:bg-black border border-gray-800 flex items-center justify-center shadow-xl transition-all" type="button">
              <span className="material-symbols-outlined text-xl">my_location</span>
            </button>
            <button aria-label="Toggle satellite layers" className="w-11 h-11 rounded-full bg-[#111111] text-white hover:text-[#FFD600] hover:bg-black border border-gray-800 flex items-center justify-center shadow-xl transition-all" type="button">
              <span className="material-symbols-outlined text-xl">layers</span>
            </button>
            <button aria-label="Traffic conditions" className="w-11 h-11 rounded-full bg-[#111111] text-[#FFD600] hover:bg-black border border-gray-800 flex items-center justify-center shadow-xl transition-all" type="button">
              <span className="material-symbols-outlined text-xl">traffic</span>
            </button>
          </div>

          {/* Weather & Road Context Floating Pill */}
          <div className="absolute bottom-space-lg left-space-md z-20 hidden md:flex items-center gap-space-md p-space-sm px-space-md rounded-full bg-[#111111] text-white border border-gray-800 shadow-xl">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#FFD600]">partly_cloudy_day</span>
              <span className="font-telemetry-sm text-xs font-medium text-gray-200">26°C · Clear Visibility</span>
            </div>
            <div className="h-3 w-px bg-slate-700"></div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#FFD600]">check</span>
              <span className="font-telemetry-sm text-xs font-medium text-gray-200">Zero tolls on selected route</span>
            </div>
          </div>
        </>
      )}
    </GoogleMap>
  );
}
