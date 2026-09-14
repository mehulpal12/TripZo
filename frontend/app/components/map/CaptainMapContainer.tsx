"use client";

import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { useCaptainStore } from "@/stores/captain.store";
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader";

const containerStyle = {
  width: "100%",
  height: "100%",
};

const DEFAULT_COORDS = {
  lat: 28.7031, // Delhi Center
  lng: 77.1030,
};

// Subtle daylight map style matching the Tripzo / Rapido aesthetic
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: "cooperative",
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

export function CaptainMapContainer() {
  const { isLoaded, loadError } = useGoogleMapsLoader();

  const { isOnline, activeRequest, activeRide, captainLocation, locationError, isGpsActive } = useCaptainStore();

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const [navDistance, setNavDistance] = useState<string>("");
  const [navDuration, setNavDuration] = useState<string>("");
  const [nextInstruction, setNextInstruction] = useState<string>("");
  const [showContactModal, setShowContactModal] = useState(false);

  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const lastRoutedKeyRef = useRef<string>("");

  const currentCaptainPos = useMemo(() => {
    if (captainLocation?.lat && captainLocation?.lng) {
      return { lat: captainLocation.lat, lng: captainLocation.lng };
    }
    return DEFAULT_COORDS;
  }, [captainLocation]);

  // Determine current navigation phase & target location
  const navState = useMemo(() => {
    if (activeRide) {
      if (activeRide.status === "IN_PROGRESS") {
        return {
          phase: "DROPOFF" as const,
          badge: "STEP 2: EN ROUTE TO DESTINATION",
          targetLocation: {
            lat: Number(activeRide.destination.lat),
            lng: Number(activeRide.destination.lng),
          },
          targetAddress: activeRide.destination.address || activeRide.destination.name || "Destination Dropoff",
          originLocation: currentCaptainPos,
        };
      } else {
        // CAPTAIN_ASSIGNED, CAPTAIN_ARRIVING, CAPTAIN_ARRIVED
        return {
          phase: "PICKUP" as const,
          badge: activeRide.status === "CAPTAIN_ARRIVED" ? "ARRIVED AT PICKUP" : "STEP 1: HEADING TO PICKUP",
          targetLocation: {
            lat: Number(activeRide.pickup.lat),
            lng: Number(activeRide.pickup.lng),
          },
          targetAddress: activeRide.pickup.address || activeRide.pickup.name || "Rider Pickup Point",
          originLocation: currentCaptainPos,
        };
      }
    }

    if (activeRequest) {
      return {
        phase: "REQUEST" as const,
        badge: "INCOMING RIDE REQUEST",
        targetLocation: {
          lat: Number(activeRequest.destination.lat),
          lng: Number(activeRequest.destination.lng),
        },
        targetAddress: activeRequest.destination.address || activeRequest.destination.name || "Dropoff Point",
        originLocation: {
          lat: Number(activeRequest.pickup.lat),
          lng: Number(activeRequest.pickup.lng),
        },
      };
    }

    return {
      phase: "IDLE" as const,
      badge: isOnline ? "ONLINE · SEARCHING FOR RIDES" : "OFFLINE",
      targetLocation: null,
      targetAddress: "",
      originLocation: currentCaptainPos,
    };
  }, [activeRide, activeRequest, currentCaptainPos, isOnline]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Handle Google Traffic Layer toggle
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

  // Request driving directions when ride phase or destination changes
  useEffect(() => {
    if (!isLoaded || !window.google?.maps) return;

    if (!navState.targetLocation) {
      setDirections(null);
      setNavDistance("");
      setNavDuration("");
      setNextInstruction("");
      lastRoutedKeyRef.current = "";
      return;
    }

    const routeKey = `${navState.phase}_${navState.targetLocation.lat}_${navState.targetLocation.lng}`;

    // Only re-route if phase/target changes (prevents spamming Directions API on live GPS ticks)
    if (lastRoutedKeyRef.current === routeKey && directions) {
      return;
    }

    lastRoutedKeyRef.current = routeKey;
    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: navState.originLocation,
        destination: navState.targetLocation,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);

          const leg = result.routes[0]?.legs[0];
          if (leg) {
            setNavDistance(leg.distance?.text || "");
            setNavDuration(leg.duration?.text || "");
            if (leg.steps && leg.steps.length > 0) {
              const rawHtml = leg.steps[0].instructions || "";
              setNextInstruction(rawHtml.replace(/<[^>]+>/g, ""));
            }
          }

          // Fit bounds to show entire route with padding for HUDs
          if (map) {
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(navState.originLocation);
            bounds.extend(navState.targetLocation!);
            map.fitBounds(bounds, { top: 90, bottom: 90, left: 40, right: 40 });
          }
        } else {
          console.warn("Directions request returned status:", status);
        }
      }
    );
  }, [isLoaded, navState, map, directions]);

  // Recenter helper
  const handleRecenter = () => {
    if (!map) return;
    if (directions && navState.targetLocation) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(currentCaptainPos);
      bounds.extend(navState.targetLocation);
      map.fitBounds(bounds, { top: 90, bottom: 90, left: 40, right: 40 });
    } else {
      map.panTo(currentCaptainPos);
      map.setZoom(15);
    }
  };

  // External Turn-by-Turn Google Maps launch
  const handleLaunchGoogleMaps = () => {
    if (!navState.targetLocation) {
      alert("No active destination to navigate to.");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentCaptainPos.lat},${currentCaptainPos.lng}&destination=${navState.targetLocation.lat},${navState.targetLocation.lng}&travelmode=driving`;
    window.open(url, "_blank");
  };

  // Custom SVG Markers
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

  const pickupMarkerIcon = useMemo(() => {
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
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20),
    };
  }, [isLoaded]);

  const dropoffMarkerIcon = useMemo(() => {
    if (!isLoaded || !window.google?.maps) return undefined;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="17" fill="#111111" stroke="#10B981" stroke-width="3"/>
        <rect x="14" y="14" width="12" height="12" rx="3" fill="#10B981"/>
        <path d="M16 20 L19 23 L24 17" stroke="#111111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      </svg>
    `;
    return {
      url: `data:image/svg+xml;utf-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20),
    };
  }, [isLoaded]);

  if (loadError) {
    return (
      <div className="relative w-full h-[340px] xs:h-[380px] sm:h-[460px] md:h-[520px] lg:h-[600px] xl:h-[640px] rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700 shadow-xl flex flex-col items-center justify-center p-4 sm:p-6 text-center text-white">
        <span className="material-symbols-outlined text-3xl sm:text-4xl text-rose-400 mb-2">map_error</span>
        <h4 className="text-base sm:text-lg font-bold">Failed to load Google Maps</h4>
        <p className="text-xs text-slate-400 max-w-sm mt-1">Please verify that your Google Maps API Key is configured and valid.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative w-full h-[340px] xs:h-[380px] sm:h-[460px] md:h-[520px] lg:h-[600px] xl:h-[640px] rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 shadow-xl flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 border-4 border-[#FFD600] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[11px] sm:text-xs font-bold text-slate-700 tracking-wider uppercase">Loading Live Navigation Map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[340px] xs:h-[380px] sm:h-[460px] md:h-[520px] lg:h-[600px] xl:h-[640px] rounded-2xl overflow-hidden bg-white border-2 border-slate-200 shadow-xl flex flex-col justify-between">
      {/* Live Google Maps Canvas */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentCaptainPos}
        zoom={15}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {/* Directions Polyline */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: navState.phase === "DROPOFF" ? "#10B981" : "#111111",
                strokeWeight: 5,
                strokeOpacity: 0.9,
              },
            }}
          />
        )}

        {/* Live Captain GPS Marker */}
        {isOnline && (
          <Marker
            position={currentCaptainPos}
            icon={captainMarkerIcon}
            zIndex={100}
            title="Your Live Location (Captain)"
          />
        )}

        {/* Pickup Marker */}
        {(navState.phase === "PICKUP" || navState.phase === "REQUEST") && navState.targetLocation && (
          <Marker
            position={navState.phase === "REQUEST" ? navState.originLocation : navState.targetLocation}
            icon={pickupMarkerIcon}
            zIndex={90}
            title={`Pickup: ${navState.targetAddress}`}
          />
        )}

        {/* Dropoff Marker */}
        {(navState.phase === "DROPOFF" || navState.phase === "REQUEST") && (
          <Marker
            position={navState.targetLocation!}
            icon={dropoffMarkerIcon}
            zIndex={90}
            title={`Destination: ${navState.targetAddress}`}
          />
        )}
      </GoogleMap>

      {/* TOP HUD: Turn-by-Turn Navigation Instruction Header */}
      {activeRide && (
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 z-30 flex flex-col gap-1.5 pointer-events-none">
          <div className="pointer-events-auto flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl bg-[#111111]/95 backdrop-blur-md text-white border border-slate-700 shadow-2xl">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${navState.phase === "DROPOFF" ? "bg-emerald-500 text-black" : "bg-[#FFD600] text-black"
                }`}>
                <span className="material-symbols-outlined text-xl sm:text-2xl font-black">
                  {navState.phase === "DROPOFF" ? "navigation" : activeRide.status === "CAPTAIN_ARRIVED" ? "pin_drop" : "directions_bike"}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black tracking-wider uppercase border ${navState.phase === "DROPOFF"
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                      : "bg-yellow-950/80 text-yellow-300 border-yellow-500/40"
                    }`}>
                    {navState.badge}
                  </span>
                  {navDistance && (
                    <span className="text-[11px] sm:text-xs font-bold text-slate-300">
                      {navDistance} · {navDuration}
                    </span>
                  )}
                </div>
                <span className="text-xs sm:text-sm font-extrabold truncate text-white mt-0.5">
                  {navState.targetAddress}
                </span>
                {nextInstruction && (
                  <span className="text-[11px] sm:text-xs text-[#FFD600] truncate font-medium">
                    {nextInstruction}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleLaunchGoogleMaps}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-[#FFD600] border border-slate-600 transition-all font-bold text-xs flex-shrink-0 ml-1.5 sm:ml-2"
              title="Open full turn-by-turn navigation in external Google Maps"
            >
              <span className="material-symbols-outlined text-sm sm:text-base">near_me</span>
              <span className="hidden sm:inline">Navigate</span>
            </button>
          </div>
        </div>
      )}

      {/* TOP HUD (Idle / Online State) */}
      {!activeRide && isOnline && (
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-30 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#111111]/90 backdrop-blur-md text-white border border-slate-700 shadow-xl">
            <span className="relative flex h-2 sm:h-2.5 w-2 sm:w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isGpsActive ? "bg-[#FFD600]" : "bg-amber-400"
                }`}></span>
              <span className={`relative inline-flex rounded-full h-2 sm:h-2.5 w-2 sm:w-2.5 ${isGpsActive ? "bg-[#FFD600]" : "bg-amber-400"
                }`}></span>
            </span>
            <span className="text-[10px] sm:text-xs font-black tracking-wide text-slate-200 uppercase">
              {isGpsActive
                ? "Live GPS Active · Searching for rides"
                : locationError
                  ? "GPS Signal Blocked"
                  : "Acquiring GPS Signal..."}
            </span>
          </div>
        </div>
      )}

      {/* GPS Warning / Error Notification Banner */}
      {isOnline && locationError && (
        <div className="absolute top-12 sm:top-16 left-2 sm:left-3 right-2 sm:right-3 z-30 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-xl bg-rose-950/95 border border-rose-500/50 text-white shadow-2xl backdrop-blur-md">
            <span className="material-symbols-outlined text-rose-400 text-lg sm:text-xl flex-shrink-0">location_off</span>
            <div className="flex flex-col">
              <span className="text-[11px] sm:text-xs font-bold text-rose-200">{locationError}</span>
              <span className="text-[10px] sm:text-[11px] text-rose-300/80">Check browser address bar settings to enable GPS.</span>
            </div>
          </div>
        </div>
      )}

      {/* TOP HUD (Offline State) */}
      {!isOnline && (
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-30 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md text-slate-300 border border-slate-700 shadow-xl">
            <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-slate-500"></span>
            <span className="text-[10px] sm:text-xs font-bold tracking-wide uppercase">
              You are Offline · Toggle switch to go online
            </span>
          </div>
        </div>
      )}

      {/* FLOATING CONTROLS: Right-hand Map Action Buttons */}
      <div className="absolute right-2 sm:right-3 bottom-16 sm:bottom-20 z-30 flex flex-col gap-1.5 sm:gap-2 pointer-events-auto">
        <button
          onClick={handleRecenter}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#111111] hover:bg-slate-800 text-white hover:text-[#FFD600] border border-slate-700 flex items-center justify-center shadow-xl transition-all"
          title="Recenter Map"
          type="button"
        >
          <span className="material-symbols-outlined text-base sm:text-xl">my_location</span>
        </button>

        <button
          onClick={() => setShowTraffic((prev) => !prev)}
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shadow-xl transition-all ${showTraffic
              ? "bg-[#FFD600] text-black border-yellow-400 font-bold"
              : "bg-[#111111] hover:bg-slate-800 text-white hover:text-[#FFD600] border-slate-700"
            }`}
          title="Toggle Live Traffic Conditions"
          type="button"
        >
          <span className="material-symbols-outlined text-base sm:text-xl">traffic</span>
        </button>
      </div>

      {/* BOTTOM COMMAND DECK */}
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 m-2 sm:m-3 rounded-xl bg-[#1E293B]/95 backdrop-blur-md border border-slate-700 shadow-2xl">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial min-w-0">
          <button
            onClick={handleLaunchGoogleMaps}
            disabled={!navState.targetLocation}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-lg bg-[#FFD600] text-[#111111] hover:bg-[#FACC15] disabled:opacity-40 transition-all font-black text-[11px] sm:text-xs shadow-md truncate"
          >
            <span className="material-symbols-outlined text-sm sm:text-base font-black">directions</span>
            <span className="hidden xs:inline">Google Maps </span>
            <span>Turn-by-Turn</span>
          </button>

          <button
            onClick={() => setShowContactModal(true)}
            disabled={!activeRide}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-all text-[11px] sm:text-xs font-bold border border-slate-700 truncate"
          >
            <span className="material-symbols-outlined text-emerald-400 text-sm sm:text-base">call</span>
            <span>Rider Contact</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => alert("SOS Emergency Dispatch Alert triggered. Support team notified.")}
            className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-950 border border-slate-700 transition-all shadow-sm"
            title="Safety Dispatch SOS"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">shield</span>
          </button>

          <div className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-[11px] font-bold text-slate-300">
            <span className="material-symbols-outlined text-sm text-[#FFD600]">speed</span>
            <span>GPS Active</span>
          </div>
        </div>
      </div>

      {/* Rider Contact Modal */}
      {showContactModal && activeRide && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1E293B] text-white p-5 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">call</span>
                <span className="font-bold text-sm">Contact Rider</span>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-bold uppercase">Rider Details</span>
              <span className="text-sm font-extrabold text-white">
                {activeRide.riderId ? `Rider #${activeRide.riderId.slice(0, 8)}` : "Tripzo Customer"}
              </span>
              <span className="text-xs text-slate-300 font-mono mt-1">+91 98765 43210</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href="tel:+919876543210"
                className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs text-center flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">call</span>
                <span>Call Rider</span>
              </a>
              <button
                onClick={() => {
                  alert("Opening message channel with rider...");
                  setShowContactModal(false);
                }}
                className="py-2 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs text-center flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">chat</span>
                <span>Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
