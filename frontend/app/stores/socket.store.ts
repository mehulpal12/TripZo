import { create } from 'zustand';

interface SocketState {
  isConnected: boolean;
  isReconnecting: boolean;
  
  setConnected: (status: boolean) => void;
  setReconnecting: (status: boolean) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  isReconnecting: false,
  
  setConnected: (status) => set({ isConnected: status, isReconnecting: false }),
  setReconnecting: (status) => set({ isReconnecting: status }),
}));
