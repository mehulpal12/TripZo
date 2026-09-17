"use client";

import dynamic from "next/dynamic";
import { BookingPanel } from "@/features/booking/BookingPanel";
import { ActiveRideSidebar } from "@/features/ride/ActiveRideSidebar";
import { RiderScheduledRides } from "@/features/ride/RiderScheduledRides";
import { useRideStore } from "@/stores/ride.store";
import { useEffect } from "react";
import { rideService } from "@/lib/api/ride.service";
import { useRiderSocket } from "@/hooks/useRiderSocket";
import { Compass, CalendarClock } from "lucide-react";

const MapContainer = dynamic(() => import("@/components/map/MapContainer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <span className="text-xs font-mono uppercase tracking-widest text-slate-300">Loading Map...</span>
    </div>
  ),
});

export default function RiderDashboard() {
  const { activeRide, activeTab, setActiveTab } = useRideStore();
  
  useRiderSocket();

  // Restore and synchronize active ride on mount and via periodic polling
  useEffect(() => {
    let isMounted = true;

    const checkActiveRide = async () => {
      try {
        const active = await rideService.getActiveRide();
        if (!isMounted) return;
        const current = useRideStore.getState().activeRide;
        if (active) {
          if (!current || current.id !== active.id || current.status !== active.status) {
            useRideStore.getState().setActiveRide(active);
          }
        } else if (current && (current.status === "SEARCHING" || current.status === "CANCELLED")) {
          useRideStore.getState().setActiveRide(null);
        }
      } catch (err) {
        // silent fail on network hiccups
      }
    };

    checkActiveRide();
    // Poll every 5s to catch advance scheduled ride dispatch start at T-15 min
    const interval = setInterval(checkActiveRide, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-muted/20 overflow-hidden">
      {/* Background Map Area (Fullscreen) */}
      <div className="absolute inset-0 z-0">
        <MapContainer />
      </div>

      {/* Foreground Panels: Bottom Sheet on Mobile, Sidebar on Desktop */}
      <div className="absolute bottom-0 left-0 w-full md:top-0 md:bottom-auto md:w-[440px] md:h-full z-10 flex flex-col pointer-events-none">
        
        {/* Mobile Pull Indicator & Tab Switcher */}
        <div className="w-full flex flex-col items-center py-2 px-4 md:hidden bg-background rounded-t-3xl pointer-events-auto shadow-[0_-8px_30px_rgba(0,0,0,0.12)] gap-2">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
          <div className="w-full grid grid-cols-2 p-1 bg-muted/60 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab("book")}
              className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "book" ? "bg-primary text-black font-black" : "text-muted-foreground"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{activeRide ? "Live Ride" : "Book Ride"}</span>
              {activeRide && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
            </button>
            <button
              onClick={() => setActiveTab("scheduled")}
              className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "scheduled" ? "bg-primary text-black font-black" : "text-muted-foreground"
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Scheduled</span>
            </button>
          </div>
        </div>

        <div className="flex-1 w-full max-h-[70vh] md:max-h-full overflow-y-auto bg-background md:border-r border-border md:p-4 p-4 shadow-xl custom-scrollbar pointer-events-auto rounded-t-none md:rounded-none">
          {activeTab === "scheduled" ? (
            <RiderScheduledRides />
          ) : activeRide ? (
            <ActiveRideSidebar />
          ) : (
            <BookingPanel />
          )}
        </div>
      </div>
    </div>
  );
}
