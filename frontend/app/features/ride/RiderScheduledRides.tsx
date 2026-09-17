"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRideStore, Ride } from "@/stores/ride.store";
import { rideService, LocationData } from "@/lib/api/ride.service";
import { MOCK_RIDER_LOCATION, MOCK_DESTINATION_LOCATION } from "@/config/mockLocation";
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader";
import { 
  CalendarClock, 
  Clock, 
  MapPin, 
  Navigation, 
  Bike, 
  Car, 
  Loader2, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw,
  Sparkles,
  CalendarCheck,
  Crosshair,
  Search,
  Zap
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Popular Delhi-NCR hubs for fast 1-click selection
const DEFAULT_POPULAR_HUBS: (LocationData & { tag: string })[] = [
  { name: "Connaught Place", address: "Inner Circle, Connaught Place, New Delhi", lat: 28.6315, lng: 77.2167, tag: "City Center" },
  { name: "IGI Airport Terminal 3", address: "Indira Gandhi International Airport, T3, New Delhi", lat: 28.5562, lng: 77.1000, tag: "Airport" },
  { name: "Cyber City Gurugram", address: "DLF Cyber City, DLF Phase 2, Gurugram", lat: 28.4986, lng: 77.0898, tag: "Tech Park" },
  { name: "Noida Sector 18", address: "Sector 18 Market, Noida, Uttar Pradesh", lat: 28.5708, lng: 77.3260, tag: "Metro Hub" },
  { name: "Shahdara Metro Station", address: "Metro Station Gate 2, Shahdara, Delhi", lat: 28.6655, lng: 77.2760, tag: "Metro" },
  { name: "GTB Enclave", address: "GTB Enclave, Dilshad Garden, Delhi", lat: 28.6750, lng: 77.3000, tag: "Hospital Hub" },
];

export function RiderScheduledRides() {
  const { isLoaded } = useGoogleMapsLoader();

  const { 
    pickup, 
    destination, 
    setPickup, 
    setDestination, 
    vehicleType, 
    setVehicleType, 
    setActiveTab,
    setActiveRide
  } = useRideStore();

  const [activeSubView, setActiveSubView] = useState<"book" | "list">("book");
  const [scheduledRides, setScheduledRides] = useState<Ride[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [fareEstimate, setFareEstimate] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<Ride | null>(null);

  // Editable input text states for Pickup & Destination (defaults to familiar hubs)
  const [pickupText, setPickupText] = useState(pickup?.address || pickup?.name || MOCK_RIDER_LOCATION.address);
  const [destText, setDestText] = useState(destination?.address || destination?.name || MOCK_DESTINATION_LOCATION.address);

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

  // Set default locations in store once on mount if empty
  useEffect(() => {
    if (!pickup) {
      setPickup(MOCK_RIDER_LOCATION);
    }
    if (!destination) {
      setDestination(MOCK_DESTINATION_LOCATION);
    }
  }, []); // Run once on mount

  // Sync input text with store changes (e.g. from GPS or outside selection)
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
    } else {
      setDestination(locationData);
      setDestText(locationData.address || locationData.name || prediction.description);
      setShowDestSuggestions(false);
    }
  };

  // Preset selection
  const handleSelectPreset = (loc: LocationData, type: "pickup" | "dest") => {
    if (type === "pickup") {
      setPickup(loc);
      setPickupText(loc.address || loc.name || "");
      setShowPickupSuggestions(false);
    } else {
      setDestination(loc);
      setDestText(loc.address || loc.name || "");
      setShowDestSuggestions(false);
    }
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
          }
        },
        () => {
          setGpsLoading(false);
          setPickup(MOCK_RIDER_LOCATION);
          setPickupText(MOCK_RIDER_LOCATION.address);
          setShowPickupSuggestions(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setGpsLoading(false);
      setPickup(MOCK_RIDER_LOCATION);
      setPickupText(MOCK_RIDER_LOCATION.address);
      setShowPickupSuggestions(false);
    }
  };

  // Time selection: default to 1 hour from now
  const getDefaultScheduledTime = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [selectedDatetime, setSelectedDatetime] = useState<string>(getDefaultScheduledTime());

  // Minimum allowed is 15 minutes from now
  const getMinDatetime = () => {
    const d = new Date(Date.now() + 15 * 60 * 1000);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Fetch upcoming scheduled rides for this rider
  const fetchScheduledRides = useCallback(async () => {
    setLoadingList(true);
    try {
      const rides = await rideService.getScheduledRides();
      setScheduledRides(rides || []);
    } catch (err) {
      console.error("Failed to fetch scheduled rides", err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduledRides();
    const interval = setInterval(fetchScheduledRides, 30000);
    return () => clearInterval(interval);
  }, [fetchScheduledRides]);

  // Fetch fare estimate when pickup, destination, or vehicle changes
  useEffect(() => {
    const fetchFare = async () => {
      const pick = pickup || (pickupText ? await geocodeAddressString(pickupText) : MOCK_RIDER_LOCATION);
      const dest = destination || (destText ? await geocodeAddressString(destText) : MOCK_DESTINATION_LOCATION);
      if (!pick || !dest) return;
      try {
        const res = await rideService.getFareEstimate({
          pickupLat: pick.lat,
          pickupLng: pick.lng,
          destinationLat: dest.lat,
          destinationLng: dest.lng,
          vehicleType,
        });
        setFareEstimate(res.estimatedFare);
      } catch (err) {
        console.warn("Failed to get fare estimate", err);
      }
    };

    fetchFare();
  }, [pickup, destination, pickupText, destText, vehicleType]);

  // Quick preset handlers
  const handleQuickPreset = (hoursFromNow: number) => {
    const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    setSelectedDatetime(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
  };

  const handleTonightPreset = () => {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    if (d.getTime() <= Date.now() + 20 * 60 * 1000) {
      d.setDate(d.getDate() + 1);
    }
    const tzOffset = d.getTimezoneOffset() * 60000;
    setSelectedDatetime(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
  };

  const handleTomorrowMorningPreset = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    setSelectedDatetime(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
  };

  // Submit scheduled ride
  const handleScheduleRide = async () => {
    setErrorMsg(null);
    setSuccessBooking(null);

    const pick = pickup || (pickupText ? await geocodeAddressString(pickupText) : MOCK_RIDER_LOCATION);
    const dest = destination || (destText ? await geocodeAddressString(destText) : MOCK_DESTINATION_LOCATION);

    if (!pick || !dest) {
      setErrorMsg("Please choose both pickup and destination locations.");
      return;
    }

    const scheduledDate = new Date(selectedDatetime);
    if (isNaN(scheduledDate.getTime())) {
      setErrorMsg("Please choose a valid date and time.");
      return;
    }

    const diffMinutes = (scheduledDate.getTime() - Date.now()) / (1000 * 60);
    if (diffMinutes < 10) {
      setErrorMsg("Advance scheduled rides must be set at least 15 minutes in the future. For immediate pickups, click 'Book Ride' above.");
      return;
    }

    try {
      setBookingLoading(true);
      const ride = await rideService.scheduleRide({
        pickup: pick,
        destination: dest,
        vehicleType,
        scheduledAt: scheduledDate.toISOString(),
      });

      setSuccessBooking(ride);
      fetchScheduledRides();
      setActiveSubView("list");
    } catch (err: any) {
      console.error("Failed to schedule ride", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to schedule ride. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Cancel ride handler
  const handleCancelRide = async (rideId: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled ride reservation?")) {
      return;
    }
    try {
      await rideService.cancelRide(rideId, "Cancelled by rider");
      fetchScheduledRides();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to cancel ride.");
    }
  };

  // Human-readable countdown
  const getRelativeCountdown = (dateStr?: string) => {
    if (!dateStr) return "Upcoming";
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    const diffMs = target - now;

    if (diffMs <= 0) {
      return "Dispatching now";
    }

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `In ${diffDays} day${diffDays > 1 ? "s" : ""} ${diffHours % 24} hr`;
    }
    if (diffHours > 0) {
      return `In ${diffHours} hr ${diffMins % 60} min`;
    }
    return `In ${diffMins} min${diffMins !== 1 ? "s" : ""}`;
  };

  const formatScheduledDate = (dateStr?: string) => {
    if (!dateStr) return "Upcoming Ride";
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();

    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) return `Today at ${timeStr}`;

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${timeStr}`;
    }

    return `${d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    })} at ${timeStr}`;
  };

  return (
    <div className="w-full flex flex-col gap-3">
      
      {/* Sub-navigation Switcher */}
      <div className="flex items-center justify-between p-1 bg-muted/60 border border-border rounded-xl">
        <button
          onClick={() => setActiveSubView("book")}
          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubView === "book"
              ? "bg-primary text-black shadow-xs font-black"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span>Schedule New Ride</span>
        </button>

        <button
          onClick={() => {
            setActiveSubView("list");
            fetchScheduledRides();
          }}
          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubView === "list"
              ? "bg-primary text-black shadow-xs font-black"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Reservations</span>
          {scheduledRides.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-black text-primary">
              {scheduledRides.length}
            </span>
          )}
        </button>
      </div>

      {/* Success banner after booking */}
      {successBooking && activeSubView === "list" && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-start gap-2.5 text-xs animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-emerald-300">Ride Scheduled Successfully!</span>
            <span>
              Your advance reservation for {formatScheduledDate(successBooking.scheduledAt)} has been confirmed. A captain will be pre-dispatched 15 minutes before your pickup.
            </span>
          </div>
        </div>
      )}

      {/* VIEW 1: SCHEDULE NEW RIDE WIZARD */}
      {activeSubView === "book" ? (
        <Card className="w-full bg-card border-border shadow-md rounded-2xl overflow-visible">
          <CardContent className="p-4 sm:p-5 space-y-4">
            
            {/* Header / Intro */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary text-black">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                    Schedule for Later
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Lock in your vehicle & price up to 7 days ahead
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("book")}
                className="text-xs text-primary font-bold hover:underline cursor-pointer"
              >
                Ride Now ➔
              </button>
            </div>

            {/* EDITABLE UNIFIED LOCATION CARD (MATCHING SECOND SCREENSHOT) */}
            <div className="rounded-2xl bg-[#262c37] border border-slate-700/80 p-3.5 sm:p-4 shadow-lg text-slate-100 relative">
              {/* PICKUP ROW */}
              <div className="relative" ref={pickupContainerRef}>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-500/25 shrink-0"></div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      PICKUP LOCATION
                    </span>

                    <div className="relative flex items-center justify-between gap-2 mt-0.5">
                      <input
                        type="text"
                        placeholder="Search pickup location or use GPS..."
                        className="w-full bg-transparent text-slate-100 font-extrabold text-sm sm:text-base placeholder-slate-400 outline-none border-none p-0 focus:ring-0"
                        value={pickupText}
                        onChange={(e) => {
                          setPickupText(e.target.value);
                          setShowPickupSuggestions(true);
                        }}
                        onFocus={() => setShowPickupSuggestions(true)}
                      />

                      <div className="flex items-center gap-1.5 shrink-0">
                        {pickupText && (
                          <button
                            type="button"
                            onClick={() => {
                              setPickupText("");
                              setPickup(null);
                            }}
                            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer"
                            title="Clear pickup"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          disabled={gpsLoading}
                          className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
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
                </div>

                {/* Pickup Suggestions Dropdown */}
                {showPickupSuggestions && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#1e232d] border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar p-1.5 text-slate-200">
                    {/* GPS Option */}
                    <button
                      type="button"
                      onMouseDown={handleUseCurrentLocation}
                      className="w-full text-left px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 flex items-center gap-2.5 transition-colors cursor-pointer mb-1"
                    >
                      <Crosshair className="w-4 h-4 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs sm:text-sm font-bold block">Use Current GPS Location</span>
                        <span className="text-[10px] text-slate-400">Accurate device coordinates</span>
                      </div>
                    </button>

                    {/* Google Autocomplete Predictions */}
                    {pickupPredictions.length > 0 ? (
                      <div>
                        {pickupPredictions.map((pred) => (
                          <button
                            key={pred.place_id}
                            type="button"
                            onMouseDown={() => handleSelectGooglePrediction(pred, "pickup")}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 flex items-start gap-2.5 transition-colors cursor-pointer"
                          >
                            <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-xs sm:text-sm font-bold text-white block truncate">
                                {pred.structured_formatting?.main_text || pred.description}
                              </span>
                              <span className="text-[11px] text-slate-400 block truncate">
                                {pred.structured_formatting?.secondary_text || ""}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : !pickupText.trim() ? (
                      /* Preset Hubs */
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <span>Popular Hubs</span>
                        </div>
                        {DEFAULT_POPULAR_HUBS.map((loc, idx) => (
                          <button
                            key={`pickup-preset-${idx}`}
                            type="button"
                            onMouseDown={() => handleSelectPreset(loc, "pickup")}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 flex items-start gap-2.5 transition-colors cursor-pointer"
                          >
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm font-bold text-white truncate">{loc.name}</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase">{loc.tag}</span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">{loc.address}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* HORIZONTAL DIVIDER */}
              <div className="border-t border-slate-600/50 my-3 ml-7"></div>

              {/* DESTINATION ROW */}
              <div className="relative" ref={destContainerRef}>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-4 h-4 rounded-full bg-rose-500 ring-4 ring-rose-500/25 shrink-0"></div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      DESTINATION
                    </span>

                    <div className="relative flex items-center justify-between gap-2 mt-0.5">
                      <input
                        type="text"
                        placeholder="Search destination or landmark..."
                        className="w-full bg-transparent text-slate-100 font-extrabold text-sm sm:text-base placeholder-slate-400 outline-none border-none p-0 focus:ring-0"
                        value={destText}
                        onChange={(e) => {
                          setDestText(e.target.value);
                          setShowDestSuggestions(true);
                        }}
                        onFocus={() => setShowDestSuggestions(true)}
                      />

                      <div className="flex items-center gap-1.5 shrink-0">
                        {destText && (
                          <button
                            type="button"
                            onClick={() => {
                              setDestText("");
                              setDestination(null);
                            }}
                            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer"
                            title="Clear destination"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="p-1.5 rounded-lg text-slate-400">
                          <Search className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Destination Suggestions Dropdown */}
                {showDestSuggestions && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#1e232d] border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar p-1.5 text-slate-200">
                    {destPredictions.length > 0 ? (
                      <div>
                        {destPredictions.map((pred) => (
                          <button
                            key={pred.place_id}
                            type="button"
                            onMouseDown={() => handleSelectGooglePrediction(pred, "dest")}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 flex items-start gap-2.5 transition-colors cursor-pointer"
                          >
                            <Navigation className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-xs sm:text-sm font-bold text-white block truncate">
                                {pred.structured_formatting?.main_text || pred.description}
                              </span>
                              <span className="text-[11px] text-slate-400 block truncate">
                                {pred.structured_formatting?.secondary_text || ""}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : !destText.trim() ? (
                      /* Preset Hubs */
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <span>Popular Destinations</span>
                        </div>
                        {DEFAULT_POPULAR_HUBS.map((loc, idx) => (
                          <button
                            key={`dest-preset-${idx}`}
                            type="button"
                            onMouseDown={() => handleSelectPreset(loc, "dest")}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 flex items-start gap-2.5 transition-colors cursor-pointer"
                          >
                            <Navigation className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm font-bold text-white truncate">{loc.name}</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase">{loc.tag}</span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">{loc.address}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Date & Time Selector */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Choose Departure Time</span>
                </label>
                <span className="text-[10px] text-muted-foreground">Min +15 mins</span>
              </div>

              {/* Quick Preset Chips */}
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => handleQuickPreset(1)}
                  className="py-1.5 px-2 rounded-lg bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-all cursor-pointer text-center"
                >
                  In 1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset(2)}
                  className="py-1.5 px-2 rounded-lg bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-all cursor-pointer text-center"
                >
                  In 2 Hours
                </button>
                <button
                  type="button"
                  onClick={handleTonightPreset}
                  className="py-1.5 px-2 rounded-lg bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-all cursor-pointer text-center"
                >
                  Tonight 8 PM
                </button>
                <button
                  type="button"
                  onClick={handleTomorrowMorningPreset}
                  className="py-1.5 px-2 rounded-lg bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-all cursor-pointer text-center"
                >
                  Tomorrow 9 AM
                </button>
              </div>

              {/* Custom Date-Time Picker Input */}
              <div className="relative">
                <input
                  type="datetime-local"
                  min={getMinDatetime()}
                  value={selectedDatetime}
                  onChange={(e) => setSelectedDatetime(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-muted/60 border border-border text-foreground font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                />
              </div>
            </div>

            {/* Vehicle Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Select Vehicle
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setVehicleType("BIKE")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                    vehicleType === "BIKE"
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border bg-background hover:bg-muted/50"
                  }`}
                >
                  <Bike className={`w-6 h-6 mb-1 ${vehicleType === "BIKE" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-extrabold text-foreground">Bike</span>
                  <span className="text-[10px] text-muted-foreground">Fastest</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVehicleType("AUTO")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                    vehicleType === "AUTO"
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border bg-background hover:bg-muted/50"
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl mb-0.5 text-primary">electric_rickshaw</span>
                  <span className="text-xs font-extrabold text-foreground">Auto</span>
                  <span className="text-[10px] text-muted-foreground">Economical</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVehicleType("CAB")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                    vehicleType === "CAB"
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border bg-background hover:bg-muted/50"
                  }`}
                >
                  <Car className={`w-6 h-6 mb-1 ${vehicleType === "CAB" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-extrabold text-foreground">Cab</span>
                  <span className="text-[10px] text-muted-foreground">Comfort</span>
                </button>
              </div>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Advance Dispatch Guarantee Badge */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Guaranteed matching starts 15 mins before departure with no surge surcharge.
              </span>
            </div>

            {/* CTA Button */}
            <Button
              className="w-full h-12 rounded-full text-sm sm:text-base font-black shadow-lg shadow-primary/20 cursor-pointer"
              disabled={bookingLoading}
              onClick={handleScheduleRide}
            >
              {bookingLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                `Confirm Scheduled ${vehicleType} ${fareEstimate ? `• ₹${fareEstimate}` : ""}`
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* VIEW 2: MY SCHEDULED RIDES QUEUE */
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
              Upcoming Reservations ({scheduledRides.length})
            </span>
            <button
              onClick={fetchScheduledRides}
              disabled={loadingList}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loadingList && scheduledRides.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-border flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs font-medium">Loading your scheduled rides...</span>
            </div>
          ) : scheduledRides.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-sm sm:text-base font-black text-foreground">
                  No Scheduled Rides
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  You don't have any advance bookings. Schedule a ride to ensure guaranteed on-time pickup.
                </p>
              </div>
              <Button
                onClick={() => setActiveSubView("book")}
                className="mt-1 rounded-full text-xs font-bold px-4 py-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Schedule a Ride Now
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {scheduledRides.map((ride) => (
                <div
                  key={ride.id}
                  className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col gap-3 hover:border-border/80 transition-all"
                >
                  {/* Top: Departure time & Countdown */}
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-primary text-black text-xs font-black">
                        {formatScheduledDate(ride.scheduledAt)}
                      </span>
                      {ride.status === "SEARCHING" ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                          <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>DISPATCHING NOW</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-muted text-foreground border border-border">
                          {getRelativeCountdown(ride.scheduledAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-muted-foreground uppercase">
                        {ride.vehicleType || "BIKE"}
                      </span>
                      <span className="text-sm sm:text-base font-black text-foreground">
                        ₹{ride.fare || ride.estimatedFare || 0}
                      </span>
                    </div>
                  </div>

                  {/* Route points */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <span className="text-foreground font-semibold line-clamp-1">
                        {ride.pickup?.name || ride.pickup?.address || "Pickup Point"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                      <span className="text-foreground font-semibold line-clamp-1">
                        {ride.destination?.name || ride.destination?.address || "Drop Point"}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        Status:{" "}
                        <strong
                          className={
                            ride.status === "SEARCHING"
                              ? "text-amber-400 uppercase font-black"
                              : "text-primary uppercase"
                          }
                        >
                          {ride.status === "SEARCHING" ? "SEARCHING FOR CAPTAIN" : ride.status}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {ride.status === "SEARCHING" && (
                        <button
                          onClick={() => {
                            setActiveRide(ride);
                            setActiveTab("book");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-primary hover:bg-amber-400 text-black text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          <span>Track Live Search</span>
                          <span className="text-xs font-bold">➔</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleCancelRide(ride.id)}
                        className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancel Reservation
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
