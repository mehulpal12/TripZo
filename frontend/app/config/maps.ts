import type { Libraries } from "@react-google-maps/api";

// Define libraries outside components to avoid react-google-maps re-mount re-renders
export const GOOGLE_MAPS_LIBRARIES: Libraries = ["places"];
