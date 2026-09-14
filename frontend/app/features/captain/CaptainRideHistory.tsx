"use client";

import { useEffect, useState, useCallback } from "react";
import { captainService, CaptainHistoryStats } from "@/lib/api/captain.service";
import { Ride } from "@/stores/ride.store";

type StatusFilter = "ALL" | "COMPLETED" | "CANCELLED";

export function CaptainRideHistory() {
  const [rides, setRides] = useState<any[]>([]);
  const [stats, setStats] = useState<CaptainHistoryStats>({
    totalEarnings: 0,
    todayEarnings: 0,
    completedTrips: 0,
    todayTrips: 0,
    cancelledTrips: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchHistory = useCallback(async (page: number, status: StatusFilter) => {
    setLoading(true);
    try {
      const res = await captainService.getRideHistory({
        page,
        limit: 10,
        status: status === "ALL" ? undefined : status,
      });
      setRides(res.rides || []);
      setStats(res.stats);
      setCurrentPage(res.pagination.page);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error("Failed to load captain ride history", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(currentPage, statusFilter);
  }, [currentPage, statusFilter, fetchHistory]);

  const handleFilterChange = (newStatus: StatusFilter) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Recent Trip";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-5 sm:gap-6">
      
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#111111] text-2xl font-extrabold">history</span>
            <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">Captain Ride History</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Complete record of your accepted, completed, and logged trips with earnings audit.
          </p>
        </div>

        <button
          onClick={() => fetchHistory(currentPage, statusFilter)}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-all active:scale-95 disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <span className={`material-symbols-outlined text-base ${loading ? "animate-spin" : ""}`}>refresh</span>
          <span>{loading ? "Refreshing..." : "Refresh Log"}</span>
        </button>
      </div>

      {/* Aggregate Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-[#111111] text-white border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">Total Earnings</span>
            <span className="p-1.5 rounded-lg bg-[#FFD600]/20 text-[#FFD600]">
              <span className="material-symbols-outlined text-base sm:text-lg">payments</span>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-3xl font-black text-[#FFD600]">
              ₹{stats.totalEarnings.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 block mt-0.5">Lifetime verified gross</span>
          </div>
        </div>

        {/* Completed Trips */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-[#1E293B] text-white border border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs text-slate-300 font-bold uppercase tracking-wider">Completed Trips</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <span className="material-symbols-outlined text-base sm:text-lg">verified</span>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-3xl font-black text-white">{stats.completedTrips}</span>
            <span className="text-[10px] sm:text-xs text-emerald-400 block mt-0.5">Successful dropoffs</span>
          </div>
        </div>

        {/* Today's Earnings */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Today's Revenue</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <span className="material-symbols-outlined text-base sm:text-lg">today</span>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-3xl font-black text-[#111111]">
              ₹{stats.todayEarnings.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-500 block mt-0.5">{stats.todayTrips} trips logged today</span>
          </div>
        </div>

        {/* Cancelled Trips */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Cancelled Trips</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <span className="material-symbols-outlined text-base sm:text-lg">cancel</span>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-3xl font-black text-rose-600">{stats.cancelledTrips}</span>
            <span className="text-[10px] sm:text-xs text-slate-500 block mt-0.5">Rider or auto timeout</span>
          </div>
        </div>
      </div>

      {/* Filter Segmented Control */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xs w-full sm:w-fit overflow-x-auto">
        <button
          onClick={() => handleFilterChange("ALL")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            statusFilter === "ALL"
              ? "bg-[#111111] text-white shadow-sm"
              : "text-slate-600 hover:text-black hover:bg-slate-100"
          }`}
        >
          All Trips ({stats.completedTrips + stats.cancelledTrips})
        </button>
        <button
          onClick={() => handleFilterChange("COMPLETED")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            statusFilter === "COMPLETED"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Completed ({stats.completedTrips})
        </button>
        <button
          onClick={() => handleFilterChange("CANCELLED")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            statusFilter === "CANCELLED"
              ? "bg-rose-600 text-white shadow-sm"
              : "text-slate-600 hover:text-rose-700 hover:bg-rose-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
          Cancelled ({stats.cancelledTrips})
        </button>
      </div>

      {/* Ride List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse flex flex-col gap-3">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-6 bg-slate-100 rounded w-3/4"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : rides.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl bg-white border border-slate-200 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-3xl">history_toggle_off</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-[#111111]">No Ride History Found</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1">
            {statusFilter === "ALL"
              ? "You haven't completed any rides yet. Switch to Cockpit mode, go online, and accept rides to build your trip log."
              : `No ${statusFilter.toLowerCase()} rides recorded in this filter view.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          {rides.map((ride) => {
            const isCompleted = ride.status === "COMPLETED";
            const isCancelled = ride.status === "CANCELLED";
            const fare = ride.finalFare || ride.estimatedFare || 0;

            return (
              <div
                key={ride.id}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col gap-3.5"
              >
                {/* Header Row: Date, Status, Fare */}
                <div className="flex items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-700">
                      {formatDate(ride.completedAt || ride.createdAt)}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase border border-slate-200">
                      {ride.vehicleType || "MOTO"}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isCancelled
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {ride.status}
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span
                      className={`text-base sm:text-xl font-black ${
                        isCompleted ? "text-[#111111]" : isCancelled ? "text-slate-400 line-through" : "text-[#111111]"
                      }`}
                    >
                      ₹{fare}
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] font-bold text-emerald-600">Earnings Credited</span>
                    )}
                    {isCancelled && (
                      <span className="text-[10px] font-medium text-rose-500">
                        {ride.cancellationReason || "Trip Cancelled"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Waypoints Visual Box */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-[#F8F9FA] border border-slate-200 flex flex-col gap-2">
                  {/* Pickup */}
                  <div className="flex items-start gap-2.5">
                    <div className="flex flex-col items-center mt-1 flex-shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FFD600] ring-2 ring-[#FFD600]/30"></span>
                      <span className="w-0.5 h-6 bg-slate-300 my-0.5"></span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pickup</span>
                      <p className="text-xs sm:text-sm font-bold text-[#111111] truncate">
                        {ride.pickup?.address || ride.pickup?.name || `GPS (${ride.pickup?.lat?.toFixed(4)}, ${ride.pickup?.lng?.toFixed(4)})`}
                      </p>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex items-start gap-2.5">
                    <div className="flex flex-col items-center mt-1 flex-shrink-0">
                      <span className="w-2.5 h-2.5 rotate-45 bg-emerald-500 ring-2 ring-emerald-500/30"></span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Destination</span>
                      <p className="text-xs sm:text-sm font-bold text-[#111111] truncate">
                        {ride.destination?.address || ride.destination?.name || `GPS (${ride.destination?.lat?.toFixed(4)}, ${ride.destination?.lng?.toFixed(4)})`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Trip Metrics & Passenger */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    {ride.estimatedDistanceM && (
                      <span className="flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-sm text-slate-400">straighten</span>
                        {(ride.estimatedDistanceM / 1000).toFixed(1)} km
                      </span>
                    )}
                    {ride.estimatedDurationS && (
                      <span className="flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                        {Math.round(ride.estimatedDurationS / 60)} mins
                      </span>
                    )}
                  </div>

                  {ride.rider && (
                    <div className="flex items-center gap-1.5 self-start sm:self-auto font-medium">
                      <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                      <span className="font-bold text-slate-700">{ride.rider.name || "Passenger"}</span>
                      {ride.rider.phone && (
                        <span className="text-slate-400 text-[11px]">({ride.rider.phone})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs mt-2">
          <span className="text-xs sm:text-sm text-slate-500 font-medium">
            Page {currentPage} of {totalPages} ({totalCount} total trips)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
