import axios from "axios";
import Cookies from "js-cookie";

export const getBaseApiUrl = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // When accessed via LAN IP or mobile device (not localhost/127.0.0.1)
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      const envUrl = process.env.NEXT_PUBLIC_API_URL;
      // If user specified an explicit production URL (not localhost), use it
      if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
        return envUrl.endsWith("/") ? envUrl : `${envUrl}/`;
      }
      // Otherwise dynamically connect to the same host on port 4000
      const protocol = window.location.protocol;
      return `${protocol}//${hostname}:4000/`;
    }
  }
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/";
  return base.endsWith("/") ? base : `${base}/`;
};

export const apiClient = axios.create({
  baseURL: getBaseApiUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    config.baseURL = getBaseApiUrl();
    const token = Cookies.get("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints (login/register/refresh)
    const isAuthEndpoint =
      originalRequest?.url?.includes("auth/login") ||
      originalRequest?.url?.includes("auth/register") ||
      originalRequest?.url?.includes("auth/refresh");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint && typeof window !== "undefined") {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = Cookies.get("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const baseUrl = getBaseApiUrl();
        const response = await axios.post(`${baseUrl}auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        Cookies.set("token", accessToken, { expires: 7, sameSite: "strict" });
        if (newRefreshToken) {
          Cookies.set("refreshToken", newRefreshToken, { expires: 30, sameSite: "strict" });
        }

        apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        Cookies.remove("token");
        Cookies.remove("refreshToken");
        localStorage.removeItem("user");

        if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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
