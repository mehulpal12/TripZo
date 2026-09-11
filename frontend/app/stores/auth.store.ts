import { create } from "zustand";
import Cookies from "js-cookie";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: "RIDER" | "CAPTAIN";
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  clearAuth: () => void;
  bootstrapSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setAuth: (user, token, refreshToken) => {
    Cookies.set("token", token, { expires: 7, secure: true, sameSite: "strict" });
    Cookies.set("refreshToken", refreshToken, { expires: 30, secure: true, sameSite: "strict" });
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  clearAuth: () => {
    Cookies.remove("token");
    Cookies.remove("refreshToken");
    localStorage.removeItem("user");
    set({ user: null, isAuthenticated: false });
  },
  bootstrapSession: () => {
    const token = Cookies.get("token");
    const userStr = localStorage.getItem("user");
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, isAuthenticated: true });
      } catch (error) {
        // invalid JSON
        set({ user: null, isAuthenticated: false });
      }
    } else {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
