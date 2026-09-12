"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Boundary caught an error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="flex flex-col items-center max-w-md text-center gap-6 p-8 rounded-3xl bg-card border border-border shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-foreground tracking-tight">Something went wrong!</h2>
          <p className="text-sm text-muted-foreground">
            We encountered an unexpected error. Please try again or contact support if the issue persists.
          </p>
        </div>

        <div className="flex w-full gap-3 mt-2">
          <Button 
            className="flex-1 h-12 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => reset()}
          >
            Try Again
          </Button>
          <Button 
            variant="outline"
            className="flex-1 h-12 rounded-xl text-base font-bold"
            onClick={() => window.location.href = '/'}
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
