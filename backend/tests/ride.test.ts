import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { RideStatus, Role } from '@prisma/client';
import { generateAccessToken } from '../src/utils/crypto';

jest.mock('../src/socket', () => ({
  getIO: jest.fn().mockReturnValue({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  }),
}));

jest.mock('../src/config/db', () => ({
  prisma: {
    ride: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}));

jest.mock('../src/config/redis', () => ({
  redisClient: {
    isReady: true
  }
}));

jest.mock('../src/jobs/rideQueue', () => ({
  rideQueue: {
    add: jest.fn(),
  }
}));

import { rideQueue } from '../src/jobs/rideQueue';

describe('Ride Endpoints', () => {
  let riderToken: string;
  let captainToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    riderToken = generateAccessToken({ userId: 'rider-1', role: Role.RIDER });
    captainToken = generateAccessToken({ userId: 'captain-1', role: Role.CAPTAIN });
  });

  it('GET /rides/fare should calculate fare correctly for BIKE', async () => {
    const response = await request(app)
      .get('/rides/fare')
      .query({
        pickupLat: 12.9716,
        pickupLng: 77.5946,
        destinationLat: 12.9352,
        destinationLng: 77.6245,
        vehicleType: 'BIKE'
      })
      .set('Authorization', `Bearer ${riderToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.estimatedDistanceM).toBeGreaterThan(0);
    expect(response.body.data.estimatedDurationS).toBeGreaterThan(0);
    expect(response.body.data.estimatedFare).toBeGreaterThanOrEqual(20);
  });

  it('POST /rides should create a ride', async () => {
    (prisma.ride.create as jest.Mock).mockResolvedValue({
      id: 'ride-1',
      riderId: 'rider-1',
      status: RideStatus.SEARCHING,
    });

    const response = await request(app)
      .post('/rides')
      .send({
        pickup: { lat: 12.9716, lng: 77.5946 },
        destination: { lat: 12.9352, lng: 77.6245 },
        vehicleType: 'BIKE'
      })
      .set('Authorization', `Bearer ${riderToken}`);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe(RideStatus.SEARCHING);
  });

  it('POST /rides/:rideId/cancel should cancel a SEARCHING ride', async () => {
    const mockRide = {
      id: 'ride-1',
      riderId: 'rider-1',
      status: RideStatus.SEARCHING,
      version: 0
    };
    
    (prisma.ride.findUnique as jest.Mock).mockResolvedValue(mockRide);
    (prisma.ride.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const response = await request(app)
      .post('/rides/ride-1/cancel')
      .send({ reason: 'Changed mind' })
      .set('Authorization', `Bearer ${riderToken}`);

    expect(response.status).toBe(200);
    expect(prisma.ride.updateMany).toHaveBeenCalledWith({
      where: { id: 'ride-1', status: RideStatus.SEARCHING, version: 0 },
      data: expect.objectContaining({
        status: RideStatus.CANCELLED,
        cancelledBy: Role.RIDER,
        cancellationReason: 'Changed mind',
      })
    });
  });

  it('POST /rides/:rideId/cancel should fail if already COMPLETED', async () => {
    const mockRide = {
      id: 'ride-1',
      riderId: 'rider-1',
      status: RideStatus.COMPLETED,
      version: 2
    };
    
    (prisma.ride.findUnique as jest.Mock).mockResolvedValue(mockRide);

    const response = await request(app)
      .post('/rides/ride-1/cancel')
      .send({ reason: 'Changed mind' })
      .set('Authorization', `Bearer ${riderToken}`);

    expect(response.status).toBe(409); // Conflict, invalid state
    expect(response.body.error.message).toContain('Cannot cancel ride in status COMPLETED');
    expect(prisma.ride.updateMany).not.toHaveBeenCalled();
  });

  it('POST /rides/schedule should create a SCHEDULED ride and enqueue job', async () => {
    (prisma.ride.create as jest.Mock).mockResolvedValue({
      id: 'ride-2',
      riderId: 'rider-1',
      status: RideStatus.SCHEDULED,
    });

    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

    const response = await request(app)
      .post('/rides/schedule')
      .send({
        pickup: { lat: 12.9716, lng: 77.5946 },
        destination: { lat: 12.9352, lng: 77.6245 },
        vehicleType: 'BIKE',
        scheduledAt: futureDate
      })
      .set('Authorization', `Bearer ${riderToken}`);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe(RideStatus.SCHEDULED);
    
    // Verify BullMQ was called
    expect(rideQueue.add).toHaveBeenCalledWith(
      'startMatching',
      { rideId: 'ride-2' },
      expect.objectContaining({
        delay: expect.any(Number)
      })
    );
  });
});
