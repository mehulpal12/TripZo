"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useCaptainStore } from "@/stores/captain.store";
import { captainService } from "@/lib/api/captain.service";
import { useCaptainSocket } from "@/hooks/useCaptainSocket";
import { CaptainRideHistory } from "@/features/captain/CaptainRideHistory";
import { CaptainScheduledRides } from "@/features/captain/CaptainScheduledRides";

const CaptainMapContainer = dynamic(
  () => import("@/components/map/CaptainMapContainer").then((mod) => mod.CaptainMapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">Initializing Tactical Cockpit...</span>
      </div>
    ),
  }
);

export default function CaptainPage() {
  const {
    isOnline,
    setOnline,
    activeRequest,
    setActiveRequest,
    activeRide,
    setActiveRide,
    activeTab,
    setActiveTab,
  } = useCaptainStore();

  const [countdown, setCountdown] = useState(15);
  const [accepting, setAccepting] = useState(false);
  const [updatingRide, setUpdatingRide] = useState(false);

  // Initialize socket and simulator
  useCaptainSocket();

  // Auto-switch to Cockpit if a new incoming ride request or active ride appears
  useEffect(() => {
    if (activeRequest || activeRide) {
      setActiveTab("cockpit");
    }
  }, [activeRequest, activeRide, setActiveTab]);

  // Restore state on load
  useEffect(() => {
    let isMounted = true;
    captainService.getCurrentState().then((state) => {
      if (isMounted) {
        if (state.activeRide) {
          setActiveRide(state.activeRide);
          setOnline(true);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [setActiveRide, setOnline]);

  const handleOnlineToggle = async (checked: boolean) => {
    if (activeRide) {
      alert("You cannot go offline while on an active ride. Please complete or cancel the ride first.");
      return;
    }

    if (!checked && activeRequest && !accepting) {
      setActiveRequest(null);
    }

    try {
      if (checked) {
        await captainService.setOnline();
        setOnline(true);
      } else {
        await captainService.setOffline();
        setOnline(false);
      }
    } catch (error) {
      console.error("Failed to update captain online status", error);
      alert("Network error updating captain status");
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
    if (!activeRequest || accepting) return;
    setAccepting(true);
    try {
      const { ride } = await captainService.acceptRide(activeRequest.id);
      setActiveRide(ride);
      setActiveRequest(null);
    } catch (error) {
      console.error("Failed to accept ride", error);
      alert("Failed to accept ride. It may have expired or been assigned to another captain.");
      setActiveRequest(null);
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!activeRequest) return;
    const rideId = activeRequest.id;
    setActiveRequest(null);
    try {
      await captainService.rejectRide(rideId);
    } catch (error) {
      console.error("Failed to record ride rejection", error);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-full bg-[#F8F9FA]">
      {/* Captain Cockpit Sub-Bar / High-Visibility Telemetry */}
      <section className="w-full bg-white border-b border-[#E2E8F0] px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 shadow-sm z-20 shrink-0">
        <div className="max-w-[1680px] mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          
          {/* Primary Status Toggle & View Switcher */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto flex-wrap">
            <button
              className={`group relative flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3 px-4 sm:px-5 py-2.5 rounded-full ${
                isOnline
                  ? "bg-[#111111] border-[#111111] text-white"
                  : "bg-slate-200 border-slate-300 text-slate-500"
              } shadow-md transition-all border-2 active:scale-[0.98] ${
                activeRide ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => handleOnlineToggle(!isOnline)}
              disabled={!!activeRide}
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="relative flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6">
                  {isOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD600] opacity-70"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-3 sm:h-3.5 w-3 sm:w-3.5 ${
                      isOnline ? "bg-[#FFD600] shadow-[0_0_10px_#FFD600]" : "bg-slate-400"
                    }`}
                  ></span>
                </div>
                <div className="flex flex-col text-left">
                  <span
                    className={`text-[9px] sm:text-[10px] ${
                      isOnline ? "text-[#FFD600]" : "text-slate-500"
                    } font-extrabold uppercase tracking-widest leading-none`}
                  >
                    STATUS
                  </span>
                  <span className="text-xs sm:text-sm font-black tracking-tight leading-tight">
                    {isOnline ? "ONLINE • RECEIVING TRIPS" : "OFFLINE • STANDBY"}
                  </span>
                </div>
              </div>
              <span
                className={`material-symbols-outlined ${
                  isOnline ? "text-[#FFD600]" : "text-slate-400"
                } group-hover:translate-x-0.5 transition-transform text-lg sm:text-xl ml-2`}
              >
                power_settings_new
              </span>
            </button>

          </div>


        </div>
      </section>

      {/* Dynamic View: Cockpit vs Scheduled Rides vs Ride History */}
      {activeTab === "history" ? (
        <CaptainRideHistory />
      ) : activeTab === "scheduled" ? (
        <CaptainScheduledRides />
      ) : (
        /* Main Cockpit Tactical Stage */
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 items-start flex-1 min-h-0">
          
          {/* LEFT PANEL */}
          <div className="order-2 lg:order-1 lg:col-span-5 flex flex-col gap-3 sm:gap-4 w-full pb-8 lg:pb-10">
            
            {/* Active Request Overlay */}
            {activeRequest && !activeRide && (
              <div
                className={`relative overflow-hidden rounded-2xl bg-[#111111] text-white p-3.5 sm:p-5 shadow-xl border-2 ${
                  accepting ? "border-[#FFD600] ring-4 ring-[#FFD600]" : "border-slate-800"
                } flex flex-col gap-3 sm:gap-4 transition-all duration-300`}
              >
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#FFD600]/15 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex items-center justify-between gap-2 sm:gap-3 relative z-10">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FFD600] text-[#111111] shadow-md flex-shrink-0">
                      <span className="material-symbols-outlined text-lg sm:text-xl font-extrabold">
                        {accepting ? "check_circle" : "bolt"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-[#FFD600] uppercase tracking-widest block truncate">
                        Priority Dispatch Alert
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                        {accepting ? "ACCEPTED" : "NEW RIDE REQUEST"}
                      </h2>
                    </div>
                  </div>
                  {!accepting && (
                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-700"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                        />
                        <path
                          className="text-[#FFD600] transition-all duration-1000 ease-linear"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray="100, 100"
                          strokeDashoffset={100 - (countdown / 15) * 100}
                          strokeLinecap="round"
                          strokeWidth="3.5"
                        />
                      </svg>
                      <span className="absolute text-[11px] sm:text-xs font-black text-[#FFD600]">
                        {countdown}s
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-[#1E293B] border border-slate-700 relative z-10">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-black/40 text-[#FFD600] border border-slate-700">
                      <span className="material-symbols-outlined text-lg sm:text-xl">two_wheeler</span>
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-extrabold text-white block">TRIPZO Moto</span>
                      <span className="text-[11px] sm:text-xs text-slate-300 font-medium">
                        Fleet Sector · Rapid Express
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center">
                      <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        ₹{activeRequest.fare || 148}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#FFD600] text-black uppercase tracking-wide shadow-sm mt-0.5">
                      <span className="material-symbols-outlined text-[10px] font-bold">bolt</span> Instant
                    </span>
                  </div>
                </div>

                {/* Waypoint Box */}
                <div className="flex flex-col gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl bg-[#1E293B] border border-slate-700 relative z-10">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="flex flex-col items-center mt-1">
                      <span className="w-3 h-3 rounded-full bg-[#FFD600] ring-4 ring-[#FFD600]/20"></span>
                      <span className="w-0.5 h-8 bg-slate-600 my-0.5"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#FFD600] uppercase tracking-wider">
                          PICKUP · 1.2 km away
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-black/50 text-white border border-slate-600">
                          3 MINS
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-white truncate">
                        {activeRequest.pickup?.address || activeRequest.pickup?.name || "Pickup Point"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="flex flex-col items-center mt-1">
                      <span className="w-3 h-3 rotate-45 bg-emerald-400 ring-4 ring-emerald-400/20"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                          DESTINATION
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-white truncate">
                        {activeRequest.destination?.address ||
                          activeRequest.destination?.name ||
                          "Dropoff Point"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Reject / Accept Action Footers */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-1 relative z-10">
                  <button
                    disabled={accepting}
                    className="py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs sm:text-sm transition-all border border-slate-700 active:scale-95 disabled:opacity-50 cursor-pointer"
                    onClick={handleDecline}
                  >
                    Decline
                  </button>
                  <button
                    disabled={accepting}
                    className="py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl bg-[#FFD600] hover:bg-[#FACC15] text-black font-black text-xs sm:text-sm transition-all active:scale-95 shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    onClick={handleAccept}
                  >
                    <span className="material-symbols-outlined text-base sm:text-lg">check_circle</span>
                    <span>{accepting ? "Accepting..." : "Accept Now"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Offline Message */}
            {!activeRequest && !activeRide && !isOnline && (
              <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center gap-2 text-slate-500 my-1 sm:my-3 bg-white border border-slate-200 rounded-2xl h-44 sm:h-52 shadow-sm">
                <span className="material-symbols-outlined text-3xl sm:text-4xl text-slate-300">
                  power_off
                </span>
                <span className="text-base sm:text-lg font-bold text-[#111111]">
                  You are currently offline
                </span>
                <span className="text-xs text-slate-400">
                  Toggle the status switch above to start receiving rides.
                </span>
              </div>
            )}

            {/* Online - Radar Scanning & Waiting for Rider */}
            {!activeRequest && !activeRide && isOnline && (
              <div className="relative overflow-hidden flex flex-col items-center justify-center py-7 sm:py-9 text-center gap-3 my-1 sm:my-3 bg-white border-2 border-dashed border-emerald-200 rounded-2xl shadow-sm">
                {/* Background ambient radar glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 via-white to-white pointer-events-none" />

                {/* Radar Sonar Wave Pulse */}
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-emerald-400 opacity-25"></span>
                  <span className="animate-ping absolute inline-flex h-24 w-24 rounded-full bg-emerald-300 opacity-15" style={{ animationDuration: "2s" }}></span>
                  <div className="relative z-10 w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <span className="material-symbols-outlined text-3xl animate-pulse">
                      sensors
                    </span>
                  </div>
                </div>

                {/* Status Text */}
                <div className="relative z-10 flex flex-col items-center gap-1 max-w-xs sm:max-w-sm px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-black text-emerald-700 tracking-wider uppercase">
                      Fleet Radar Active
                    </span>
                  </div>
                  <span className="text-base sm:text-lg font-black text-[#111111] tracking-tight">
                    Searching for Nearby Ride Requests...
                  </span>
                  <span className="text-xs text-slate-500 leading-relaxed font-medium">
                    You are online in the Delhi-NCR sector. Keep this cockpit tab open — ride request alerts will ping here automatically in real time.
                  </span>
                </div>

                {/* Telemetry Chips */}
                <div className="relative z-10 flex items-center gap-2 flex-wrap justify-center pt-1">
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-emerald-600">gps_fixed</span>
                    <span>GPS Telemetry: Locked</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-[#FFD600]">bolt</span>
                    <span>Demand: High</span>
                  </span>
                </div>
              </div>
            )}

            {/* Active Ride Control Deck */}
            {activeRide && (
              <div className="flex flex-col gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xl">
                {/* Active Ride Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-[#111111] uppercase tracking-wide">
                      Active Mission · In Route
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {activeRide.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Ride Progress Stepper Indicator */}
                <div className="flex items-center justify-between px-1 py-1 sm:py-2">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        [
                          "CAPTAIN_ASSIGNED",
                          "CAPTAIN_ARRIVING",
                          "CAPTAIN_ARRIVED",
                          "IN_PROGRESS",
                          "COMPLETED",
                        ].includes(activeRide.status)
                          ? "bg-[#111111] text-[#FFD600]"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs sm:text-sm">navigation</span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-600">Assigned</span>
                  </div>
                  <div
                    className={`flex-1 h-1 mx-1 sm:mx-1.5 rounded-full transition-all ${
                      ["CAPTAIN_ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(activeRide.status)
                        ? "bg-[#FFD600]"
                        : "bg-slate-200"
                    }`}
                  />
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        ["CAPTAIN_ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(activeRide.status)
                          ? "bg-[#111111] text-[#FFD600]"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs sm:text-sm">pin_drop</span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-600">Arrived</span>
                  </div>
                  <div
                    className={`flex-1 h-1 mx-1 sm:mx-1.5 rounded-full transition-all ${
                      ["IN_PROGRESS", "COMPLETED"].includes(activeRide.status)
                        ? "bg-[#FFD600]"
                        : "bg-slate-200"
                    }`}
                  />
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        activeRide.status === "IN_PROGRESS"
                          ? "bg-emerald-600 text-white animate-pulse"
                          : activeRide.status === "COMPLETED"
                          ? "bg-[#111111] text-[#FFD600]"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs sm:text-sm">local_taxi</span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-600">En Route</span>
                  </div>
                </div>

                {/* Passenger Info Card */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9FA] border border-slate-200">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#111111] text-[#FFD600] flex items-center justify-center font-black text-sm flex-shrink-0">
                      R
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-black text-[#111111] block truncate">
                        {(activeRide as any).rider?.name || "Rider Customer"}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        {(activeRide as any).rider?.phone || "+91 ••••• ••••"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${(activeRide as any).rider?.phone || ""}`}
                      className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                      title="Call Passenger"
                    >
                      <span className="material-symbols-outlined text-base sm:text-lg">call</span>
                    </a>
                  </div>
                </div>

                {/* Navigation Route Card */}
                <div className="flex flex-col gap-2 p-3 sm:p-3.5 rounded-xl bg-[#F8F9FA] border border-slate-200">
                  <div className="flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFD600] mt-1 flex-shrink-0 ring-2 ring-[#FFD600]/30"></span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Pickup
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-[#111111] truncate">
                        {activeRide.pickup?.address ||
                          activeRide.pickup?.name ||
                          `GPS (${activeRide.pickup?.lat.toFixed(4)}, ${activeRide.pickup?.lng.toFixed(4)})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 pt-1 border-t border-slate-200">
                    <span className="w-2.5 h-2.5 rotate-45 bg-emerald-500 mt-1 flex-shrink-0 ring-2 ring-emerald-500/30"></span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Destination
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-[#111111] truncate">
                        {activeRide.destination?.address ||
                          activeRide.destination?.name ||
                          `GPS (${activeRide.destination?.lat.toFixed(4)}, ${activeRide.destination?.lng.toFixed(4)})`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step Actions for Driver Lifecycle */}
                <div className="flex flex-col gap-2 pt-1">
                  {activeRide.status === "CAPTAIN_ASSIGNED" ||
                  (activeRide.status as string) === "CAPTAIN_ARRIVING" ? (
                    <button
                      disabled={updatingRide}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#111111] hover:bg-black disabled:opacity-50 text-white font-black text-xs sm:text-sm transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 min-h-[52px] cursor-pointer"
                      onClick={async () => {
                        setUpdatingRide(true);
                        try {
                          const res = await captainService.updateRideStatus(activeRide.id, "CAPTAIN_ARRIVED");
                          setActiveRide(res.ride);
                        } catch (err: any) {
                          console.error("Failed to mark arrived:", err);
                          alert(err?.response?.data?.message || "Failed to mark arrival");
                        } finally {
                          setUpdatingRide(false);
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-lg sm:text-xl text-[#FFD600]">
                        pin_drop
                      </span>
                      <span>{updatingRide ? "UPDATING STATUS..." : "I HAVE ARRIVED AT PICKUP"}</span>
                    </button>
                  ) : activeRide.status === "CAPTAIN_ARRIVED" ? (
                    <button
                      disabled={updatingRide}
                      className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 min-h-[52px] cursor-pointer"
                      onClick={async () => {
                        setUpdatingRide(true);
                        try {
                          const res = await captainService.updateRideStatus(activeRide.id, "IN_PROGRESS");
                          setActiveRide(res.ride);
                        } catch (err: any) {
                          console.error("Failed to start trip:", err);
                          alert(err?.response?.data?.message || "Failed to start trip");
                        } finally {
                          setUpdatingRide(false);
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-lg sm:text-xl">play_arrow</span>
                      <span>{updatingRide ? "STARTING TRIP..." : "START TRIP (RIDER ONBOARD)"}</span>
                    </button>
                  ) : activeRide.status === "IN_PROGRESS" ? (
                    <button
                      disabled={updatingRide}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#FFD600] hover:bg-[#FACC15] disabled:opacity-50 text-black font-black text-xs sm:text-sm transition-all active:scale-[0.98] shadow-lg shadow-yellow-500/25 flex items-center justify-center gap-2 min-h-[52px] cursor-pointer"
                      onClick={async () => {
                        setUpdatingRide(true);
                        try {
                          await captainService.updateRideStatus(activeRide.id, "COMPLETED");
                          setActiveRide(null);
                        } catch (err: any) {
                          console.error("Failed to complete trip:", err);
                          alert(err?.response?.data?.message || "Failed to complete trip");
                        } finally {
                          setUpdatingRide(false);
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-lg sm:text-xl">check_circle</span>
                      <span>{updatingRide ? "COMPLETING TRIP..." : "COMPLETE TRIP & COLLECT FARE"}</span>
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {/* Upcoming Scheduled Ride Reservation Card */}
            {/* <div className="flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm mt-1 sm:mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-slate-700 text-base">event_upcoming</span>
                  <span className="text-[11px] sm:text-xs text-slate-700 font-extrabold uppercase tracking-wider">
                    Scheduled Queue
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab("scheduled")}
                  className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 hover:bg-[#FFD600] hover:text-black hover:border-transparent transition-all cursor-pointer"
                >
                  VIEW QUEUE ➔
                </button>
              </div>
              <div 
                onClick={() => setActiveTab("scheduled")}
                className="p-3 sm:p-3.5 rounded-xl bg-[#F8F9FA] border border-slate-200 flex flex-col gap-1 transition-all hover:bg-slate-50 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-slate-700 text-sm">alarm</span>
                    <span className="text-xs sm:text-sm font-bold text-[#111111] group-hover:text-black">
                      Today, 2:30 PM (Reservation)
                    </span>
                  </div>
                  <span className="text-sm sm:text-base font-extrabold text-[#111111]">₹490</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium truncate">
                  Connaught Place Metro <span className="text-slate-400">➔</span> T3 IGI Airport Departure
                </p>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                    Flight AI Sync #AI-902
                  </span>
                  <span className="text-xs font-bold text-[#111111] flex items-center gap-0.5 group-hover:underline flex-shrink-0 ml-2">
                    Open Queue <span className="material-symbols-outlined text-xs">chevron_right</span>
                  </span>
                </div>
              </div>
            </div> */}
            
          </div>

          {/* RIGHT PANEL: Bright Daylight Navigation Map Viewport */}
          <div className="order-1 lg:order-2 lg:col-span-7 flex flex-col gap-3 sm:gap-4 w-full">
            <CaptainMapContainer />

            {/* Operational Fleet Health Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 mt-1 sm:mt-2">
              <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 flex items-center sm:items-start gap-3 shadow-sm">
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#111111] text-[#FFD600] shadow-sm flex-shrink-0">
                  <span className="material-symbols-outlined text-lg sm:text-xl">speed</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase block">
                    Speed Telemetry
                  </span>
                  <span className="text-base sm:text-lg font-black text-[#111111]">42 km/h</span>
                  <span className="text-[11px] sm:text-xs font-semibold text-emerald-600 block truncate">
                    Within City Limits
                  </span>
                </div>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 flex items-center sm:items-start gap-3 shadow-sm">
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#FFD600] text-[#111111] shadow-sm flex-shrink-0">
                  <span className="material-symbols-outlined text-lg sm:text-xl font-bold">payments</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase block">
                    Weekly Payout
                  </span>
                  <span className="text-base sm:text-lg font-black text-[#111111]">₹11,480</span>
                  <span className="text-[11px] sm:text-xs font-medium text-slate-500 block truncate">
                    Auto-transfer Monday
                  </span>
                </div>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 flex items-center sm:items-start gap-3 shadow-sm">
                <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shadow-sm flex-shrink-0">
                  <span className="material-symbols-outlined text-lg sm:text-xl font-bold">
                    verified_user
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase block">
                    Safety Shield
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-700">ACTIVE</span>
                  <span className="text-[11px] sm:text-xs font-medium text-slate-500 block truncate">
                    Telematics Sync
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
