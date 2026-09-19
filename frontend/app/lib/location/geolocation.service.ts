import { LocationData } from "../api/ride.service";

interface IPLocationResponse {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lon?: number;
  city?: string;
  region?: string;
  regionName?: string;
  country?: string;
}

let cachedLocation: LocationData | null = null;
let pendingLocationPromise: Promise<LocationData> | null = null;

/**
 * Reverse geocode a latitude/longitude pair into a human-readable street address
 * using Google Maps Geocoder if loaded, or a clean fallback label.
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  if (typeof window !== "undefined" && window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await new Promise<google.maps.GeocoderResult[] | null>((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === "OK" && results && results.length > 0) {
            resolve(results);
          } else {
            resolve(null);
          }
        });
      });

      if (response && response.length > 0) {
        return response[0].formatted_address;
      }
    } catch (e) {
      console.warn("Google Maps Geocoder error during reverse-geocoding:", e);
    }
  }

  return `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

/**
 * Fetch approximate user location from IP geolocation service when
 * native browser GPS is blocked (e.g. non-HTTPS mobile LAN or permission denied).
 */
async function fetchIpLocation(): Promise<{ lat: number; lng: number; city?: string }> {
  // Strategy 1: ipwho.is (HTTPS, fast, reliable, no API key needed)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://ipwho.is/", { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      if (data.success && typeof data.latitude === "number" && typeof data.longitude === "number") {
        return {
          lat: data.latitude,
          lng: data.longitude,
          city: data.city ? `${data.city}, ${data.region || ""}`.trim() : undefined,
        };
      }
    }
  } catch (err) {
    // Continue to fallback
  }

  // Strategy 2: ip-api.com (HTTP fallback)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("http://ip-api.com/json/", { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: IPLocationResponse = await res.json();
      if (typeof data.lat === "number" && typeof data.lon === "number") {
        return {
          lat: data.lat,
          lng: data.lon,
          city: data.city ? `${data.city}, ${data.regionName || ""}`.trim() : undefined,
        };
      }
    }
  } catch (err) {
    // Continue to default
  }

  // Safe fallback default: National Capital Region / Delhi
  return {
    lat: 28.6519,
    lng: 77.2315,
    city: "Delhi, India",
  };
}

/**
 * Acquire user current location with senior-level resilience:
 * 1. Attempts native device GPS via navigator.geolocation (works on localhost, HTTPS, or Chrome with flag).
 * 2. If rejected/insecure origin/timeout, falls back to IP-based network location.
 * 3. Reverse-geocodes coordinates into an exact street address using Google Maps Geocoder.
 */
export async function getUserCurrentLocation(forceRefresh = false): Promise<LocationData> {
  if (!forceRefresh && cachedLocation) {
    return cachedLocation;
  }

  if (pendingLocationPromise && !forceRefresh) {
    return pendingLocationPromise;
  }

  pendingLocationPromise = (async () => {
    let rawCoords: { lat: number; lng: number } | null = null;
    let locationLabel: string | undefined = undefined;

    // 1. Try Native Browser Geolocation
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 15000,
          });
        });

        if (position?.coords) {
          rawCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        }
      } catch (gpsError: any) {
        console.info(
          "Native GPS unavailable or restricted (typical on HTTP over mobile LAN). Falling back to network location:",
          gpsError?.message || gpsError
        );
      }
    }

    // 2. If Native GPS failed or was blocked, use IP Geolocation
    if (!rawCoords) {
      const ipResult = await fetchIpLocation();
      rawCoords = { lat: ipResult.lat, lng: ipResult.lng };
      locationLabel = ipResult.city;
    }

    // 3. Reverse-geocode to get precise street address
    const fullAddress = await reverseGeocodeCoords(rawCoords.lat, rawCoords.lng);

    const resolvedLocation: LocationData = {
      lat: rawCoords.lat,
      lng: rawCoords.lng,
      address: fullAddress,
      name: locationLabel || "Current Location",
    };

    cachedLocation = resolvedLocation;
    pendingLocationPromise = null;
    return resolvedLocation;
  })();

  return pendingLocationPromise;
}
