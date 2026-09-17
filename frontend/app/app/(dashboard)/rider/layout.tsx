"use client";

import { ReactNode } from "react";
import { User, Bell, Search, CircleDot, CalendarClock, Compass } from "lucide-react";
import { SocketConnectionStatus } from "@/components/ui/SocketConnectionStatus";
import { useRideStore } from "@/stores/ride.store";

export default function RiderLayout({ children }: { children: ReactNode }) {
  const { activeTab, setActiveTab, activeRide } = useRideStore();

  return (
    <div className="h-screen w-full flex flex-col bg-black font-sans overflow-hidden selection:bg-primary/20 selection:text-primary">
      <SocketConnectionStatus />
      
      {/* Top Navigation Bar */}
      <header className="h-[50px] shrink-0 border-b border-border/60 bg-card/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 z-50 shadow-sm">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Logo & Network Status */}
          <div className="flex items-center gap-3 sm:gap-4">
            <h1 
              onClick={() => setActiveTab("book")}
              className="text-xl sm:text-2xl font-black tracking-tighter text-primary bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent cursor-pointer select-none"
            >
              TRIPZO
            </h1>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/40 border border-border/60 shadow-2xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-xs font-semibold tracking-wide text-foreground/90">NEW DELHI · LIVE</span>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-full border border-border/80 shadow-inner">
            <button 
              onClick={() => setActiveTab("book")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "book"
                  ? "bg-primary text-black shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{activeRide ? "Active Ride" : "Book Ride"}</span>
              {activeRide && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab("scheduled")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "scheduled"
                  ? "bg-primary text-black shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Schedule Ride</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">



          {/* Actions */}
          <button className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted/40 border border-border/80 hover:bg-muted hover:border-border transition-all relative group shadow-2xs">
            <Bell className="w-4 h-4 text-foreground/80 group-hover:text-foreground transition-colors" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />
          </button>
          
          <button className="w-10 h-10 rounded-xl overflow-hidden border border-border/80 hover:ring-2 hover:ring-primary/40 transition-all shadow-2xs">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" alt="Profile" className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-hidden relative">
        {children}
      </main>

      {/* Bottom Footer */}
      <footer className="h-10 shrink-0 border-t border-border/80 bg-[#0f131c] flex items-center justify-between px-4 sm:px-6 text-xs font-medium text-slate-400 z-50">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-primary tracking-tight">TRIPZO</span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="truncate">Autonomous Urban Mobility Console © 2025</span>
        </div>
        <div className="hidden md:flex gap-6 text-slate-400">
            <button className="hover:text-white transition-colors">Mehul Pal</button>
          <button className="hover:text-white transition-colors">Fleet Operations</button>
          <button className="hover:text-white transition-colors">Safety Dispatch</button>
          <button className="hover:text-white transition-colors">System Status</button>
        </div>
      </footer>
    </div>
  );
}