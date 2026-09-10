import request from 'supertest';
import app from '../src/app';

// Mock DB and Redis to avoid actual connection overhead during simple health checks
jest.mock('../src/config/db', () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] })
  }
}));

jest.mock('../src/config/redis', () => ({
  redisClient: {
    isReady: true
  }
}));

describe('Health Endpoints', () => {
  it('GET /health should return 200 OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  it('GET /ready should return 200 ready when dependencies are ok', async () => {
    const response = await request(app).get('/ready');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
  });
});
