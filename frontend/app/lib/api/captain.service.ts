import { apiClient } from './client';
import { Ride } from '@/stores/ride.store';
import { mapBackendRideToFrontend } from './ride.service';

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

  setOnline: async (): Promise<void> => {
    await apiClient.post('/captains/online');
  },

  setOffline: async (): Promise<void> => {
    await apiClient.post('/captains/offline');
  },

  getCurrentState: async (): Promise<{ isOnline: boolean; activeRide: Ride | null }> => {
    try {
      const response = await apiClient.get('/captains/rides');
      const rides = response.data?.data || [];
      if (rides.length > 0) {
        const latestRide = rides[0];
        if (['CAPTAIN_ASSIGNED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED', 'IN_PROGRESS'].includes(latestRide.status)) {
          return { isOnline: true, activeRide: mapBackendRideToFrontend(latestRide) };
        }
      }
      return { isOnline: false, activeRide: null };
    } catch (err) {
      console.error("Failed to fetch current captain state", err);
      return { isOnline: false, activeRide: null };
    }
  }
};
