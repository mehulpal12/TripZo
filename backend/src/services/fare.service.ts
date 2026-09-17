import { AppError } from '../errors/AppError';

// For MVP, we use straight-line distance (haversine formula) and a flat 12/KM rate for BIKE.
const BIKE_RATE_PER_KM = 12;
const AVERAGE_SPEED_KMH = 30; // Assume 30 km/h average speed in city traffic

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export const estimateFare = (
  pickupLat: number,
  pickupLng: number,
  destinationLat: number,
  destinationLng: number,
  vehicleType: string
) => {
  if (
    !Number.isFinite(pickupLat) ||
    !Number.isFinite(pickupLng) ||
    !Number.isFinite(destinationLat) ||
    !Number.isFinite(destinationLng)
  ) {
    throw new AppError('INVALID_COORDINATES', 400, 'Coordinates must be valid finite numbers');
  }

  if (
    pickupLat < -90 || pickupLat > 90 ||
    destinationLat < -90 || destinationLat > 90 ||
    pickupLng < -180 || pickupLng > 180 ||
    destinationLng < -180 || destinationLng > 180
  ) {
    throw new AppError('INVALID_COORDINATES', 400, 'Coordinates are outside valid latitude/longitude ranges');
  }

  const VEHICLE_RATES: Record<string, number> = {
    BIKE: 12,
    AUTO: 16,
    CAB: 22,
  };

  const normalizedVehicle = (vehicleType || 'BIKE').toUpperCase();
  const ratePerKm = VEHICLE_RATES[normalizedVehicle] || VEHICLE_RATES.BIKE;
  const minFare = normalizedVehicle === 'CAB' ? 50 : normalizedVehicle === 'AUTO' ? 30 : 20;

  const distanceKm = getDistanceFromLatLonInKm(pickupLat, pickupLng, destinationLat, destinationLng);
  
  // Basic sanity check, maybe they are in different countries
  if (distanceKm > 100) {
    throw new AppError('DISTANCE_TOO_FAR', 400, 'Pickup and destination are too far apart');
  }

  const distanceMeters = Math.round(distanceKm * 1000);
  const durationSeconds = Math.round((distanceKm / AVERAGE_SPEED_KMH) * 3600);
  
  const baseFare = distanceKm * ratePerKm;
  const estimatedFare = Math.max(minFare, Math.round(baseFare));

  return {
    estimatedDistanceM: distanceMeters,
    estimatedDurationS: durationSeconds,
    estimatedFare,
  };
};
