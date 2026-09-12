"use client";

import { useRideStore } from "@/stores/ride.store";
import { rideService } from "@/lib/api/ride.service";
import { Navigation, Phone, Share2, ShieldAlert, CheckCircle2, Circle, MapPin, Gauge } from "lucide-react";

export function ActiveRideSidebar() {
  const { activeRide, setActiveRide } = useRideStore();

  if (!activeRide) return null;

  return (
    <div className="w-full h-full flex flex-col flex-shrink-0 z-20 bg-[#FFFFFF] overflow-y-auto custom-scrollbar">
      <div className="p-space-lg flex flex-col gap-space-md pb-10">
        
        {/* Live Status Bar */}
        <div className="flex items-center justify-between gap-space-sm p-space-sm rounded-lg bg-[#111111] text-white border border-gray-900 shadow-sm">
          <div className="flex items-center gap-space-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD600] opacity-80" id="ping-badge"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFD600]" id="dot-badge"></span>
            </span>
            <span className="font-telemetry-sm text-xs text-[#FFD600] tracking-wider uppercase font-extrabold" id="trip-status-pill">
              {activeRide.status === "SEARCHING" ? "Searching Network" : 
               (activeRide.status === "CAPTAIN_ASSIGNED" || activeRide.status === "CAPTAIN_ARRIVING") ? "Captain Arriving" : 
               activeRide.status === "CAPTAIN_ARRIVED" ? "Captain Arrived" :
               "Ride In Progress · On Time"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1E293B] border border-slate-700">
            <span className="material-symbols-outlined text-xs text-[#FFD600]">sync</span>
            <span className="font-telemetry-sm text-[11px] text-gray-300 font-semibold">52ms / SYNC</span>
          </div>
        </div>

        {/* Primary Destination & Arrival Metric (Charcoal Card) */}
        <div className="p-space-lg rounded-xl bg-[#111111] text-white border border-gray-800 flex flex-col gap-space-xs relative overflow-hidden shadow-lg">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#FFD600]/15 blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="font-telemetry-sm text-xs uppercase tracking-widest text-[#FFD600] font-bold">Live Trajectory</span>
            <span className="font-label-sm text-[11px] px-2 py-0.5 rounded bg-[#1E293B] text-white border border-slate-700 font-bold tracking-wider">GPS LOCKED</span>
          </div>
          <div className="flex items-baseline gap-space-xs mt-space-xs">
            <span className="font-display-lg text-5xl font-black text-white tracking-tight" id="eta-display">14</span>
            <span className="font-headline-md text-2xl font-black text-[#FFD600]">mins</span>
            <span className="font-body-md text-sm text-gray-300 ml-auto font-medium">remaining</span>
          </div>
          <div className="flex items-center gap-space-xs text-gray-300 font-body-md text-sm">
            <span className="material-symbols-outlined text-base text-[#FFD600]">near_me</span>
            <span className="font-bold text-white" id="distance-display">8.2 km</span>
            <span className="text-gray-300">· to Cyber City Gate 3</span>
          </div>

          {/* Dynamic Speed & Traffic bar */}
          <div className="mt-space-sm pt-space-sm flex items-center justify-between bg-[#1E293B] rounded-lg px-3 py-2 border border-slate-700">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-base text-[#FFD600]">speed</span>
              <span className="font-telemetry-sm text-xs text-[#FFD600] font-black tracking-wide">42 KM/H VELOCITY</span>
            </div>
            <span className="font-label-sm text-xs text-gray-300 font-semibold">Optimal Flow · NH-48</span>
          </div>
        </div>

        {/* Searching UI or Captain Profile */}
        {activeRide.status === "SEARCHING" ? (
          <div className="p-space-xl rounded-xl bg-[#111111] text-white border border-gray-800 flex flex-col items-center justify-center gap-space-md shadow-md text-center py-12">
            <div className="relative">
              <span className="material-symbols-outlined text-5xl text-[#FFD600] animate-pulse">radar</span>
              <div className="absolute inset-0 bg-[#FFD600]/20 rounded-full blur-xl animate-ping"></div>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-headline-sm text-lg font-bold text-white tracking-wide">Searching for Captains</h3>
              <p className="font-telemetry-sm text-sm text-gray-400">Broadcasting your request to nearby captains...</p>
            </div>
          </div>
        ) : (
          <div className="p-space-lg rounded-xl bg-[#111111] text-white border border-gray-800 flex flex-col gap-space-md shadow-md">
            <div className="flex items-center gap-space-md">
              <div className="relative">
                <img 
                  className="w-14 h-14 rounded-full object-cover shadow-md ring-2 ring-[#FFD600] bg-slate-800" 
                  src={activeRide.captain?.user?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeRide.captain?.user ? `${activeRide.captain.user.firstName} ${activeRide.captain.user.lastName}` : 'Captain')}&background=111111&color=FFD600`} 
                  alt="Captain Avatar" 
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#FFD600] text-black flex items-center justify-center shadow font-bold">
                  <span className="material-symbols-outlined text-xs text-black" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {activeRide.captain?.vehicleType === 'BIKE' ? 'two_wheeler' : 'directions_car'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-space-xs">
                  <h3 className="font-headline-sm text-lg font-bold text-white truncate">
                    {activeRide.captain?.user ? `${activeRide.captain.user.firstName} ${activeRide.captain.user.lastName}` : 'Captain'}
                  </h3>
                  <span className="material-symbols-outlined text-sm text-[#FFD600]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </div>
                <div className="flex items-center gap-space-xs font-telemetry-sm text-xs text-gray-300 mt-0.5">
                  <span className="flex items-center text-[#FFD600] font-bold">★ {activeRide.captain?.rating?.toFixed(1) || '4.9'}</span>
                  <span className="text-gray-500">·</span>
                  <span>{activeRide.captain?.totalTrips || 0} trips</span>
                  <span className="text-gray-500">·</span>
                  <span className="px-2 py-0.5 rounded bg-[#FFD600] text-black font-extrabold text-[10px] tracking-wide">GOLD</span>
                </div>
              </div>
            </div>

            {/* Vehicle verification pill */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#1E293B] border border-slate-700">
              <div className="flex flex-col">
                <span className="font-label-sm text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Assigned Vehicle</span>
                <span className="font-body-sm text-sm text-white font-bold">{activeRide.captain?.vehicleModel || 'Standard Vehicle'}</span>
                <span className="font-telemetry-sm text-[11px] text-gray-300">TRIPZO Verified Fleet</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-label-sm text-[10px] text-gray-400 font-bold uppercase tracking-wider">VERIFIED NUMBER</span>
                <span className="font-telemetry-md text-xs tracking-wider text-black bg-[#FFD600] px-2.5 py-1 rounded font-black mt-0.5 shadow-sm">
                  {activeRide.captain?.vehicleNumber || '---'}
                </span>
              </div>
            </div>

            {/* Direct shortcuts */}
            <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
              <button className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-white transition-all active:scale-95 group border border-slate-700">
                <span className="material-symbols-outlined text-lg text-[#FFD600] group-hover:scale-110 transition-transform">call</span>
                <span className="font-label-sm text-xs mt-1 font-semibold">Call Captain</span>
              </button>
              <button className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-white transition-all active:scale-95 group border border-slate-700">
                <span className="material-symbols-outlined text-lg text-white group-hover:scale-110 transition-transform">share_location</span>
                <span className="font-label-sm text-xs mt-1 font-semibold">Share Ride</span>
              </button>
              <button 
                className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-200 transition-all active:scale-95 group border border-red-700/50"
                onClick={async () => {
                  await rideService.cancelRide(activeRide.id);
                  setActiveRide(null);
                }}
              >
                <span className="material-symbols-outlined text-lg text-red-400 group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                <span className="font-label-sm text-xs mt-1 font-black tracking-wide text-red-200">SOS Shield</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Route Progress Tracker (Jet Black Card) */}
        <div className="p-space-lg rounded-xl bg-[#111111] text-white border border-gray-800 flex flex-col gap-space-md shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-label-lg text-sm text-white font-bold tracking-wide">Route Milestones</span>
            <span className="font-telemetry-sm text-xs text-[#FFD600] font-bold uppercase tracking-wider">Live Corridor</span>
          </div>
          <div className="relative pl-6 flex flex-col gap-space-md">
            {/* Vertical progress line */}
            <div className="absolute left-2.5 top-2 bottom-3 w-0.5 bg-slate-700"></div>
            <div className="absolute left-2.5 top-2 h-1/2 w-0.5 bg-[#FFD600] shadow-[0_0_8px_rgba(255,214,0,0.8)]"></div>
            
            {/* Stop 1: Pickup */}
            <div className="relative flex items-start justify-between">
              <div className="absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full bg-[#FFD600] ring-4 ring-[#111111] flex items-center justify-center"></div>
              <div className="flex flex-col">
                <span className="font-label-lg text-sm text-white font-semibold">Connaught Place Outer Circle</span>
                <span className="font-body-sm text-xs text-gray-400">Gate 4, Opp. Regal Cinema</span>
              </div>
              <span className="font-telemetry-sm text-xs text-gray-400">10:14 AM</span>
            </div>

            {/* Stop 2: Current Position */}
            <div className="relative flex items-start justify-between">
              <div className="absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full bg-[#FFD600] ring-4 ring-[#111111] animate-pulse"></div>
              <div className="flex flex-col">
                <span className="font-label-lg text-sm text-[#FFD600] font-bold">Outer Ring Road (Transit)</span>
                <span className="font-body-sm text-xs text-gray-300">Approaching Dhaula Kuan flyover</span>
              </div>
              <span className="font-telemetry-sm text-xs text-[#FFD600] font-black px-1.5 py-0.5 bg-[#1E293B] rounded">NOW</span>
            </div>

            {/* Stop 3: Drop-off */}
            <div className="relative flex items-start justify-between">
              <div className="absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-sm bg-white ring-4 ring-[#111111]"></div>
              <div className="flex flex-col">
                <span className="font-label-lg text-sm text-white font-semibold">Cyber City Gate 3</span>
                <span className="font-body-sm text-xs text-gray-400">DLF Phase 2, Gurugram</span>
              </div>
              <span className="font-telemetry-sm text-xs text-gray-400">10:38 AM</span>
            </div>
          </div>
        </div>

        {/* Fare, Payment & OTP Pill (High-Contrast Charcoal & Slate Cards) */}
        <div className="grid grid-cols-2 gap-space-sm">
          <div className="p-space-md rounded-xl bg-[#111111] text-white border border-gray-800 flex flex-col justify-between shadow-sm">
            <span className="font-label-sm text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Locked Fare</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-headline-md text-2xl font-black text-white">₹{activeRide.fare || "148"}</span>
              <span className="font-body-sm text-xs text-[#FFD600] font-bold">Guaranteed</span>
            </div>
            <span className="font-telemetry-sm text-xs text-gray-400 mt-1">TRIPZO Pay Direct</span>
          </div>
          
          <div className="p-space-md rounded-xl bg-[#1E293B] text-white border border-slate-700 flex flex-col justify-between shadow-sm">
            <span className="font-label-sm text-[11px] text-gray-300 uppercase tracking-wider font-bold">Start PIN</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-headline-md text-2xl text-black bg-[#FFD600] px-2 py-0.5 rounded font-black tracking-widest shadow-sm">4892</span>
              <span className="material-symbols-outlined text-base text-[#FFD600]">check_circle</span>
            </div>
            <span className="font-telemetry-sm text-xs text-emerald-400 font-semibold mt-1">Verified on pickup</span>
          </div>
        </div>

        {/* Safety Bottom Dispatch Card */}
        <div className="p-space-md rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between mt-2">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-[#111111] flex items-center justify-center text-[#FFD600]">
              <span className="material-symbols-outlined text-lg">health_and_safety</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-xs text-[#111111] font-bold">Tripzo 24x7 Safety Dispatch</span>
              <span className="font-telemetry-sm text-[11px] text-gray-500">Telemetry monitored automatically</span>
            </div>
          </div>
          <button className="text-[#111111] font-label-sm text-xs font-bold underline hover:text-black">Details</button>
        </div>
      </div>
    </div>
  );
}
