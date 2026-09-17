"use client";

import { useState, useEffect, useRef } from "react";
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRideStore } from "@/stores/ride.store";
import { rideService, LocationData } from "@/lib/api/ride.service";
import { MOCK_RIDER_LOCATION, MOCK_DESTINATION_LOCATION } from "@/config/mockLocation";
import { MapPin, Navigation, Bike, Car, Loader2, Crosshair, X, Search, CalendarClock } from "lucide-react";

// Fallback landmarks across Delhi-NCR if Places API is idle
const DEFAULT_POPULAR_HUBS: (LocationData & { tag: string })[] = [
  { name: "Connaught Place", address: "Inner Circle, Connaught Place, New Delhi", lat: 28.6315, lng: 77.2167, tag: "City Center" },
  { name: "IGI Airport Terminal 3", address: "Indira Gandhi International Airport, T3, New Delhi", lat: 28.5562, lng: 77.1000, tag: "Airport" },
  { name: "Cyber City Gurugram", address: "DLF Cyber City, DLF Phase 2, Gurugram", lat: 28.4986, lng: 77.0898, tag: "Tech Park" },
  { name: "Noida Sector 18", address: "Sector 18 Market, Noida, Uttar Pradesh", lat: 28.5708, lng: 77.3260, tag: "Metro Hub" },
  { name: "Shahdara Metro Station", address: "Metro Station Gate 2, Shahdara, Delhi", lat: 28.6655, lng: 77.2760, tag: "Metro" },
];

export function BookingPanel() {
  const { isLoaded } = useGoogleMapsLoader();

  const { pickup, destination, setPickup, setDestination, vehicleType, setVehicleType, setActiveRide, setActiveTab } = useRideStore();
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [fareEstimate, setFareEstimate] = useState<number | null>(null);

  // Editable text states
  const [pickupText, setPickupText] = useState("");
  const [destText, setDestText] = useState("");

  // Real Google Maps Places Predictions
  const [pickupPredictions, setPickupPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [destPredictions, setDestPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  // Dropdown visibility
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const pickupContainerRef = useRef<HTMLDivElement>(null);
  const destContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Google Places & Geocoder service once script is loaded
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined" && window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, [isLoaded]);

  // Sync input text with store changes (e.g. from GPS or initial load)
  useEffect(() => {
    if (pickup?.address || pickup?.name) {
      setPickupText(pickup.address || pickup.name || "");
    }
  }, [pickup]);

  useEffect(() => {
    if (destination?.address || destination?.name) {
      setDestText(destination.address || destination.name || "");
    }
  }, [destination]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickupContainerRef.current && !pickupContainerRef.current.contains(e.target as Node)) {
        setShowPickupSuggestions(false);
      }
      if (destContainerRef.current && !destContainerRef.current.contains(e.target as Node)) {
        setShowDestSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch real Google Maps autocomplete predictions for Pickup
  useEffect(() => {
    if (!pickupText.trim()) {
      setPickupPredictions([]);
      return;
    }

    if (!autocompleteServiceRef.current) return;

    const timer = setTimeout(() => {
      setIsSearchingPlaces(true);
      autocompleteServiceRef.current?.getPlacePredictions(
        {
          input: pickupText,
          componentRestrictions: { country: "in" },
        },
        (predictions, status) => {
          setIsSearchingPlaces(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setPickupPredictions(predictions);
          } else {
            setPickupPredictions([]);
          }
        }
      );
    }, 280);

    return () => clearTimeout(timer);
  }, [pickupText]);

  // Fetch real Google Maps autocomplete predictions for Destination
  useEffect(() => {
    if (!destText.trim()) {
      setDestPredictions([]);
      return;
    }

    if (!autocompleteServiceRef.current) return;

    const timer = setTimeout(() => {
      setIsSearchingPlaces(true);
      autocompleteServiceRef.current?.getPlacePredictions(
        {
          input: destText,
          componentRestrictions: { country: "in" },
        },
        (predictions, status) => {
          setIsSearchingPlaces(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setDestPredictions(predictions);
          } else {
            setDestPredictions([]);
          }
        }
      );
    }, 280);

    return () => clearTimeout(timer);
  }, [destText]);

  // Resolve Place ID to exact GPS coordinates (lat, lng) via Geocoder
  const resolvePlaceId = async (placeId: string, description: string): Promise<LocationData | null> => {
    if (!geocoderRef.current && window.google?.maps?.Geocoder) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }

    if (!geocoderRef.current) return null;

    try {
      const results = await new Promise<google.maps.GeocoderResult[] | null>((resolve) => {
        geocoderRef.current?.geocode({ placeId }, (res, status) => {
          if (status === "OK" && res && res.length > 0) resolve(res);
          else resolve(null);
        });
      });

      if (results && results[0]) {
        const place = results[0];
        return {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address || description,
          name: description.split(",")[0] || description,
        };
      }
    } catch (err) {
      console.error("Failed to geocode place ID:", err);
    }
    return null;
  };

  // Resolve freeform address string via Geocoder
  const geocodeAddressString = async (query: string): Promise<LocationData> => {
    const trimmed = query.trim();
    if (!trimmed) return MOCK_RIDER_LOCATION;

    if (!geocoderRef.current && window.google?.maps?.Geocoder) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }

    if (geocoderRef.current) {
      try {
        const results = await new Promise<google.maps.GeocoderResult[] | null>((resolve) => {
          geocoderRef.current?.geocode({ address: trimmed, componentRestrictions: { country: "in" } }, (res, status) => {
            if (status === "OK" && res && res.length > 0) resolve(res);
            else resolve(null);
          });
        });

        if (results && results[0]) {
          return {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
            address: results[0].formatted_address,
            name: trimmed,
          };
        }
      } catch (err) {
        console.warn("Geocoding address failed:", err);
      }
    }

    return {
      lat: 28.6300,
      lng: 77.2200,
      address: trimmed,
      name: trimmed,
    };
  };

  const fetchFare = async (targetDest = destination, currentPickup = pickup) => {
    const pick = currentPickup || MOCK_RIDER_LOCATION;
    const dest = targetDest || MOCK_DESTINATION_LOCATION;
    if (!pick || !dest) return;
    try {
      setLoading(true);
      const res = await rideService.getFareEstimate({
        pickupLat: pick.lat,
        pickupLng: pick.lng,
        destinationLat: dest.lat,
        destinationLng: dest.lng,
        vehicleType,
      });
      setFareEstimate(res.estimatedFare);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Selection handlers for Real Google Places predictions
  const handleSelectGooglePrediction = async (
    prediction: google.maps.places.AutocompletePrediction,
    type: "pickup" | "dest"
  ) => {
    const locationData = await resolvePlaceId(prediction.place_id, prediction.description);
    if (!locationData) return;

    if (type === "pickup") {
      setPickup(locationData);
      setPickupText(locationData.address || locationData.name || prediction.description);
      setShowPickupSuggestions(false);
      if (destination) fetchFare(destination, locationData);
    } else {
      setDestination(locationData);
      setDestText(locationData.address || locationData.name || prediction.description);
      setShowDestSuggestions(false);
      fetchFare(locationData, pickup || undefined);
    }
  };

  // Fallback / Preset selection
  const handleSelectPreset = (loc: LocationData, type: "pickup" | "dest") => {
    if (type === "pickup") {
      setPickup(loc);
      setPickupText(loc.address || loc.name || "");
      setShowPickupSuggestions(false);
      if (destination) fetchFare(destination, loc);
    } else {
      setDestination(loc);
      setDestText(loc.address || loc.name || "");
      setShowDestSuggestions(false);
      fetchFare(loc, pickup || undefined);
    }
  };

  // Handle manual input submit (Enter or blur)
  const handleManualPickupSubmit = async () => {
    if (!pickupText.trim()) return;
    if (pickup?.address === pickupText) return;
    const resolved = await geocodeAddressString(pickupText);
    setPickup(resolved);
    setPickupText(resolved.address || resolved.name || pickupText);
    if (destination) fetchFare(destination, resolved);
  };

  const handleManualDestSubmit = async () => {
    if (!destText.trim()) return;
    if (destination?.address === destText) return;
    const resolved = await geocodeAddressString(destText);
    setDestination(resolved);
    setDestText(resolved.address || resolved.name || destText);
    fetchFare(resolved, pickup || undefined);
  };

  // Live GPS geolocation
  const handleUseCurrentLocation = () => {
    setGpsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (!geocoderRef.current && window.google?.maps?.Geocoder) {
            geocoderRef.current = new window.google.maps.Geocoder();
          }

          if (geocoderRef.current) {
            geocoderRef.current.geocode({ location: coords }, (results, status) => {
              setGpsLoading(false);
              const address = (status === "OK" && results?.[0]?.formatted_address)
                ? results[0].formatted_address
                : `Current GPS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
              const loc: LocationData = {
                lat: coords.lat,
                lng: coords.lng,
                address,
                name: "Current Location",
              };
              setPickup(loc);
              setPickupText(address);
              setShowPickupSuggestions(false);
              if (destination) fetchFare(destination, loc);
            });
          } else {
            setGpsLoading(false);
            const loc: LocationData = {
              lat: coords.lat,
              lng: coords.lng,
              address: "Current Location (GPS)",
              name: "Current Location",
            };
            setPickup(loc);
            setPickupText("Current Location (GPS)");
            setShowPickupSuggestions(false);
            if (destination) fetchFare(destination, loc);
          }
        },
        () => {
          setGpsLoading(false);
          setPickup(MOCK_RIDER_LOCATION);
          setPickupText(MOCK_RIDER_LOCATION.address);
          setShowPickupSuggestions(false);
          if (destination) fetchFare(destination, MOCK_RIDER_LOCATION);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setGpsLoading(false);
      setPickup(MOCK_RIDER_LOCATION);
      setPickupText(MOCK_RIDER_LOCATION.address);
      setShowPickupSuggestions(false);
      if (destination) fetchFare(destination, MOCK_RIDER_LOCATION);
    }
  };

  const handleBookRide = async () => {
    const finalPickup = pickup || (pickupText ? await geocodeAddressString(pickupText) : MOCK_RIDER_LOCATION);
    const finalDest = destination || (destText ? await geocodeAddressString(destText) : MOCK_DESTINATION_LOCATION);

    try {
      setLoading(true);
      const ride = await rideService.createRide({
        pickup: finalPickup,
        destination: finalDest,
        vehicleType,
      });
      setActiveRide(ride);
    } catch (err) {
      console.error("Failed to book ride", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <Card className="w-full bg-card border-border shadow-md overflow-visible rounded-2xl">
        <CardContent className="p-4 sm:p-5 space-y-4">

          {/* Mode Switcher: Ride Now vs Schedule Later */}
          <div className="flex items-center justify-between p-1 bg-muted/50 rounded-xl border border-border">
            <button
              type="button"
              className="flex-1 py-1.5 px-3 text-xs font-black rounded-lg bg-primary text-black shadow-xs flex items-center justify-center gap-1.5 cursor-default"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Ride Now</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("scheduled")}
              className="flex-1 py-1.5 px-3 text-xs font-bold rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <CalendarClock className="w-3.5 h-3.5 text-primary" />
              <span>Schedule Later</span>
            </button>
          </div>

          {/* Location Inputs Group */}
          <div className="space-y-3 relative">
            <div className="absolute left-4 top-[24px] bottom-[24px] w-0.5 bg-muted z-0"></div>

            {/* PICKUP LOCATION INPUT */}
            <div className="relative z-30" ref={pickupContainerRef}>
              <div className="flex items-center space-x-2.5">
                <div className="bg-background rounded-full p-2 border border-border shadow-sm flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>

                <div className="relative flex-1 flex items-center">
                  <Input
                    placeholder="Search pickup location or use GPS..."
                    className="border-none bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary h-12 pr-16 text-sm sm:text-base font-medium transition-all"
                    value={pickupText}
                    onChange={(e) => {
                      setPickupText(e.target.value);
                      setShowPickupSuggestions(true);
                    }}
                    onFocus={() => setShowPickupSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleManualPickupSubmit();
                        setShowPickupSuggestions(false);
                      }
                    }}
                  />

                  {/* Action buttons inside Pickup Input */}
                  <div className="absolute right-2 flex items-center gap-1">
                    {pickupText && (
                      <button
                        type="button"
                        onClick={() => {
                          setPickupText("");
                          setPickup(null);
                        }}
                        className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                        title="Clear pickup"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={gpsLoading}
                      className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-all active:scale-95 flex items-center justify-center"
                      title="Use live GPS location"
                    >
                      {gpsLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Crosshair className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Real Google Maps Pickup Suggestions Dropdown */}
              {showPickupSuggestions && (
                <div className="absolute left-10 right-0 top-14 z-50 bg-background border border-border rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar p-1">

                  {/* GPS Option */}
                  <button
                    type="button"
                    onMouseDown={handleUseCurrentLocation}
                    className="w-full text-left px-3 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-2.5 transition-colors cursor-pointer mb-1"
                  >
                    <Crosshair className="w-4 h-4 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-bold block">Use Current GPS Location</span>
                      <span className="text-[10px] text-muted-foreground">Accurate device location</span>
                    </div>
                  </button>

                  {/* Searching Indicator */}
                  {isSearchingPlaces && (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>Searching Google Maps...</span>
                    </div>
                  )}

                  {/* Real Google Predictions */}
                  {pickupPredictions.length > 0 ? (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Google Maps Locations</span>
                      </div>
                      {pickupPredictions.map((pred) => (
                        <button
                          key={pred.place_id}
                          type="button"
                          onMouseDown={() => handleSelectGooglePrediction(pred, "pickup")}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/70 flex items-start gap-2.5 transition-colors cursor-pointer"
                        >
                          <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                              {pred.structured_formatting?.main_text || pred.description}
                            </span>
                            <span className="text-[11px] text-muted-foreground block truncate">
                              {pred.structured_formatting?.secondary_text || pred.description}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : !pickupText.trim() ? (
                    /* Preset Hubs on Empty Focus */
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Popular Pickup Hubs</span>
                      </div>
                      {DEFAULT_POPULAR_HUBS.map((loc, idx) => (
                        <button
                          key={`pickup-preset-${idx}`}
                          type="button"
                          onMouseDown={() => handleSelectPreset(loc, "pickup")}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/70 flex items-start gap-2.5 transition-colors cursor-pointer"
                        >
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-bold truncate">{loc.name}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground uppercase">{loc.tag}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{loc.address}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : !isSearchingPlaces ? (
                    <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                      Press Enter to search "{pickupText}"
                    </div>
                  ) : null}

                  {/* Google Attribution */}
                  <div className="px-2 pt-1.5 pb-1 border-t border-border mt-1 flex justify-end">
                    <span className="text-[9px] text-muted-foreground/80 font-medium">powered by Google</span>
                  </div>
                </div>
              )}
            </div>

            {/* DESTINATION LOCATION INPUT */}
            <div className="relative z-20" ref={destContainerRef}>
              <div className="flex items-center space-x-2.5">
                <div className="bg-background rounded-full p-2 border border-border shadow-sm flex-shrink-0">
                  <Navigation className="w-4 h-4 text-accent" />
                </div>

                <div className="relative flex-1 flex items-center">
                  <Input
                    placeholder="Search destination on Google Maps..."
                    className="border-none bg-muted/50 focus-visible:ring-2 focus-visible:ring-accent h-12 pr-10 text-sm sm:text-base font-medium transition-all"
                    value={destText}
                    onChange={(e) => {
                      setDestText(e.target.value);
                      setShowDestSuggestions(true);
                    }}
                    onFocus={() => setShowDestSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleManualDestSubmit();
                        setShowDestSuggestions(false);
                      }
                    }}
                  />

                  {destText && (
                    <button
                      type="button"
                      onClick={() => {
                        setDestText("");
                        setDestination(null);
                        setFareEstimate(null);
                      }}
                      className="absolute right-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                      title="Clear destination"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Real Google Maps Destination Suggestions Dropdown */}
              {showDestSuggestions && (
                <div className="absolute left-10 right-0 top-14 z-50 bg-background border border-border rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar p-1">

                  {/* Searching Indicator */}
                  {isSearchingPlaces && (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                      <span>Searching Google Maps...</span>
                    </div>
                  )}

                  {/* Real Google Predictions */}
                  {destPredictions.length > 0 ? (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Google Maps Suggestions</span>
                      </div>
                      {destPredictions.map((pred) => (
                        <button
                          key={pred.place_id}
                          type="button"
                          onMouseDown={() => handleSelectGooglePrediction(pred, "dest")}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/70 flex items-start gap-2.5 transition-colors cursor-pointer"
                        >
                          <Navigation className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                              {pred.structured_formatting?.main_text || pred.description}
                            </span>
                            <span className="text-[11px] text-muted-foreground block truncate">
                              {pred.structured_formatting?.secondary_text || pred.description}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : !destText.trim() ? (
                    /* Preset Hubs on Empty Focus */
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Popular Destinations</span>
                      </div>
                      {DEFAULT_POPULAR_HUBS.map((loc, idx) => (
                        <button
                          key={`dest-preset-${idx}`}
                          type="button"
                          onMouseDown={() => handleSelectPreset(loc, "dest")}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/70 flex items-start gap-2.5 transition-colors cursor-pointer"
                        >
                          <Navigation className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-bold truncate">{loc.name}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground uppercase">{loc.tag}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{loc.address}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : !isSearchingPlaces ? (
                    <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                      Press Enter to set destination "{destText}"
                    </div>
                  ) : null}

                  {/* Google Attribution */}
                  <div className="px-2 pt-1.5 pb-1 border-t border-border mt-1 flex justify-end">
                    <span className="text-[9px] text-muted-foreground/80 font-medium">powered by Google</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Vehicle Selection */}
          {(pickup || pickupText) && (destination || destText) && (
            <div className="flex space-x-3 pt-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => {
                  setVehicleType("BIKE");
                  fetchFare(destination || undefined, pickup || undefined);
                }}
                className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${vehicleType === "BIKE" ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:bg-muted/40"
                  }`}
              >
                <Bike className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 ${vehicleType === "BIKE" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs sm:text-sm font-bold">Bike</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setVehicleType("CAB");
                  fetchFare(destination || undefined, pickup || undefined);
                }}
                className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${vehicleType === "CAB" ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:bg-muted/40"
                  }`}
              >
                <Car className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 ${vehicleType === "CAB" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs sm:text-sm font-bold">Cab</span>
              </button>
            </div>
          )}

          {/* Book Ride CTA Button */}
          {(pickup || pickupText) && (destination || destText) ? (
            <Button
              className="w-full h-12 sm:h-14 rounded-full text-base sm:text-lg font-bold shadow-lg shadow-primary/20 cursor-pointer"
              disabled={loading}
              onClick={handleBookRide}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                `Book ${vehicleType} ${fareEstimate ? `• ₹${fareEstimate}` : ""}`
              )}
            </Button>
          ) : (
            <Button className="w-full h-12 sm:h-14 rounded-full text-base sm:text-lg font-bold bg-muted text-muted-foreground hover:bg-muted" disabled>
              Enter Pickup & Destination
            </Button>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
