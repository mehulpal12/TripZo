"use client";

import { useEffect, useRef } from "react";
import { socketClient } from "@/lib/socket/socket.client";
import { useCaptainStore } from "@/stores/captain.store";

// Base location for captain (Near Delhi Center, within 5km of rider's default)
const BASE_LAT = 28.7031;
const BASE_LNG = 77.1030;

export function useCaptainSocket() {
  const { isOnline, activeRide, setActiveRequest, setCaptainLocation } = useCaptainStore();
  const locationRef = useRef({ lat: BASE_LAT, lng: BASE_LNG });

  useEffect(() => {
    if (!isOnline) {
      socketClient.disconnect();
      return;
    }

    const socket = socketClient.connect();
    if (!socket) return;

    // Listen for new ride requests
    socket.on("ride:new", (rideData: any) => {
      console.log("New ride request received:", rideData);
      // Map backend payload to frontend Ride interface
      setActiveRequest({
        id: rideData.rideId,
        status: "SEARCHING",
        pickup: rideData.pickup,
        destination: rideData.destination,
        vehicleType: "BIKE", // default assumption for now
        fare: rideData.estimatedFare,
      });
    });

    // Cleanup
    return () => {
      socket.off("ride:new");
    };
  }, [isOnline, setActiveRequest]);

  // GPS Simulator Loop
  useEffect(() => {
    if (!isOnline) return;
    const socket = socketClient.getSocket();

    const interval = setInterval(() => {
      // If we have an active ride, simulate moving towards pickup/dropoff
      if (activeRide) {
        let targetLat, targetLng;
        if (activeRide.status === "CAPTAIN_ASSIGNED" || activeRide.status === "CAPTAIN_ARRIVING") {
          // Move to pickup
          targetLat = activeRide.pickup.lat;
          targetLng = activeRide.pickup.lng;
        } else if (activeRide.status === "IN_PROGRESS") {
          // Move to dropoff
          targetLat = activeRide.destination.lat;
          targetLng = activeRide.destination.lng;
        }

        if (targetLat && targetLng) {
          // Very basic linear interpolation (move 5% closer every 2 seconds)
          locationRef.current.lat += (targetLat - locationRef.current.lat) * 0.05;
          locationRef.current.lng += (targetLng - locationRef.current.lng) * 0.05;
        }
      } else {
        // Idle wander
        locationRef.current.lat += (Math.random() - 0.5) * 0.0001;
        locationRef.current.lng += (Math.random() - 0.5) * 0.0001;
      }

      const loc = { lat: locationRef.current.lat, lng: locationRef.current.lng };
      setCaptainLocation(loc);

      const currentSocket = socketClient.getSocket();
      if (currentSocket?.connected) {
        currentSocket.emit("captain:location", {
          lat: loc.lat,
          lng: loc.lng,
          timestamp: Date.now(),
          ...(activeRide && { rideId: activeRide.id }),
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOnline, activeRide, setCaptainLocation]);
}
