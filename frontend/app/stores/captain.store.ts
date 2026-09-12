import { create } from 'zustand';
import { Ride } from './ride.store';

interface CaptainState {
  isOnline: boolean;
  activeRequest: Ride | null;
  activeRide: Ride | null;
  captainLocation: { lat: number; lng: number } | null;
  
  setOnline: (status: boolean) => void;
  setActiveRequest: (request: Ride | null) => void;
  setActiveRide: (ride: Ride | null) => void;
  setCaptainLocation: (location: { lat: number; lng: number }) => void;
}

export const useCaptainStore = create<CaptainState>((set) => ({
  isOnline: false,
  activeRequest: null,
  activeRide: null,
  captainLocation: null,
  
  setOnline: (status) => set({ isOnline: status }),
  setActiveRequest: (request) => set({ activeRequest: request }),
  setActiveRide: (ride) => set({ activeRide: ride }),
  setCaptainLocation: (location) => set({ captainLocation: location }),
}));
