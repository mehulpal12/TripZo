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
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== "undefined") {
      originalRequest._retry = true;
      try {
        const refreshToken = Cookies.get("refreshToken");
        if (refreshToken) {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/";
          const response = await axios.post(`${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}auth/refresh`, {
            refreshToken
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          
          Cookies.set("token", accessToken, { expires: 7, sameSite: "strict" });
          Cookies.set("refreshToken", newRefreshToken, { expires: 30, sameSite: "strict" });
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        Cookies.remove("token");
        Cookies.remove("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    // Normalizing error to AppError format
    const normalizedError = {
      message: error.response?.data?.error?.message || error.response?.data?.message || error.message || "An unexpected error occurred",
      code: error.response?.data?.error?.code || "UNKNOWN_ERROR",
      status: error.response?.status || 500,
    };
    return Promise.reject(normalizedError);
  }
);
