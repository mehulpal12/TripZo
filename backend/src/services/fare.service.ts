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
  if (vehicleType !== 'BIKE') {
    throw new AppError('UNSUPPORTED_VEHICLE', 400, 'Currently only BIKE is supported');
  }

  const distanceKm = getDistanceFromLatLonInKm(pickupLat, pickupLng, destinationLat, destinationLng);
  
  // Basic sanity check, maybe they are in different countries
  if (distanceKm > 100) {
    throw new AppError('DISTANCE_TOO_FAR', 400, 'Pickup and destination are too far apart');
  }

  const distanceMeters = Math.round(distanceKm * 1000);
  const durationSeconds = Math.round((distanceKm / AVERAGE_SPEED_KMH) * 3600);
  
  // Calculate fare: 12/KM
  // Minimum fare can be set to 20
  const baseFare = distanceKm * BIKE_RATE_PER_KM;
  const estimatedFare = Math.max(20, Math.round(baseFare));

  return {
    estimatedDistanceM: distanceMeters,
    estimatedDurationS: durationSeconds,
    estimatedFare,
  };
};
