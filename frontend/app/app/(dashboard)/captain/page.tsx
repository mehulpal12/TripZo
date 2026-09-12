"use client";

import { useEffect, useState } from "react";
import { useCaptainStore } from "@/stores/captain.store";
import { captainService } from "@/lib/api/captain.service";
import { CaptainMapContainer } from "@/components/map/CaptainMapContainer";
import { useCaptainSocket } from "@/hooks/useCaptainSocket";

export default function CaptainPage() {
  const { isOnline, setOnline, activeRequest, setActiveRequest, activeRide, setActiveRide } = useCaptainStore();
  const [countdown, setCountdown] = useState(15);
  const [accepting, setAccepting] = useState(false);

  // Initialize socket and simulator
  useCaptainSocket();

  const handleOnlineToggle = async (checked: boolean) => {
    if (!checked && activeRequest && !accepting) {
      setActiveRequest(null);
    }
    
    try {
      if (checked) {
        await captainService.setOnline();
      } else {
        await captainService.setOffline();
      }
      setOnline(checked);
    } catch (error) {
      console.error("Failed to toggle online status", error);
    }
  };

  // Timer for active request
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeRequest && !accepting) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setActiveRequest(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeRequest, accepting, setActiveRequest]);

  const handleAccept = async () => {
    if (!activeRequest) return;
    setAccepting(true);
    try {
      const response = await captainService.acceptRide(activeRequest.id);
      setActiveRide(response.ride);
      setActiveRequest(null);
    } catch (error) {
      console.error("Failed to accept ride", error);
      // Revert if someone else took it
      setActiveRequest(null);
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    setActiveRequest(null);
  };

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto">
      {/* Captain Cockpit Sub-Bar / High-Visibility Telemetry (Off-White Canvas + Deep Charcoal Cards) */}
      <section className="w-full bg-white border-b border-[#E2E8F0] px-margin-desktop py-space-md shadow-sm z-20 shrink-0">
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-space-md">
          {/* Primary Status Toggle */}
          <div className="flex items-center gap-space-md">
            <button 
              className={`group relative flex items-center gap-space-md px-space-lg py-space-sm rounded-full ${isOnline ? 'bg-[#111111] border-[#111111] text-white' : 'bg-slate-200 border-slate-300 text-slate-500'} shadow-md transition-all border-2`}
              onClick={() => handleOnlineToggle(!isOnline)}
            >
              <div className="relative flex items-center justify-center w-6 h-6">
                {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD600] opacity-70"></span>}
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isOnline ? 'bg-[#FFD600] shadow-[0_0_10px_#FFD600]' : 'bg-slate-400'}`}></span>
              </div>
              <div className="flex flex-col text-left">
                <span className={`text-[10px] ${isOnline ? 'text-[#FFD600]' : 'text-slate-500'} font-extrabold tracking-widest uppercase`}>Driver Cockpit Status</span>
                <span className="text-sm font-extrabold tracking-tight">{isOnline ? 'ONLINE · ACCEPTING RIDES' : 'OFFLINE'}</span>
              </div>
              <span className={`material-symbols-outlined ${isOnline ? 'text-[#FFD600]' : 'text-slate-400'} group-hover:translate-x-0.5 transition-transform text-xl`}>power_settings_new</span>
            </button>
            <div className="hidden 2xl:flex items-center gap-space-xs px-3 py-1.5 rounded-full bg-[#F1F3F5] border border-slate-200">
              <span className="material-symbols-outlined text-slate-600 text-sm">satellite_alt</span>
              <span className="text-xs font-semibold text-slate-600 uppercase">RTK-GPS: ±0.3m · 100Hz</span>
            </div>
          </div>

          {/* Real-time Shift Telemetry */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm sm:gap-space-md items-center">
            <div className="flex flex-col px-4 py-2 rounded-xl bg-[#111111] text-white shadow-sm border border-slate-800">
              <div className="flex items-center justify-between gap-space-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Shift Revenue</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#FFD600] text-black uppercase">Phase 8</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white">₹1,420</span>
                <span className="text-xs font-bold text-[#FFD600]">+14% vs avg</span>
              </div>
            </div>
            <div className="flex flex-col px-4 py-2 rounded-xl bg-[#1E293B] text-white shadow-sm border border-slate-700">
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Completed Trips</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white">9</span>
                <span className="text-xs font-semibold text-slate-300">/ 12 Target</span>
              </div>
            </div>
            <div className="flex flex-col px-4 py-2 rounded-xl bg-[#1E293B] text-white shadow-sm border border-slate-700">
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Acceptance Metric</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-emerald-400">98.2%</span>
                <span className="material-symbols-outlined text-emerald-400 text-xs">verified</span>
              </div>
            </div>
            <div className="flex flex-col px-4 py-2 rounded-xl bg-[#111111] text-white shadow-sm border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Captain Score</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-[#FFD600]">4.95</span>
                <div className="flex text-[#FFD600]">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </div>
                <span className="text-xs font-medium text-slate-400">(1.2k)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Cockpit Tactical Stage */}
      <div className="w-full max-w-[1680px] mx-auto px-margin-desktop py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start flex-1 min-h-0">
        
        {/* LEFT PANEL */}
        <div className="lg:col-span-5 flex flex-col gap-space-md w-full h-full overflow-y-auto pb-10 custom-scrollbar pr-2">
          
          {/* Active Request Overlay */}
          {activeRequest && !activeRide && (
            <div className={`relative overflow-hidden rounded-2xl bg-[#111111] text-white p-space-lg shadow-xl border-2 ${accepting ? 'border-[#FFD600] ring-4 ring-[#FFD600]' : 'border-slate-800'} flex flex-col gap-space-md transition-all duration-300`}>
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#FFD600]/15 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-center justify-between gap-space-md relative z-10">
                <div className="flex items-center gap-space-sm">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#FFD600] text-[#111111] shadow-md">
                    <span className="material-symbols-outlined text-xl font-extrabold">{accepting ? 'check_circle' : 'bolt'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold text-[#FFD600] uppercase tracking-widest block">Priority Dispatch Alert</span>
                    <h2 className="text-lg font-black text-white tracking-tight">{accepting ? 'ACCEPTED' : 'NEW RIDE REQUEST'}</h2>
                  </div>
                </div>
                {!accepting && (
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                      <path className="text-[#FFD600] transition-all duration-1000 ease-linear" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="100, 100" strokeDashoffset={100 - (countdown / 15) * 100} strokeLinecap="round" strokeWidth="3.5" />
                    </svg>
                    <span className="absolute text-xs font-black text-[#FFD600]">{countdown}s</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-space-md py-3 rounded-xl bg-[#1E293B] border border-slate-700 relative z-10">
                <div className="flex items-center gap-space-sm">
                  <div className="p-2 rounded-lg bg-black/40 text-[#FFD600] border border-slate-700">
                    <span className="material-symbols-outlined text-xl">two_wheeler</span>
                  </div>
                  <div>
                    <span className="text-base font-extrabold text-white block">TRIPZO Moto</span>
                    <span className="text-xs text-slate-300 font-medium">Fleet Sector · Rapid Express</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-space-xs">
                    <span className="text-2xl font-black text-white tracking-tight">₹{activeRequest.fare || 148}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded bg-[#FFD600] text-black uppercase tracking-wide shadow-sm mt-0.5">
                    <span className="material-symbols-outlined text-xs font-bold">bolt</span> Instant Settlement
                  </span>
                </div>
              </div>

              {/* Waypoint Box */}
              <div className="flex flex-col gap-3 p-space-md rounded-xl bg-[#1E293B] border border-slate-700 relative z-10">
                <div className="flex items-start gap-space-md">
                  <div className="flex flex-col items-center mt-1">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#FFD600] ring-4 ring-[#FFD600]/20"></span>
                    <span className="w-0.5 h-10 bg-slate-600 my-0.5"></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#FFD600] uppercase tracking-wider">PICKUP · 1.2 km away</span>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded bg-black/50 text-white border border-slate-600">3 MINS ETA</span>
                    </div>
                    <p className="text-base font-bold text-white truncate">Connaught Place</p>
                  </div>
                </div>
                <div className="flex items-start gap-space-md">
                  <div className="flex flex-col items-center mt-1">
                    <span className="w-3.5 h-3.5 rotate-45 bg-emerald-400 ring-4 ring-emerald-400/20"></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">DESTINATION</span>
                    </div>
                    <p className="text-base font-bold text-white truncate">Cyber City</p>
                  </div>
                </div>
              </div>

              {!accepting ? (
                <div className="grid grid-cols-3 gap-space-sm pt-1 relative z-10">
                  <button onClick={handleDecline} className="col-span-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all active:scale-95 font-bold">
                    <span className="material-symbols-outlined text-rose-400 text-lg">close</span>
                    <span className="text-sm">Pass</span>
                  </button>
                  <button onClick={handleAccept} className="col-span-2 relative group overflow-hidden flex items-center justify-center gap-2 py-3.5 px-space-lg rounded-xl bg-[#FFD600] hover:bg-[#FACC15] text-[#111111] transition-all active:scale-95 shadow-lg shadow-yellow-500/20 font-black tracking-tight text-base">
                    <span className="material-symbols-outlined text-2xl font-black">electric_bolt</span>
                    <span>ACCEPT RIDE</span>
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform font-bold">arrow_forward</span>
                  </button>
                </div>
              ) : (
                <div className="pt-1 relative z-10">
                  <div className="w-full py-3.5 px-space-lg rounded-xl bg-[#FFD600] text-black flex items-center justify-center gap-2 font-black shadow-xl">
                    <span className="material-symbols-outlined text-xl animate-spin">sync</span>
                    <span className="font-black">LOCKING ROUTE...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!activeRequest && !activeRide && isOnline && (
            <div className="flex flex-col items-center justify-center py-space-xl text-center gap-space-sm text-slate-500 my-10 bg-white border border-dashed border-slate-300 rounded-2xl h-64">
              <span className="material-symbols-outlined text-4xl text-[#FFD600] animate-pulse">radar</span>
              <span className="text-lg font-bold text-[#111111]">Scanning for nearby riders...</span>
              <span className="text-xs">You are online and ready to accept rides.</span>
            </div>
          )}
          
          {!activeRequest && !activeRide && !isOnline && (
            <div className="flex flex-col items-center justify-center py-space-xl text-center gap-space-sm text-slate-500 my-10 bg-white border border-slate-200 rounded-2xl h-64 shadow-sm">
              <span className="material-symbols-outlined text-4xl text-slate-300">power_off</span>
              <span className="text-lg font-bold text-[#111111]">You are currently offline</span>
              <span className="text-xs">Toggle the status bar above to start receiving rides.</span>
            </div>
          )}

          {activeRide && (
            <div className="flex flex-col gap-space-sm p-space-md rounded-2xl bg-[#111111] text-white shadow-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FFD600] uppercase">ACTIVE RIDE</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#1E293B]">IN PROGRESS</span>
              </div>
              
              <div className="flex items-center gap-3 py-2">
                <span className="material-symbols-outlined text-4xl text-[#FFD600]">directions_bike</span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">Navigating to Dropoff</span>
                  <span className="text-xs text-slate-400">Cyber City</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button 
                  className="py-3 px-4 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition-colors"
                  onClick={async () => {
                     try {
                       const res = await captainService.updateRideStatus(activeRide.id, 'CAPTAIN_ARRIVED');
                       setActiveRide(res.ride);
                     } catch (err) {
                       console.error(err);
                     }
                  }}
                >
                  Arrived at Pickup
                </button>
                <button 
                  className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-sm transition-colors shadow-lg shadow-emerald-500/20"
                  onClick={async () => {
                     try {
                       if (activeRide.status === 'CAPTAIN_ARRIVED') {
                         const res = await captainService.updateRideStatus(activeRide.id, 'IN_PROGRESS');
                         setActiveRide(res.ride);
                       } else if (activeRide.status === 'IN_PROGRESS') {
                         await captainService.updateRideStatus(activeRide.id, 'COMPLETED');
                         setActiveRide(null);
                       }
                     } catch (err) {
                       console.error(err);
                     }
                  }}
                >
                  {activeRide.status === 'CAPTAIN_ARRIVED' ? 'Start Trip' : 'Complete Trip'}
                </button>
              </div>
            </div>
          )}

          {/* Upcoming Scheduled Ride Reservation Card */}
          <div className="flex flex-col gap-space-sm p-space-md rounded-2xl bg-white border border-slate-200 shadow-sm mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-slate-700 text-base">event_upcoming</span>
                <span className="text-xs text-slate-700 font-extrabold uppercase tracking-wider">Scheduled Queue</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">1 UPCOMING</span>
            </div>
            <div className="p-space-md rounded-xl bg-[#F8F9FA] border border-slate-200 flex flex-col gap-1.5 transition-all hover:bg-slate-50 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-slate-700 text-sm">alarm</span>
                  <span className="text-sm font-bold text-[#111111]">Today, 2:30 PM (Reservation)</span>
                </div>
                <span className="text-base font-extrabold text-[#111111]">₹490</span>
              </div>
              <p className="text-xs text-slate-700 font-medium truncate">Connaught Place Metro <span className="text-slate-400">➔</span> T3 IGI Airport Departure</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Confirmed with Flight AI Sync #AI-902</span>
                <span className="text-xs font-bold text-[#111111] flex items-center gap-0.5 hover:underline">Details <span className="material-symbols-outlined text-xs">chevron_right</span></span>
              </div>
            </div>
          </div>

          {/* Quick Vehicle & Hardware Telemetry */}
          <div className="grid grid-cols-2 gap-space-sm mt-4">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-3 shadow-sm">
              <div className="p-2 rounded-lg bg-[#F1F3F5] text-slate-800">
                <span className="material-symbols-outlined text-xl font-bold">battery_charging_full</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Battery Range</span>
                <span className="text-sm font-black text-[#111111]">84% · 118 km</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-3 shadow-sm">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <span className="material-symbols-outlined text-xl font-bold">network_check</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Mesh Latency</span>
                <span className="text-sm font-black text-emerald-700">18 ms · Strong</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Bright Daylight Navigation Map Viewport */}
        <div className="lg:col-span-7 flex flex-col gap-space-md w-full h-full">
          <CaptainMapContainer />
          
          {/* Operational Fleet Health Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mt-4">
            <div className="p-space-md rounded-2xl bg-white border border-slate-200 flex items-start gap-space-sm shadow-sm">
              <div className="p-2.5 rounded-xl bg-[#111111] text-[#FFD600] shadow-sm">
                <span className="material-symbols-outlined text-xl">speed</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Speed Telemetry</span>
                <span className="text-lg font-black text-[#111111]">42 km/h</span>
                <span className="text-xs font-semibold text-emerald-600 block">Within City Limits</span>
              </div>
            </div>
            <div className="p-space-md rounded-2xl bg-white border border-slate-200 flex items-start gap-space-sm shadow-sm">
              <div className="p-2.5 rounded-xl bg-[#FFD600] text-[#111111] shadow-sm">
                <span className="material-symbols-outlined text-xl font-bold">payments</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Weekly Payout Status</span>
                <span className="text-lg font-black text-[#111111]">₹11,480</span>
                <span className="text-xs font-medium text-slate-500 block">Auto-transfer on Monday</span>
              </div>
            </div>
            <div className="p-space-md rounded-2xl bg-white border border-slate-200 flex items-start gap-space-sm shadow-sm">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shadow-sm">
                <span className="material-symbols-outlined text-xl font-bold">verified_user</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Safety Shield</span>
                <span className="text-lg font-black text-emerald-700">ACTIVE</span>
                <span className="text-xs font-medium text-slate-500 block">Delhi Police Telematics Sync</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
