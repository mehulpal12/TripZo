import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { CaptainStatus, Role } from '@prisma/client';
import { generateAccessToken } from '../src/utils/crypto';

jest.mock('../src/config/db', () => ({
  prisma: {
    captain: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ride: {
      findMany: jest.fn(),
    }
  }
}));

jest.mock('../src/config/redis', () => ({
  redisClient: {
    isReady: true
  }
}));

describe('Captain Endpoints', () => {
  let captainToken: string;
  let riderToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    captainToken = generateAccessToken({ userId: 'captain-1', role: Role.CAPTAIN });
    riderToken = generateAccessToken({ userId: 'rider-1', role: Role.RIDER });
  });

  it('POST /captains/online should set captain to AVAILABLE', async () => {
    (prisma.captain.findUnique as jest.Mock).mockResolvedValue({ userId: 'captain-1', status: CaptainStatus.OFFLINE });
    (prisma.captain.update as jest.Mock).mockResolvedValue({ userId: 'captain-1', status: CaptainStatus.AVAILABLE });

    const response = await request(app)
      .post('/captains/online')
      .set('Authorization', `Bearer ${captainToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(CaptainStatus.AVAILABLE);
  });

  it('POST /captains/offline should set captain to OFFLINE', async () => {
    (prisma.captain.findUnique as jest.Mock).mockResolvedValue({ userId: 'captain-1', status: CaptainStatus.AVAILABLE });
    (prisma.captain.update as jest.Mock).mockResolvedValue({ userId: 'captain-1', status: CaptainStatus.OFFLINE });

    const response = await request(app)
      .post('/captains/offline')
      .set('Authorization', `Bearer ${captainToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(CaptainStatus.OFFLINE);
  });

  it('POST /captains/online should fail if requested by RIDER', async () => {
    const response = await request(app)
      .post('/captains/online')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe('Insufficient permissions');
  });

  it('GET /captains/rides should return assigned rides', async () => {
    (prisma.captain.findUnique as jest.Mock).mockResolvedValue({ id: 'cap-db-1', userId: 'captain-1' });
    (prisma.ride.findMany as jest.Mock).mockResolvedValue([{ id: 'ride-1' }]);

    const response = await request(app)
      .get('/captains/rides')
      .set('Authorization', `Bearer ${captainToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
    expect(prisma.ride.findMany).toHaveBeenCalledWith({
      where: { captainId: 'cap-db-1' },
      orderBy: { createdAt: 'desc' }
    });
  });
});
