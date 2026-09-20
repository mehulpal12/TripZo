import { env } from './env';

/**
 * Validates whether an incoming HTTP or WebSocket origin is permitted.
 * Supports comma-separated CORS_ORIGIN, Vercel deployments, localhost, and private LAN.
 */
export const isOriginAllowed = (origin: string | undefined): boolean => {
  // Allow requests with no origin (e.g. mobile native clients, curl, server-to-server)
  if (!origin) return true;

  const cleanOrigin = origin.trim().replace(/\/$/, '');

  // 1. Explicitly allow production Vercel app & preview deployments
  if (
    cleanOrigin === 'https://trip-zo-five.vercel.app' ||
    cleanOrigin.endsWith('.vercel.app')
  ) {
    return true;
  }

  // 2. Match against configured CORS_ORIGIN (handles single or comma-separated list)
  const configuredOrigins = (env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (configuredOrigins.includes(cleanOrigin)) {
    return true;
  }

  // 3. Local development and LAN IP testing
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    if (
      cleanOrigin.includes('localhost') ||
      cleanOrigin.includes('127.0.0.1') ||
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(cleanOrigin) ||
      /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(cleanOrigin) ||
      /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/.test(cleanOrigin)
    ) {
      return true;
    }
  }

  return false;
};
