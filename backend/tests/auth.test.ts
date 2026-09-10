import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { hashPassword } from '../src/utils/crypto';

// Use a separate database schema or clean the db between tests in a real project
// For now, we mock prisma entirely or use a test db. We'll use mocked prisma for unit tests.

jest.mock('../src/config/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}));

jest.mock('../src/config/redis', () => ({
  redisClient: {
    isReady: true
  }
}));

describe('Auth Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /auth/register should create a new user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'uuid-123',
      email: 'test@example.com',
      role: 'RIDER',
    });

    const response = await request(app).post('/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
      role: 'RIDER',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('test@example.com');
  });

  it('POST /auth/login should return tokens', async () => {
    const hashedPassword = await hashPassword('password123');
    
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'uuid-123',
      email: 'test@example.com',
      passwordHash: hashedPassword,
      role: 'RIDER',
    });

    (prisma.refreshSession.create as jest.Mock).mockResolvedValue({});

    const response = await request(app).post('/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });
});
