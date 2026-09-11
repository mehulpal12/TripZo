import { getNearbyCaptains } from '../src/services/matching.service';
import { redisClient } from '../src/config/redis';
import { prisma } from '../src/config/db';
import { CaptainStatus } from '@prisma/client';

jest.mock('../src/config/redis', () => ({
  redisClient: {
    isReady: true,
    geoSearch: jest.fn(),
  }
}));

jest.mock('../src/config/db', () => ({
  prisma: {
    captain: {
      findMany: jest.fn(),
    }
  }
}));

describe('Matching Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array if no captains nearby', async () => {
    (redisClient.geoSearch as jest.Mock).mockResolvedValue([]);

    const result = await getNearbyCaptains('ride-1', 12.97, 77.59, 5, 'BIKE');

    expect(result).toEqual([]);
    expect(prisma.captain.findMany).not.toHaveBeenCalled();
  });

  it('should query prisma for nearby members', async () => {
    (redisClient.geoSearch as jest.Mock).mockResolvedValue(['cap-user-1', 'cap-user-2']);
    (prisma.captain.findMany as jest.Mock).mockResolvedValue([
      { userId: 'cap-user-1', status: CaptainStatus.AVAILABLE }
    ]);

    const result = await getNearbyCaptains('ride-1', 12.97, 77.59, 5, 'BIKE');

    expect(redisClient.geoSearch).toHaveBeenCalledWith(
      'captain_locations',
      { latitude: 12.97, longitude: 77.59 },
      { radius: 5, unit: 'km' }
    );

    expect(prisma.captain.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: { in: ['cap-user-1', 'cap-user-2'] },
        status: CaptainStatus.AVAILABLE,
        vehicleType: 'BIKE',
      })
    }));

    expect(result.length).toBe(1);
    expect(result[0].userId).toBe('cap-user-1');
  });
});
