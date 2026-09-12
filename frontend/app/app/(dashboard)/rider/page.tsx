"use client";

import MapContainer from "@/components/map/MapContainer";
import { BookingPanel } from "@/features/booking/BookingPanel";
import { ActiveRideSidebar } from "@/features/ride/ActiveRideSidebar";
import { useRideStore } from "@/stores/ride.store";
import { useEffect } from "react";
import { socketClient } from "@/lib/socket/socket.client";

export default function RiderDashboard() {
  const { activeRide, updateCaptainLocation, updateRideStatus } = useRideStore();

  useEffect(() => {
    // Initialize Socket connection when entering the dashboard
    const socket = socketClient.connect();

    if (socket) {
      socket.on("captain:location", (data) => {
        updateCaptainLocation(data.lat, data.lng);
      });
      
      socket.on("ride:status_update", (data) => {
        updateRideStatus(data.status);
      });
    }

    return () => {
      if (socket) {
        socket.off("captain:location");
        socket.off("ride:status_update");
      }
    };
  }, [updateCaptainLocation, updateRideStatus]);

  return (
    <div className="w-full h-full flex relative bg-muted/20">
      {/* Left Console Sidebar */}
      <div className="w-[440px] shrink-0 h-full overflow-y-auto border-r border-border bg-background p-4 flex flex-col gap-4 shadow-xl z-10 custom-scrollbar">
        {!activeRide ? (
          <BookingPanel />
        ) : (
          <ActiveRideSidebar />
        )}
      </div>

      {/* Right Map Area */}
      <div className="flex-1 h-full relative">
        <MapContainer />
      </div>
    </div>
  );
}
