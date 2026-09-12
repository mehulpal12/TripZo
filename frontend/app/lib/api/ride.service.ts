import { apiClient } from "./client";

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
}

export interface FareEstimateDTO {
  pickupLat: number;
  pickupLng: number;
  destinationLat: number;
  destinationLng: number;
  vehicleType: "BIKE" | "AUTO" | "CAB";
}

export interface CreateRideDTO {
  pickup: LocationData;
  destination: LocationData;
  vehicleType: "BIKE" | "AUTO" | "CAB";
}

export const rideService = {
  getFareEstimate: async (data: FareEstimateDTO) => {
    const response = await apiClient.get("/rides/fare", { params: data });
    return response.data.data; // { estimatedFare, distance, duration }
  },

  createRide: async (data: CreateRideDTO) => {
    const response = await apiClient.post("/rides", data);
    return response.data.data; // Ride object
  },

  cancelRide: async (rideId: string, reason?: string) => {
    const response = await apiClient.post(`/rides/${rideId}/cancel`, { reason });
    return response.data.data; // Updated Ride object
  },

  getRide: async (rideId: string) => {
    const response = await apiClient.get(`/rides/${rideId}`);
    return response.data.data; // Ride object
  },
};
