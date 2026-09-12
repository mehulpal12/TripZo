"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRideStore } from "@/stores/ride.store";
import { rideService } from "@/lib/api/ride.service";
import { MapPin, Navigation, Bike, Car, Loader2 } from "lucide-react";

export function BookingPanel() {
  const { pickup, destination, setPickup, setDestination, vehicleType, setVehicleType, activeRide, setActiveRide } = useRideStore();
  const [loading, setLoading] = useState(false);
  const [fareEstimate, setFareEstimate] = useState<number | null>(null);

  // Hardcoded for demo purposes since we don't have Places API hooked up
  const handleSelectPickup = () => {
    setPickup({ lat: 28.7041, lng: 77.1025, address: "Delhi Center" });
  };

  const handleSelectDestination = () => {
    setDestination({ lat: 28.5355, lng: 77.3910, address: "Noida Sector 62" });
    fetchFare();
  };

  const fetchFare = async () => {
    if (!pickup) return;
    try {
      setLoading(true);
      const res = await rideService.getFareEstimate({
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        destinationLat: 28.5355,
        destinationLng: 77.3910,
        vehicleType
      });
      setFareEstimate(res.estimatedFare);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async () => {
    if (!pickup || !destination) return;
    try {
      setLoading(true);
      const ride = await rideService.createRide({
        pickup,
        destination,
        vehicleType
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
      <Card className="w-full bg-card border-border shadow-md overflow-hidden rounded-2xl">
        <CardContent className="p-5 space-y-5">
        
        {/* Location Inputs */}
        <div className="space-y-3 relative">
          <div className="absolute left-4 top-[24px] bottom-[24px] w-0.5 bg-muted z-0"></div>
          
          <div className="relative z-10 flex items-center space-x-3">
            <div className="bg-background rounded-full p-2 border border-border shadow-sm">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <Input 
              placeholder="Pickup Location" 
              className="border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary h-12 text-base font-medium"
              value={pickup?.address || ""}
              onClick={handleSelectPickup}
              readOnly
            />
          </div>
          
          <div className="relative z-10 flex items-center space-x-3">
            <div className="bg-background rounded-full p-2 border border-border shadow-sm">
              <Navigation className="w-4 h-4 text-accent" />
            </div>
            <Input 
              placeholder="Where to?" 
              className="border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-accent h-12 text-base font-medium"
              value={destination?.address || ""}
              onClick={handleSelectDestination}
              readOnly
            />
          </div>
        </div>

        {/* Vehicle Selection */}
        {pickup && destination && (
          <div className="flex space-x-3 pt-2 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => { setVehicleType("BIKE"); fetchFare(); }}
              className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${vehicleType === "BIKE" ? "border-primary bg-primary/10" : "border-border bg-background"}`}
            >
              <Bike className={`w-8 h-8 mb-2 ${vehicleType === "BIKE" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-bold">Bike</span>
            </button>
            <button 
              onClick={() => { setVehicleType("CAB"); fetchFare(); }}
              className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${vehicleType === "CAB" ? "border-primary bg-primary/10" : "border-border bg-background"}`}
            >
              <Car className={`w-8 h-8 mb-2 ${vehicleType === "CAB" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-bold">Cab</span>
            </button>
          </div>
        )}

        {/* Action Button */}
        {pickup && destination ? (
          <Button 
            className="w-full h-14 rounded-full text-lg font-bold shadow-lg shadow-primary/20"
            disabled={loading}
            onClick={handleBookRide}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `Book ${vehicleType} ${fareEstimate ? `• ₹${fareEstimate}` : ''}`}
          </Button>
        ) : (
          <Button className="w-full h-14 rounded-full text-lg font-bold bg-muted text-muted-foreground hover:bg-muted" disabled>
            Select Locations
          </Button>
        )}

      </CardContent>
    </Card>
    </div>
  );
}
