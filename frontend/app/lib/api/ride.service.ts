import { apiClient } from "./client";
import { Ride } from "@/stores/ride.store";

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
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

export interface ScheduleRideDTO {
  pickup: LocationData;
  destination: LocationData;
  vehicleType: "BIKE" | "AUTO" | "CAB";
  scheduledAt: string; // ISO string
}

export const mapBackendRideToFrontend = (backendRide: any): Ride => {
  if (!backendRide) return backendRide;
  return {
    ...backendRide,
    pickup: {
      lat: Number(backendRide.pickupLat),
      lng: Number(backendRide.pickupLng),
      address: backendRide.pickupAddress || backendRide.pickup?.address,
      name: backendRide.pickupName || backendRide.pickup?.name,
    },
    destination: {
      lat: Number(backendRide.destinationLat),
      lng: Number(backendRide.destinationLng),
      address: backendRide.destinationAddress || backendRide.destination?.address,
      name: backendRide.destinationName || backendRide.destination?.name,
    },
    scheduledAt: backendRide.scheduledAt,
    estimatedFare: backendRide.estimatedFare ? Number(backendRide.estimatedFare) : undefined,
    finalFare: backendRide.finalFare ? Number(backendRide.finalFare) : undefined,
    estimatedDistanceM: backendRide.estimatedDistanceM ? Number(backendRide.estimatedDistanceM) : undefined,
    estimatedDurationS: backendRide.estimatedDurationS ? Number(backendRide.estimatedDurationS) : undefined,
    createdAt: backendRide.createdAt,
  };
};

export const rideService = {
  getFareEstimate: async (data: FareEstimateDTO) => {
    const response = await apiClient.get("/rides/fare", { params: data });
    return response.data.data; // { estimatedFare, distance, duration }
  },

  createRide: async (data: CreateRideDTO) => {
    const response = await apiClient.post("/rides", data);
    return mapBackendRideToFrontend(response.data.data); // Ride object
  },

  scheduleRide: async (data: ScheduleRideDTO) => {
    const response = await apiClient.post("/rides/schedule", data);
    return mapBackendRideToFrontend(response.data.data); // Scheduled Ride object
  },

  getScheduledRides: async (): Promise<Ride[]> => {
    const response = await apiClient.get("/rides/scheduled");
    const list = response.data?.data || [];
    return list.map((r: any) => mapBackendRideToFrontend(r));
  },

  cancelRide: async (rideId: string, reason?: string) => {
    const response = await apiClient.post(`/rides/${rideId}/cancel`, { reason });
    return mapBackendRideToFrontend(response.data.data); // Updated Ride object
  },

  getActiveRide: async (): Promise<Ride | null> => {
    const response = await apiClient.get("/rides/active");
    if (!response.data?.data) return null;
    return mapBackendRideToFrontend(response.data.data);
  },

  getRide: async (rideId: string) => {
    const response = await apiClient.get(`/rides/${rideId}`);
    return mapBackendRideToFrontend(response.data.data); // Ride object
  },
};
