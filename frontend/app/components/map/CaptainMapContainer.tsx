"use client";

import { useCaptainStore } from "@/stores/captain.store";
import { useEffect } from "react";

export function CaptainMapContainer() {
  const { isOnline, activeRequest, activeRide } = useCaptainStore();

  return (
    <div className="relative w-full h-[640px] rounded-2xl overflow-hidden bg-white border-2 border-slate-200 shadow-xl flex flex-col justify-between p-space-md">
      {/* Bright Daylight Google Maps Imagery Canvas */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center" 
        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBjDqIERsFRSviA9ZV1F1tGQKzzYjWxrtHov-YRZzkPEg6lvfrSc9TrN2bDVdAbwWM1WGguMBgfPBUnHcMqVX3H1QR2rZC0uCvaVcQSBH8_2E4YBcniFKlPbYbme9jxvoKHRnaWED_zfOFjW_iTaecCb84KzJ_9OpzUi8NQ0w87q7uX3QZ-ZGUOaLzRNVeQAv2gdruJBIbuNh3OgsglDiOXI5dmAErzf2dP1NfSjz-rI9c44l-fjzOIXg')" }}
      ></div>
      
      {/* Soft daylight contrast filter ensuring crisp street readability */}
      <div className="absolute inset-0 bg-white/10 pointer-events-none"></div>

      {/* SVG Overlaid High-Visibility Routing Trajectory */}
      {(activeRequest || activeRide) && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none" viewBox="0 0 800 640">
          <defs>
            <linearGradient id="daylightRouteGradient" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#FFD600" stopOpacity="1"></stop>
              <stop offset="35%" stopColor="#FFB703" stopOpacity="1"></stop>
              <stop offset="100%" stopColor="#0284C7" stopOpacity="1"></stop>
            </linearGradient>
            <filter height="150%" id="routeOutline" width="150%" x="-25%" y="-25%">
              <feDropShadow dx="0" dy="2" floodColor="#000000" floodOpacity="0.35" stdDeviation="2"></feDropShadow>
            </filter>
          </defs>
          
          {/* Captain Position to Pickup CP Gate 4 (High-contrast Yellow Dotted line) */}
          <path d="M 220 280 L 290 220" fill="none" stroke="#111111" strokeDasharray="6,4" strokeWidth="4"></path>
          
          {/* Outer High-Contrast Border for Route Trajectory */}
          <path d="M 290 220 C 360 260, 410 390, 520 440 S 660 520, 710 570" fill="none" filter="url(#routeOutline)" stroke="#111111" strokeLinecap="round" strokeLinejoin="round" strokeWidth="9"></path>
          
          {/* High-Vis Core Vector */}
          <path d="M 290 220 C 360 260, 410 390, 520 440 S 660 520, 710 570" fill="none" stroke="url(#daylightRouteGradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6"></path>
          
        </svg>
      )}

      {/* Dynamic Waypoint Pin HUD Layer */}
      {isOnline && (
        <div className="absolute z-20 left-[215px] top-[275px] -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all" id="simulated-captain-marker">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute w-9 h-9 rounded-full bg-[#FFD600] opacity-75"></span>
            <div className="w-8 h-8 rounded-full bg-[#111111] text-[#FFD600] border-2 border-white flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-base font-black">navigation</span>
            </div>
            <span className="absolute top-9 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#111111] text-[#FFD600] font-extrabold text-[11px] whitespace-nowrap shadow-md border border-slate-700">
              YOU (Capt. Vikram)
            </span>
          </div>
        </div>
      )}

      {/* Pickup & Dropoff Pins */}
      {(activeRequest || activeRide) && (
        <>
          <div className="absolute z-20 left-[295px] top-[215px] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111111] text-white border border-slate-700 shadow-xl">
              <span className="w-3 h-3 rounded-full bg-[#FFD600] shadow-[0_0_6px_#FFD600]"></span>
              <span className="text-xs font-black tracking-tight">PICKUP: CP Gate 4</span>
            </div>
          </div>
          <div className="absolute z-20 left-[705px] top-[565px] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111111] text-white border border-slate-700 shadow-xl">
              <span className="w-3 h-3 rotate-45 bg-emerald-400 shadow-[0_0_6px_#34D399]"></span>
              <span className="text-xs font-black tracking-tight">DROP: Cyber City B10</span>
            </div>
          </div>
        </>
      )}


      {/* Map Bottom Floating Navigation Command Deck */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-space-md p-space-sm rounded-xl bg-[#1E293B]/95 backdrop-blur-md border border-slate-700 shadow-2xl mt-auto">
        <div className="flex items-center gap-space-sm">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FFD600] text-[#111111] hover:bg-[#FACC15] transition-all font-black text-xs shadow-md">
            <span className="material-symbols-outlined text-base font-black">directions</span>
            <span>Google Maps Turn-by-Turn</span>
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-all text-xs font-bold border border-slate-700">
            <span className="material-symbols-outlined text-emerald-400 text-base">call</span>
            <span>Rider Contact</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-950 border border-slate-700 transition-all shadow-sm" title="Safety Dispatch SOS">
            <span className="material-symbols-outlined text-lg">shield</span>
          </button>
          <button className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-slate-700 transition-all text-xs font-extrabold uppercase border border-slate-700">
            <span className="material-symbols-outlined text-sm">pause_circle</span>
            Go Offline
          </button>
        </div>
      </div>
    </div>
  );
}
