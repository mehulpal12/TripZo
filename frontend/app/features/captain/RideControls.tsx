"use client";

import { useState } from "react";
import { useCaptainStore } from "@/stores/captain.store";
import { captainService } from "@/lib/api/captain.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function RideControls() {
  const { activeRide, setActiveRide } = useCaptainStore();
  const [loading, setLoading] = useState(false);

  if (!activeRide) return null;

  const handleAction = async (action: 'arrived' | 'start' | 'complete') => {
    try {
      setLoading(true);
      let res;
      if (action === 'arrived') {
        res = await captainService.updateRideStatus(activeRide.id, 'CAPTAIN_ARRIVED');
      } else if (action === 'start') {
        res = await captainService.updateRideStatus(activeRide.id, 'IN_PROGRESS');
      } else if (action === 'complete') {
        res = await captainService.updateRideStatus(activeRide.id, 'COMPLETED');
      }
      
      const updatedRide = res?.ride || res?.data;
      if (updatedRide) {
        if (action === 'complete') {
          setActiveRide(null); // Clear ride when done
        } else {
          setActiveRide(updatedRide);
        }
      }
    } catch (err) {
      console.error("Failed to perform action", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-center">
      <Card className="w-full max-w-md bg-card border-border shadow-lg">
        <CardContent className="p-4 flex flex-col items-center">
          <div className="mb-4 text-center">
            <h3 className="text-lg font-bold">
              Ride Status: {activeRide.status.replace(/_/g, ' ')}
            </h3>
            <p className="text-sm text-muted-foreground">
              Rider ID: {activeRide.riderId.substring(0, 8)}...
            </p>
          </div>
          
          <div className="w-full flex gap-3">
            {activeRide.status === "CAPTAIN_ASSIGNED" && (
              <Button 
                className="w-full h-12"
                onClick={() => handleAction('arrived')}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "I've Arrived"}
              </Button>
            )}
            
            {(activeRide.status === "CAPTAIN_ARRIVED" || activeRide.status === "CAPTAIN_ARRIVING") && (
              <Button 
                className="w-full h-12"
                onClick={() => handleAction('start')}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Ride"}
              </Button>
            )}
            
            {activeRide.status === "IN_PROGRESS" && (
              <Button 
                className="w-full h-12"
                onClick={() => handleAction('complete')}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Ride"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
