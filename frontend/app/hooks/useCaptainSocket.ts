import { useEffect, useRef } from "react";
import { socketClient } from "@/lib/socket/socket.client";
import { useCaptainStore } from "@/stores/captain.store";
import { getUserCurrentLocation } from "@/lib/location/geolocation.service";

// Helper: Calculate distance in meters between two lat/lng pairs (Haversine formula)
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function useCaptainSocket() {
  const {
    isOnline,
    activeRide,
    setActiveRequest,
    setCaptainLocation,
    setLocationError,
    setIsGpsActive,
  } = useCaptainStore();

  const activeRideRef = useRef(activeRide);
  activeRideRef.current = activeRide;

  const lastEmitTimeRef = useRef<number>(0);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);

  // 1. Socket.IO Connection & Event Handlers
  useEffect(() => {
    if (!isOnline) {
      socketClient.disconnect();
      return;
    }

    const socket = socketClient.connect();
    if (!socket) return;

    // Listen for incoming ride dispatch requests
    const handleNewRide = (rideData: any) => {
      console.log("New ride request received via socket:", rideData);
      setActiveRequest({
        id: rideData.rideId,
        status: "SEARCHING",
        pickup: rideData.pickup,
        destination: rideData.destination,
        vehicleType: rideData.vehicleType || "BIKE",
        fare: rideData.estimatedFare,
      });
    };

    socket.on("ride:new", handleNewRide);

    // Immediately acquire and broadcast initial location as captain gets online
    getUserCurrentLocation()
      .then((loc) => {
        setCaptainLocation({ lat: loc.lat, lng: loc.lng });
        setIsGpsActive(true);
        if (socket?.connected) {
          socket.emit("captain:location", {
            lat: loc.lat,
            lng: loc.lng,
            timestamp: Date.now(),
          });
        }
      })
      .catch((err) => {
        console.warn("Initial captain location fetch error:", err);
      });

    return () => {
      socket.off("ride:new", handleNewRide);
    };
  }, [isOnline, setActiveRequest, setCaptainLocation, setIsGpsActive]);

  // 2. Real-Time Browser Geolocation Watcher (navigator.geolocation.watchPosition)
  useEffect(() => {
    if (!isOnline) {
      setLocationError(null);
      setIsGpsActive(false);
      return;
    }

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsGpsActive(false);
      return;
    }

    let watchId: number | null = null;

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;

      if (!isFinite(latitude) || !isFinite(longitude)) {
        return;
      }

      setIsGpsActive(true);
      setLocationError(null);
      setCaptainLocation({ lat: latitude, lng: longitude });

      const now = Date.now();
      const lastEmit = lastEmitTimeRef.current;
      const lastPos = lastPosRef.current;

      let distanceMoved = 0;
      if (lastPos) {
        distanceMoved = getDistanceMeters(lastPos.lat, lastPos.lng, latitude, longitude);
      }

      // Throttle GPS emits:
      // Emit if:
      // - First valid position, OR
      // - At least 1.5 seconds have passed, OR
      // - At least 800ms have passed AND position moved >= 5 meters
      const shouldEmit =
        !lastPos ||
        now - lastEmit >= 1500 ||
        (now - lastEmit >= 800 && distanceMoved >= 5);

      if (shouldEmit) {
        lastEmitTimeRef.current = now;
        lastPosRef.current = { lat: latitude, lng: longitude };

        const socket = socketClient.getSocket();
        if (socket?.connected) {
          const currentRide = activeRideRef.current;
          socket.emit("captain:location", {
            lat: latitude,
            lng: longitude,
            timestamp: now,
            ...(currentRide && { rideId: currentRide.id }),
          });
        }
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      // Fallback to IP/network location so captain can still navigate and receive rides
      getUserCurrentLocation().then((loc) => {
        setCaptainLocation({ lat: loc.lat, lng: loc.lng });
        setIsGpsActive(true);
      }).catch(() => {
        setIsGpsActive(false);
      });

      switch (error.code) {
        case error.PERMISSION_DENIED:
          setLocationError(
            "Device GPS restricted on HTTP. Using network location. (Tip: Use HTTPS or chrome://flags for hardware GPS)"
          );
          break;
        case error.POSITION_UNAVAILABLE:
          setLocationError("GPS signal weak. Using network location.");
          break;
        case error.TIMEOUT:
          setLocationError("GPS signal timed out. Using network location.");
          break;
        default:
          setLocationError(`Location note: ${error.message}`);
          break;
      }
    };

    watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000,
    });

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      setIsGpsActive(false);
    };
  }, [isOnline, setCaptainLocation, setLocationError, setIsGpsActive]);
}
