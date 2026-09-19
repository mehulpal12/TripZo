import type { NextConfig } from "next";
import os from "os";

function getAllowedDevOrigins(): string[] {
  const origins = new Set<string>([
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "*.local",
    "*.lan",
  ]);

  const interfaces = os.networkInterfaces();
  for (const interfaceList of Object.values(interfaces)) {
    if (!interfaceList) continue;
    for (const iface of interfaceList) {
      if (iface.family === "IPv4" && !iface.internal) {
        origins.add(iface.address);

        // Also add the entire /24 subnet for the local network interface
        const parts = iface.address.split(".");
        if (parts.length === 4) {
          const prefix = `${parts[0]}.${parts[1]}.${parts[2]}.`;
          for (let i = 1; i <= 254; i++) {
            origins.add(`${prefix}${i}`);
          }
        }
      }
    }
  }

  // Fallback for current IP
  origins.add("192.168.1.42");

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: getAllowedDevOrigins(),
};

export default nextConfig;

