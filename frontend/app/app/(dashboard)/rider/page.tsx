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
    <div className="w-full h-full relative bg-muted/20 overflow-hidden">
      {/* Background Map Area (Fullscreen) */}
      <div className="absolute inset-0 z-0">
        <MapContainer />
      </div>

      {/* Foreground Panels: Bottom Sheet on Mobile, Sidebar on Desktop */}
      <div className="absolute bottom-0 left-0 w-full md:top-0 md:bottom-auto md:w-[440px] md:h-full z-10 flex flex-col pointer-events-none">
        
        {/* Mobile Pull Indicator */}
        <div className="w-full flex justify-center py-2 md:hidden bg-background rounded-t-3xl pointer-events-auto shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
        </div>

        <div className="flex-1 w-full max-h-[70vh] md:max-h-full overflow-y-auto bg-background md:border-r border-border md:p-4 p-4 shadow-xl custom-scrollbar pointer-events-auto rounded-t-none md:rounded-none">
          {!activeRide ? (
            <BookingPanel />
          ) : (
            <ActiveRideSidebar />
          )}
        </div>
      </div>
    </div>
  );
}
