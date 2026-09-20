import { create } from "zustand";
import Cookies from "js-cookie";
import { apiClient } from "@/lib/api/client";
import { socketClient } from "@/lib/socket/socket.client";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: "RIDER" | "CAPTAIN";
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token?: string, refreshToken?: string) => void;
  clearAuth: () => void;
  bootstrapSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  setAuth: (user, token) => {
    // Keep refresh token strictly in HttpOnly cookie; set short-lived token cookie on frontend domain for Next.js proxy route protection
    if (token) {
      Cookies.set("token", token, { sameSite: "lax", secure: window.location.protocol === "https:", expires: 1 });
      socketClient.setToken(token);
    }
    Cookies.remove("refreshToken");
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(user));
    }
    set({ user, isAuthenticated: true });
  },
  clearAuth: () => {
    Cookies.remove("token");
    Cookies.remove("refreshToken");
    socketClient.disconnect();
    socketClient.setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
    }
    set({ user: null, isAuthenticated: false });
  },
  bootstrapSession: async () => {
    if (typeof window === "undefined") return;

    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, isAuthenticated: true });

        // Asynchronously verify that the server-side HttpOnly cookie session is still valid
        try {
          const response = await apiClient.get("/auth/me");
          if (response.data?.data?.user) {
            const serverUser = response.data.data.user;
            localStorage.setItem("user", JSON.stringify(serverUser));
            set({ user: serverUser, isAuthenticated: true });
          }
        } catch (err: any) {
          if (err.status === 401) {
            get().clearAuth();
          }
        }
      } catch {
        get().clearAuth();
      }
    } else {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
