import { apiClient } from './client';
import { Ride } from '@/stores/ride.store';
import { mapBackendRideToFrontend } from './ride.service';

export interface CaptainHistoryStats {
  totalEarnings: number;
  todayEarnings: number;
  completedTrips: number;
  todayTrips: number;
  cancelledTrips: number;
}

export interface CaptainScheduledStats {
  totalScheduled: number;
  assignedToMeCount: number;
  totalPotentialFare: number;
  nextUpcoming: string | null;
}

export interface CaptainScheduledRidesResponse {
  rides: (Ride & {
    rider?: {
      id?: string;
      name?: string;
      phone?: string;
      email?: string;
    };
    scheduledAt?: string;
    finalFare?: number;
    estimatedFare?: number;
    captainId?: string | null;
    createdAt?: string;
  })[];
  stats: CaptainScheduledStats;
}

export interface CaptainRideHistoryResponse {
  rides: (Ride & {
    rider?: {
      id?: string;
      name?: string;
      phone?: string;
      email?: string;
    };
    finalFare?: number;
    estimatedFare?: number;
    createdAt?: string;
    completedAt?: string;
    startedAt?: string;
    cancelledAt?: string;
    cancellationReason?: string;
  })[];
  stats: CaptainHistoryStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const captainService = {
  acceptRide: async (rideId: string): Promise<{ ride: Ride }> => {
    const response = await apiClient.post(`/rides/${rideId}/accept`);
    return { ride: mapBackendRideToFrontend(response.data.data || response.data) };
  },

  rejectRide: async (rideId: string): Promise<void> => {
    await apiClient.post(`/rides/${rideId}/reject`);
  },

  updateRideStatus: async (rideId: string, status: 'CAPTAIN_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'): Promise<{ ride: Ride }> => {
    // Assuming backend has dedicated endpoints for these transitions based on deep dive
    const endpoint = status === 'CAPTAIN_ARRIVED' ? 'arrived' :
                     status === 'IN_PROGRESS' ? 'start' : 'complete';
                     
    const response = await apiClient.post(`/rides/${rideId}/${endpoint}`);
    return { ride: mapBackendRideToFrontend(response.data.data || response.data) };
  },

  setOnline: async (coords?: { lat: number; lng: number }): Promise<void> => {
    await apiClient.post('/captains/online', coords || {});
  },

  setOffline: async (): Promise<void> => {
    await apiClient.post('/captains/offline');
  },

  getActiveRequest: async (): Promise<any | null> => {
    try {
      const response = await apiClient.get('/captains/active-request');
      return response.data?.data || null;
    } catch (err) {
      console.error("Failed to fetch captain active request", err);
      return null;
    }
  },

  getCurrentState: async (): Promise<{ isOnline: boolean; activeRide: Ride | null; activeRequest: any | null }> => {
    try {
      const [ridesRes, activeReqRes] = await Promise.allSettled([
        apiClient.get('/captains/rides'),
        apiClient.get('/captains/active-request'),
      ]);

      let activeRide: Ride | null = null;
      let activeRequest: any | null = null;
      let isOnline = false;

      if (ridesRes.status === 'fulfilled') {
        const rides = ridesRes.value.data?.data || [];
        if (rides.length > 0) {
          const latestRide = rides[0];
          if (['CAPTAIN_ASSIGNED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED', 'IN_PROGRESS'].includes(latestRide.status)) {
            activeRide = mapBackendRideToFrontend(latestRide);
            isOnline = true;
          }
        }
      }

      if (activeReqRes.status === 'fulfilled') {
        activeRequest = activeReqRes.value.data?.data || null;
        if (activeRequest) {
          isOnline = true;
        }
      }

      return { isOnline, activeRide, activeRequest };
    } catch (err) {
      console.error("Failed to fetch current captain state", err);
      return { isOnline: false, activeRide: null, activeRequest: null };
    }
  },

  getRideHistory: async (params?: { page?: number; limit?: number; status?: string }): Promise<CaptainRideHistoryResponse> => {
    const response = await apiClient.get('/captains/history', { params });
    const rawData = response.data;
    const rides = (rawData.data || []).map((r: any) => ({
      ...mapBackendRideToFrontend(r),
      rider: r.rider,
      finalFare: r.finalFare ? Number(r.finalFare) : undefined,
      estimatedFare: r.estimatedFare ? Number(r.estimatedFare) : undefined,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      startedAt: r.startedAt,
      cancelledAt: r.cancelledAt,
      cancellationReason: r.cancellationReason,
    }));

    return {
      rides,
      stats: rawData.stats || {
        totalEarnings: 0,
        todayEarnings: 0,
        completedTrips: 0,
        todayTrips: 0,
        cancelledTrips: 0,
      },
      pagination: rawData.pagination || {
        page: 1,
        limit: 20,
        total: rides.length,
        totalPages: 1,
      },
    };
  },

  getScheduledRides: async (): Promise<CaptainScheduledRidesResponse> => {
    const response = await apiClient.get('/captains/scheduled');
    const rawData = response.data?.data || response.data || {};
    const rawList = Array.isArray(rawData) ? rawData : (rawData.rides || response.data?.rides || []);
    const rides = rawList.map((r: any) => ({
      ...mapBackendRideToFrontend(r),
      rider: r.rider,
      scheduledAt: r.scheduledAt,
      captainId: r.captainId,
      finalFare: r.finalFare ? Number(r.finalFare) : undefined,
      estimatedFare: r.estimatedFare ? Number(r.estimatedFare) : undefined,
      createdAt: r.createdAt,
    }));

    return {
      rides,
      stats: rawData.stats || response.data?.stats || {
        totalScheduled: rides.length,
        assignedToMeCount: rides.filter((r: any) => Boolean(r.captainId)).length,
        totalPotentialFare: rides.reduce((acc: number, r: any) => acc + (r.estimatedFare || r.finalFare || 0), 0),
        nextUpcoming: rides.length > 0 ? rides[0].scheduledAt : null,
      },
    };
  },
};
