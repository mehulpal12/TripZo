"use client";

import { useEffect, useState, useCallback } from "react";
import { captainService, CaptainScheduledStats } from "@/lib/api/captain.service";
import { 
  CalendarClock, 
  RefreshCw, 
  MapPin, 
  Navigation, 
  User, 
  Clock, 
  IndianRupee, 
  Car, 
  Bike, 
  ShieldCheck, 
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

type ScheduledFilter = "ALL" | "ASSIGNED" | "TODAY";

export function CaptainScheduledRides() {
  const [rides, setRides] = useState<any[]>([]);
  const [stats, setStats] = useState<CaptainScheduledStats>({
    totalScheduled: 0,
    assignedToMeCount: 0,
    totalPotentialFare: 0,
    nextUpcoming: null,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ScheduledFilter>("ALL");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchScheduledRides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await captainService.getScheduledRides();
      setRides(res.rides || []);
      setStats(res.stats);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to load captain scheduled rides", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduledRides();
    // Auto-refresh every 45 seconds to keep countdowns and queue in sync
    const interval = setInterval(fetchScheduledRides, 45000);
    return () => clearInterval(interval);
  }, [fetchScheduledRides]);

  // Format scheduled datetime display
  const formatScheduledDate = (dateStr?: string) => {
    if (!dateStr) return "Upcoming Ride";
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    
    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    }

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    if (isTomorrow) {
      return `Tomorrow at ${timeStr}`;
    }

    return `${d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })} at ${timeStr}`;
  };

  // Human-readable countdown from now
  const getRelativeCountdown = (dateStr?: string) => {
    if (!dateStr) return "Pending";
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    const diffMs = target - now;

    if (diffMs <= 0) {
      const elapsedMins = Math.abs(Math.floor(diffMs / (1000 * 60)));
      if (elapsedMins < 15) {
        return "Dispatch Window Active (T-0)";
      }
      return "Pickup window now";
    }

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `In ${diffDays} day${diffDays > 1 ? "s" : ""} ${diffHours % 24} hr`;
    }
    if (diffHours > 0) {
      return `In ${diffHours} hr ${diffMins % 60} min`;
    }
    return `In ${diffMins} min${diffMins !== 1 ? "s" : ""}`;
  };

  // Check if scheduled within 15 minutes (auto dispatch trigger)
  const isDispatchImminent = (dateStr?: string) => {
    if (!dateStr) return false;
    const diffMins = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60);
    return diffMins <= 15 && diffMins >= -30;
  };

  // Filter rides
  const filteredRides = rides.filter((ride) => {
    if (filter === "ASSIGNED") {
      return Boolean(ride.captainId);
    }
    if (filter === "TODAY") {
      if (!ride.scheduledAt) return false;
      const d = new Date(ride.scheduledAt);
      return d.toDateString() === new Date().toDateString();
    }
    return true;
  });

  return (
    <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-5 sm:gap-6">
      
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FFD600] text-black">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
                Scheduled Rides Queue
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Advance reservations and pre-dispatched trips across the Delhi-NCR fleet network.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-[11px] text-slate-400 font-semibold hidden md:inline">
            Updated {lastRefreshed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={fetchScheduledRides}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#FFD600]" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh Queue"}</span>
          </button>
        </div>
      </div>

      {/* Aggregate Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total In Queue */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-[#111111] text-white border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">
              Upcoming Queue
            </span>
            <span className="p-1.5 rounded-lg bg-[#FFD600]/20 text-[#FFD600]">
              <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-3xl font-black text-[#FFD600]">
              {stats.totalScheduled}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 block mt-0.5">
              Available & assigned rides
            </span>
          </div>
        </div>

        {/* Assigned To Me */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-[#1E293B] text-white border border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs text-slate-300 font-bold uppercase tracking-wider">
              Assigned To You
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-3xl font-black text-white">
              {stats.assignedToMeCount}
            </span>
            <span className="text-[10px] sm:text-xs text-emerald-400 block mt-0.5">
              Guaranteed reservations
            </span>
          </div>
        </div>

        {/* Potential Earnings */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">
              Potential Fare
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-3xl font-black text-[#111111]">
              ₹{stats.totalPotentialFare.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-500 block mt-0.5">
              Scheduled gross revenue
            </span>
          </div>
        </div>

        {/* Next Scheduled Pickup */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">
              Next Pickup
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-xl font-black text-[#111111] truncate block">
              {stats.nextUpcoming ? getRelativeCountdown(stats.nextUpcoming) : "None Scheduled"}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-500 block mt-0.5 truncate">
              {stats.nextUpcoming ? formatScheduledDate(stats.nextUpcoming) : "Queue currently clear"}
            </span>
          </div>
        </div>
      </div>

      {/* Dispatch Window Policy Alert */}
      <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-950 text-xs sm:text-sm">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="font-extrabold text-amber-900">
            Automated BullMQ Dispatch Window (T - 15 Minutes)
          </span>
          <span className="text-amber-800/90 text-xs">
            Scheduled rides automatically activate 15 minutes before the pickup time. Keep your status online in the Cockpit to immediately receive the incoming trip ping and lock in your fare.
          </span>
        </div>
      </div>

      {/* Filter Segmented Control */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xs w-full sm:w-fit overflow-x-auto">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            filter === "ALL"
              ? "bg-[#111111] text-white shadow-sm"
              : "text-slate-600 hover:text-black hover:bg-slate-100"
          }`}
        >
          All Scheduled ({rides.length})
        </button>
        <button
          onClick={() => setFilter("ASSIGNED")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filter === "ASSIGNED"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Assigned to Me ({stats.assignedToMeCount})
        </button>
        <button
          onClick={() => setFilter("TODAY")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filter === "TODAY"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-blue-700 hover:bg-blue-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          Today Only
        </button>
      </div>

      {/* Ride Queue Cards */}
      {loading && rides.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse flex flex-col gap-3">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-6 bg-slate-100 rounded w-3/4"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredRides.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <CalendarClock className="w-7 h-7" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base sm:text-lg font-black text-[#111111]">
              No Scheduled Rides Found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              {filter !== "ALL"
                ? "There are no scheduled rides matching your current filter. Switch back to all scheduled rides."
                : "No riders have upcoming scheduled bookings in your sector right now. Keep your app open to capture fresh reservations as they are booked."}
            </p>
          </div>
          {filter !== "ALL" && (
            <button
              onClick={() => setFilter("ALL")}
              className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          {filteredRides.map((ride) => {
            const imminent = isDispatchImminent(ride.scheduledAt);
            const isAssigned = Boolean(ride.captainId);
            const fare = ride.estimatedFare || ride.finalFare || 0;
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
              ride.pickup?.lat + "," + ride.pickup?.lng
            )}&destination=${encodeURIComponent(
              ride.destination?.lat + "," + ride.destination?.lng
            )}`;

            return (
              <div
                key={ride.id}
                className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all shadow-sm hover:shadow-md flex flex-col gap-4 ${
                  imminent
                    ? "border-amber-400 ring-2 ring-amber-300/40"
                    : isAssigned
                    ? "border-emerald-300"
                    : "border-slate-200"
                }`}
              >
                {/* Top Row: Time Badge & Status Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-black">
                      <Clock className="w-3.5 h-3.5 text-[#FFD600]" />
                      <span>{formatScheduledDate(ride.scheduledAt)}</span>
                    </div>

                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold ${
                        imminent
                          ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      <span>{getRelativeCountdown(ride.scheduledAt)}</span>
                    </div>

                    {isAssigned && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Reserved for You</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      {ride.vehicleType === "BIKE" ? (
                        <Bike className="w-3.5 h-3.5" />
                      ) : (
                        <Car className="w-3.5 h-3.5" />
                      )}
                      <span>{ride.vehicleType || "TAXI"}</span>
                    </span>

                    <span className="text-base sm:text-lg font-black text-[#111111]">
                      ₹{fare}
                    </span>
                  </div>
                </div>

                {/* Middle: Pickup & Destination Waypoints */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2.5">
                    {/* Pickup */}
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0"></div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Pickup Location
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-[#111111] line-clamp-1">
                          {ride.pickup?.name || ride.pickup?.address || "Pickup Point"}
                        </span>
                        {ride.pickup?.address && ride.pickup?.name && (
                          <span className="text-[11px] text-slate-500 truncate">
                            {ride.pickup.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dropoff */}
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-100 shrink-0"></div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Destination
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-[#111111] line-clamp-1">
                          {ride.destination?.name || ride.destination?.address || "Drop Point"}
                        </span>
                        {ride.destination?.address && ride.destination?.name && (
                          <span className="text-[11px] text-slate-500 truncate">
                            {ride.destination.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rider Info & Action Card */}
                  <div className="flex flex-col justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                          {ride.rider?.name ? ride.rider.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[#111111]">
                            {ride.rider?.name || "Verified Rider"}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {ride.rider?.phone ? `+91 ••••${ride.rider.phone.slice(-4)}` : "Contact on dispatch"}
                          </span>
                        </div>
                      </div>

                      {imminent && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
                          Dispatching Soon
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                      <span className="text-[11px] text-slate-500">
                        Ref: #{ride.id ? ride.id.slice(-6) : "SCHEDULED"}
                      </span>

                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-black hover:border-slate-300 text-xs font-bold transition-all shadow-2xs"
                      >
                        <Navigation className="w-3 h-3 text-slate-500" />
                        <span>Preview Route</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Footer notes */}
                {imminent && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Pickup is in less than 15 minutes. Switch to the <strong>Cockpit</strong> tab now to accept the live booking ping as soon as it fires!
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
