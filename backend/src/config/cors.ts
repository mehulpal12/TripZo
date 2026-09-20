import { env } from './env';

/**
 * Validates whether an incoming HTTP or WebSocket origin is permitted.
 * In development, allows localhost and private LAN ranges for multi-device testing.
 * In production, strictly matches the configured CORS_ORIGIN.
 */
export const isOriginAllowed = (origin: string | undefined): boolean => {
  // Allow requests with no origin (e.g. mobile native clients, curl, server-to-server)
  if (!origin) return true;

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/.test(origin)
    ) {
      return true;
    }
  }

  // Exact match against configured CORS origin (e.g. production domain or explicit port 3000)
  return origin === env.CORS_ORIGIN;
};
