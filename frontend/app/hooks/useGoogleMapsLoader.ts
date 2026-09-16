"use client";

import { useState, useEffect } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { GOOGLE_MAPS_LIBRARIES } from "@/config/maps";

// Module-level singleton state to prevent duplicate script injections
let loaderPromise: Promise<unknown> | null = null;
let isScriptLoaded = false;
let scriptLoadError: Error | null = null;

/**
 * Helper to check if Google Maps JS API and its core constructor classes are fully loaded.
 */
export function isGoogleMapsLoaded(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.google?.maps) &&
    typeof window.google.maps.Map === "function" &&
    typeof window.google.maps.Size === "function" &&
    typeof window.google.maps.Point === "function"
  );
}

/**
 * Robust, SSR-safe Google Maps JavaScript API loader hook.
 *
 * Guarantees:
 * 1. Never executes during SSR (returns { isLoaded: false, loadError: undefined }).
 * 2. If window.google.maps and core classes (Map, Size, Point) are already available, returns { isLoaded: true } immediately.
 * 3. Prevents "@googlemaps/js-api-loader" singleton conflicts by clearing Loader.instance
 *    before instantiation, preventing the "Loader must not be called again with different options" error.
 * 4. Shares a single loader promise across all mounting components.
 */
export function useGoogleMapsLoader(): {
  isLoaded: boolean;
  loadError: Error | undefined;
} {
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    return isGoogleMapsLoaded();
  });

  const [loadError, setLoadError] = useState<Error | undefined>(() => {
    return scriptLoadError || undefined;
  });

  useEffect(() => {
    // SSR guard
    if (typeof window === "undefined") return;

    // Check if google maps is already fully loaded on window
    if (isGoogleMapsLoaded()) {
      isScriptLoaded = true;
      setIsLoaded(true);
      return;
    }

    if (isScriptLoaded && isGoogleMapsLoaded()) {
      setIsLoaded(true);
      return;
    }

    if (scriptLoadError) {
      setLoadError(scriptLoadError);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

    if (!apiKey) {
      const err = new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not defined in environment variables");
      scriptLoadError = err;
      setLoadError(err);
      return;
    }

    // Check if the script tag is already in DOM and fully ready
    const existingScript = document.getElementById("google-map-script");
    if (existingScript && isGoogleMapsLoaded()) {
      isScriptLoaded = true;
      setIsLoaded(true);
      return;
    }

    if (!loaderPromise) {
      try {
        // Clear any previous Loader singleton instance that may hold conflicting options
        if ((Loader as unknown as { instance: unknown }).instance) {
          (Loader as unknown as { instance: unknown }).instance = null;
        }

        const loader = new Loader({
          id: "google-map-script",
          apiKey,
          libraries: GOOGLE_MAPS_LIBRARIES,
          version: "weekly",
        });

        loaderPromise = loader
          .load()
          .then((googleInstance) => {
            isScriptLoaded = true;
            return googleInstance;
          })
          .catch((err) => {
            scriptLoadError = err instanceof Error ? err : new Error(String(err));
            loaderPromise = null; // Allow retry on subsequent calls
            throw scriptLoadError;
          });
      } catch (instantiationErr) {
        // In case of constructor error, reset instance and rethrow
        (Loader as unknown as { instance: unknown }).instance = null;
        const err = instantiationErr instanceof Error ? instantiationErr : new Error(String(instantiationErr));
        scriptLoadError = err;
        setLoadError(err);
        return;
      }
    }

    let isMounted = true;

    loaderPromise
      .then(() => {
        if (!isMounted) return;
        if (isGoogleMapsLoaded()) {
          setIsLoaded(true);
        } else {
          // Poll briefly in case Google Maps initializes constructor prototypes on the next tick
          const start = Date.now();
          const timer = setInterval(() => {
            if (isGoogleMapsLoaded()) {
              clearInterval(timer);
              if (isMounted) setIsLoaded(true);
            } else if (Date.now() - start > 4000) {
              clearInterval(timer);
              if (isMounted) {
                setLoadError(new Error("Google Maps script loaded but core classes were not found"));
              }
            }
          }, 50);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const formattedErr = err instanceof Error ? err : new Error(String(err));
          setLoadError(formattedErr);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { isLoaded, loadError };
}
