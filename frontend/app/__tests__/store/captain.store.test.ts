import { describe, it, expect, beforeEach } from 'vitest';
import { useCaptainStore } from '@/stores/captain.store';

describe('useCaptainStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useCaptainStore.setState({
      isOnline: false,
      activeRequest: null,
      activeRide: null,
    });
  });

  it('should initialize with default state', () => {
    const state = useCaptainStore.getState();
    expect(state.isOnline).toBe(false);
    expect(state.activeRequest).toBeNull();
    expect(state.activeRide).toBeNull();
  });

  it('should toggle online status', () => {
    useCaptainStore.getState().setOnline(true);
    expect(useCaptainStore.getState().isOnline).toBe(true);

    useCaptainStore.getState().setOnline(false);
    expect(useCaptainStore.getState().isOnline).toBe(false);
  });

  it('should set active request', () => {
    const mockRequest = {
      id: 'req-1',
      pickup: { lat: 10, lng: 20, address: 'A' },
      destination: { lat: 30, lng: 40, address: 'B' },
      fare: 200,
      timestamp: Date.now(),
    };
    useCaptainStore.getState().setActiveRequest(mockRequest as any);
    expect(useCaptainStore.getState().activeRequest).toEqual(mockRequest);
  });

  it('should set active ride', () => {
    const mockRide = {
      id: 'ride-123',
      riderId: 'rider-1',
      pickupLat: 10,
      pickupLng: 20,
      dropLat: 30,
      dropLng: 40,
      status: 'CAPTAIN_ASSIGNED',
      vehicleType: 'CAB',
      fare: 200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    useCaptainStore.getState().setActiveRide(mockRide as any);
    expect(useCaptainStore.getState().activeRide).toEqual(mockRide);
  });
});
