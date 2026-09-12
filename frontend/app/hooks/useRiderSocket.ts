"use client";

import { useEffect } from "react";
import { socketClient } from "@/lib/socket/socket.client";
import { useRideStore, RideStatus } from "@/stores/ride.store";
import { mapBackendRideToFrontend } from "@/lib/api/ride.service";

export function useRiderSocket() {
  const { activeRide, updateCaptainLocation, updateRideStatus } = useRideStore();

  // ── Effect 1: Stable personal-room listeners (mounted once) ──────────────────
  // ride:captain_assigned is emitted to rider:{userId} personal room so the rider
  // doesn't need to have joined the ride room first (fixes the timing race).
  useEffect(() => {
    const socket = socketClient.connect();
    if (!socket) return;

    const handleCaptainAssigned = (data: any) => {
      console.log("ride:captain_assigned received on personal room", data);
      useRideStore.getState().setActiveRide(mapBackendRideToFrontend(data));
    };

    const handleCancelled = () => {
      useRideStore.getState().setActiveRide(null);
    };

    // Re-join the ride room on every reconnect (room membership is per-connection)
    const rejoinOnReconnect = () => {
      const currentRide = useRideStore.getState().activeRide;
      if (currentRide) {
        socket.emit("join_ride", currentRide.id);
      }
    };

    socket.on("ride:captain_assigned", handleCaptainAssigned);
    socket.on("ride:cancelled", handleCancelled);
    socket.on("connect", rejoinOnReconnect);

    return () => {
      socket.off("ride:captain_assigned", handleCaptainAssigned);
      socket.off("ride:cancelled", handleCancelled);
      socket.off("connect", rejoinOnReconnect);
    };
  }, []); // Intentionally empty: register once, use store.getState() for latest values

  // ── Effect 2: Reactive ride-room listeners (depend on activeRide) ─────────────
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket || !activeRide) return;

    // Join the ride-specific room for location + status events
    socket.emit("join_ride", activeRide.id);

    const handleLocation = (data: { lat: number; lng: number }) => {
      updateCaptainLocation(data.lat, data.lng);
    };
    const handleStatusUpdate = (data: { status: RideStatus }) => {
      updateRideStatus(data.status);
    };
    const handleArrived = (data: any) => {
      useRideStore.getState().setActiveRide(mapBackendRideToFrontend(data));
    };
    const handleStarted = (data: any) => {
      useRideStore.getState().setActiveRide(mapBackendRideToFrontend(data));
    };
    const handleCompleted = () => {
      useRideStore.getState().setActiveRide(null);
    };

    socket.on("captain:location", handleLocation);
    socket.on("ride:status_update", handleStatusUpdate);
    socket.on("ride:captain_arrived", handleArrived);
    socket.on("ride:started", handleStarted);
    socket.on("ride:completed", handleCompleted);

    return () => {
      socket.off("captain:location", handleLocation);
      socket.off("ride:status_update", handleStatusUpdate);
      socket.off("ride:captain_arrived", handleArrived);
      socket.off("ride:started", handleStarted);
      socket.off("ride:completed", handleCompleted);
    };
  }, [activeRide, updateCaptainLocation, updateRideStatus]);
}
