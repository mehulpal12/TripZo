"use client";

import MapContainer from "@/components/map/MapContainer";
import { BookingPanel } from "@/features/booking/BookingPanel";
import { ActiveRideSidebar } from "@/features/ride/ActiveRideSidebar";
import { useRideStore } from "@/stores/ride.store";
import { useEffect } from "react";
import { socketClient } from "@/lib/socket/socket.client";
import { useRiderSocket } from "@/hooks/useRiderSocket";

export default function RiderDashboard() {
  const { activeRide } = useRideStore();
  
  useRiderSocket();

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
