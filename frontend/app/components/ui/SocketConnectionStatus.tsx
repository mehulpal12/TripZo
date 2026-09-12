"use client";

import { useSocketStore } from "@/stores/socket.store";
import { useEffect, useState } from "react";

export function SocketConnectionStatus() {
  const { isConnected, isReconnecting } = useSocketStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show banner if not connected or if reconnecting
    // Delay slightly to prevent flicker on initial fast connect
    const timer = setTimeout(() => {
      setShow(!isConnected || isReconnecting);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isConnected, isReconnecting]);

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-50 flex justify-center mt-2 pointer-events-none">
      <div className="bg-rose-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold flex items-center gap-2 pointer-events-auto">
        <span className="material-symbols-outlined text-sm animate-spin">
          {isReconnecting ? 'sync' : 'cloud_off'}
        </span>
        {isReconnecting ? 'Reconnecting to live server...' : 'Offline - Connecting to network'}
      </div>
    </div>
  );
}
