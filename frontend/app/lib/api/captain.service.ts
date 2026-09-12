import { apiClient } from './client';
import { Ride } from '@/stores/ride.store';

export const captainService = {
  acceptRide: async (rideId: string): Promise<{ ride: Ride }> => {
    const response = await apiClient.post(`/captains/rides/${rideId}/accept`);
    return response.data;
  },

  updateRideStatus: async (rideId: string, status: 'CAPTAIN_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'): Promise<{ ride: Ride }> => {
    // Assuming backend has dedicated endpoints for these transitions based on deep dive
    const endpoint = status === 'CAPTAIN_ARRIVED' ? 'arrived' :
                     status === 'IN_PROGRESS' ? 'start' : 'complete';
                     
    const response = await apiClient.post(`/captains/rides/${rideId}/${endpoint}`);
    return response.data;
  }
};
