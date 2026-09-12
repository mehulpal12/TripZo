"use client";

import { useNetwork } from "@/hooks/useNetwork";
import { WifiOff } from "lucide-react";

export function NetworkStatus() {
  const { isOnline } = useNetwork();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[100] bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top-full duration-300">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-bold tracking-wide">No Internet Connection. Please check your network.</span>
    </div>
  );
}
