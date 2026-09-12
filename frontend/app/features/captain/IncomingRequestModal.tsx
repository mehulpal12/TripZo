"use client";

import { useEffect, useState } from "react";
import { useCaptainStore } from "@/stores/captain.store";
import { captainService } from "@/lib/api/captain.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Loader2 } from "lucide-react";

export function IncomingRequestModal() {
  const { activeRequest, setActiveRequest, setActiveRide } = useCaptainStore();
  const [timeLeft, setTimeLeft] = useState(15);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeRequest) {
      setTimeLeft(15);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setActiveRequest(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeRequest, setActiveRequest]);

  if (!activeRequest) return null;

  const handleAccept = async () => {
    try {
      setLoading(true);
      const res = await captainService.acceptRide(activeRequest.id);
      setActiveRide(res.ride); // Handle depending on exact API response wrapper
      setActiveRequest(null);
    } catch (error) {
      console.error("Failed to accept ride", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    setActiveRequest(null);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center p-4 bg-background/20 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-card border-primary/50 shadow-[0_0_40px_rgba(0,242,254,0.3)] rounded-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-heading font-bold text-foreground">New Ride Request</h3>
              <p className="text-muted-foreground text-sm">Accept within {timeLeft}s</p>
            </div>
            <div className="text-2xl font-bold text-primary">
              ₹{activeRequest.fare}
            </div>
          </div>

          <div className="space-y-4 mb-6 relative">
            <div className="absolute left-[11px] top-[24px] bottom-[24px] w-0.5 bg-muted z-0"></div>
            
            <div className="relative z-10 flex items-start space-x-3">
              <div className="bg-background rounded-full p-1.5 border border-border mt-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Pickup</p>
                <p className="text-sm font-semibold">{activeRequest.pickup.address || "Unknown Location"}</p>
              </div>
            </div>
            
            <div className="relative z-10 flex items-start space-x-3">
              <div className="bg-background rounded-full p-1.5 border border-border mt-1">
                <Navigation className="w-3.5 h-3.5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Dropoff</p>
                <p className="text-sm font-semibold">{activeRequest.destination.address || "Unknown Location"}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 h-12 rounded-xl text-muted-foreground border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              onClick={handleReject}
              disabled={loading}
            >
              Reject
            </Button>
            <Button 
              className="flex-[2] h-12 rounded-xl font-bold shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:shadow-[0_0_25px_rgba(0,242,254,0.5)] transition-all"
              onClick={handleAccept}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Accept Ride"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
