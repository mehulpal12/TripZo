import { create } from "zustand";
import { LocationData } from "../lib/api/ride.service";

export type RideStatus = "SCHEDULED" | "SEARCHING" | "CAPTAIN_ASSIGNED" | "CAPTAIN_ARRIVING" | "CAPTAIN_ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface Ride {
  id: string;
  status: RideStatus;
  pickup: LocationData;
  destination: LocationData;
  vehicleType: "BIKE" | "AUTO" | "CAB";
  fare: number;
  riderId?: string;
  captainId?: string;
  scheduledAt?: string;
  isScheduled?: boolean;
  estimatedFare?: number;
  finalFare?: number;
  estimatedDistanceM?: number;
  estimatedDurationS?: number;
  createdAt?: string;
  captain?: {
    id: string;
    vehicleType: string;
    vehicleModel: string;
    vehicleNumber: string;
    rating: number;
    totalTrips: number;
    user: {
      name?: string;
      firstName?: string;
      lastName?: string;
      phone: string;
      profilePicture?: string | null;
    }
  };
  captainLocation?: { lat: number; lng: number };
}

interface RideState {
  activeTab: "book" | "scheduled";
  setActiveTab: (tab: "book" | "scheduled") => void;
  pickup: LocationData | null;
  destination: LocationData | null;
  vehicleType: "BIKE" | "AUTO" | "CAB";
  activeRide: Ride | null;
  
  setPickup: (loc: LocationData | null) => void;
  setDestination: (loc: LocationData | null) => void;
  setVehicleType: (type: "BIKE" | "AUTO" | "CAB") => void;
  setActiveRide: (ride: Ride | null) => void;
  updateRideStatus: (status: RideStatus) => void;
  updateCaptainLocation: (lat: number, lng: number) => void;
}

export const useRideStore = create<RideState>((set) => ({
  activeTab: "book",
  setActiveTab: (activeTab) => set({ activeTab }),
  pickup: null,
  destination: null,
  vehicleType: "BIKE",
  activeRide: null,
  
  setPickup: (pickup) => set({ pickup }),
  setDestination: (destination) => set({ destination }),
  setVehicleType: (vehicleType) => set({ vehicleType }),
  setActiveRide: (activeRide) => set({ activeRide }),
  updateRideStatus: (status) => 
    set((state) => ({ 
      activeRide: state.activeRide ? { ...state.activeRide, status } : null 
    })),
  updateCaptainLocation: (lat, lng) => 
    set((state) => ({
      activeRide: state.activeRide ? { ...state.activeRide, captainLocation: { lat, lng } } : null
    })),
}));
