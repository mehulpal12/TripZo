import axios from "axios";
import Cookies from "js-cookie";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = Cookies.get("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalizing error to AppError format
    const normalizedError = {
      message: error.response?.data?.error?.message || error.message || "An unexpected error occurred",
      code: error.response?.data?.error?.code || "UNKNOWN_ERROR",
      status: error.response?.status || 500,
    };
    return Promise.reject(normalizedError);
  }
);
