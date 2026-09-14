/**
 * Configurable mock location for the Rider during development and testing.
 *
 * To test different scenarios:
 * 1. Update the default coordinates below, OR
 * 2. Set NEXT_PUBLIC_MOCK_RIDER_LAT and NEXT_PUBLIC_MOCK_RIDER_LNG in frontend/app/.env.local
 */

export const MOCK_RIDER_LOCATION = {
  lat: process.env.NEXT_PUBLIC_MOCK_RIDER_LAT
    ? parseFloat(process.env.NEXT_PUBLIC_MOCK_RIDER_LAT)
    : 28.6655, // Near Shahdara / East Delhi (~300m from captain's live GPS)
  lng: process.env.NEXT_PUBLIC_MOCK_RIDER_LNG
    ? parseFloat(process.env.NEXT_PUBLIC_MOCK_RIDER_LNG)
    : 77.2760,
  address: "Metro Station Gate 2, Shahdara",
  name: "Rider Pickup Point",
};

export const MOCK_DESTINATION_LOCATION = {
  lat: process.env.NEXT_PUBLIC_MOCK_DEST_LAT
    ? parseFloat(process.env.NEXT_PUBLIC_MOCK_DEST_LAT)
    : 28.6750, // Dilshad Garden area (~2.5km ride)
  lng: process.env.NEXT_PUBLIC_MOCK_DEST_LNG
    ? parseFloat(process.env.NEXT_PUBLIC_MOCK_DEST_LNG)
    : 77.3000,
  address: "GTB Enclave, Dilshad Garden",
  name: "Destination Dropoff",
};
