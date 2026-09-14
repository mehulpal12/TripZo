"use client";

import { useState, useEffect } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { GOOGLE_MAPS_LIBRARIES } from "@/config/maps";

// Module-level singleton state to prevent duplicate script injections
let loaderPromise: Promise<unknown> | null = null;
let isScriptLoaded = false;
let scriptLoadError: Error | null = null;

/**
 * Robust, SSR-safe Google Maps JavaScript API loader hook.
 *
 * Guarantees:
 * 1. Never executes during SSR (returns { isLoaded: false, loadError: undefined }).
 * 2. If window.google.maps is already available, returns { isLoaded: true } immediately.
 * 3. Prevents "@googlemaps/js-api-loader" singleton conflicts by clearing Loader.instance
 *    before instantiation, preventing the "Loader must not be called again with different options" error.
 * 4. Shares a single loader promise across all mounting components.
 */
export function useGoogleMapsLoader(): {
  isLoaded: boolean;
  loadError: Error | undefined;
} {
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.google?.maps);
  });

  const [loadError, setLoadError] = useState<Error | undefined>(() => {
    return scriptLoadError || undefined;
  });

  useEffect(() => {
    // SSR guard
    if (typeof window === "undefined") return;

    // Check if google maps is already loaded on window
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    if (isScriptLoaded) {
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

    // Check if the script tag is already in DOM
    const existingScript = document.getElementById("google-map-script");
    if (existingScript && window.google?.maps) {
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
        if (isMounted) {
          setIsLoaded(true);
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
