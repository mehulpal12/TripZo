import { describe, it, expect, beforeEach } from 'vitest';
import { useRideStore } from '@/stores/ride.store';

describe('useRideStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useRideStore.setState({
      pickup: null,
      destination: null,
      vehicleType: 'BIKE',
      activeRide: null,
    });
  });

  it('should initialize with default state', () => {
    const state = useRideStore.getState();
    expect(state.pickup).toBeNull();
    expect(state.destination).toBeNull();
    expect(state.vehicleType).toBe('BIKE');
    expect(state.activeRide).toBeNull();
  });

  it('should set pickup location', () => {
    const pickup = { lat: 10, lng: 20, address: 'Test Location' };
    useRideStore.getState().setPickup(pickup);
    expect(useRideStore.getState().pickup).toEqual(pickup);
  });

  it('should set destination location', () => {
    const destination = { lat: 30, lng: 40, address: 'Destination' };
    useRideStore.getState().setDestination(destination);
    expect(useRideStore.getState().destination).toEqual(destination);
  });

  it('should update vehicle type', () => {
    useRideStore.getState().setVehicleType('CAB');
    expect(useRideStore.getState().vehicleType).toBe('CAB');
  });

  it('should update active ride', () => {
    const mockRide = {
      id: 'ride-123',
      riderId: 'rider-1',
      pickupLat: 10,
      pickupLng: 20,
      dropLat: 30,
      dropLng: 40,
      status: 'SEARCHING',
      vehicleType: 'BIKE',
      fare: 150,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    useRideStore.getState().setActiveRide(mockRide as any);
    expect(useRideStore.getState().activeRide).toEqual(mockRide);
  });
});
