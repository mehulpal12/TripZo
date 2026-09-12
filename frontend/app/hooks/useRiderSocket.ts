"use client";

import { useEffect } from "react";
import { socketClient } from "@/lib/socket/socket.client";
import { useRideStore, RideStatus } from "@/stores/ride.store";

export function useRiderSocket() {
  const { activeRide, updateCaptainLocation, updateRideStatus } = useRideStore();

  useEffect(() => {
    // Rider always connects
    const socket = socketClient.connect();
    if (!socket) return;

    if (activeRide) {
      // Join the ride room to receive updates specifically for this ride
      socket.emit("join_ride", activeRide.id);

      socket.on("captain:location", (data: { lat: number; lng: number }) => {
        updateCaptainLocation(data.lat, data.lng);
      });

      socket.on("ride:status_update", (data: { status: RideStatus }) => {
        updateRideStatus(data.status);
      });
    }

    // Cleanup listeners
    return () => {
      socket.off("captain:location");
      socket.off("ride:status_update");
    };
  }, [activeRide, updateCaptainLocation, updateRideStatus]);
}
