import { apiClient } from "./client";

export interface RegisterDTO {
  email: string;
  password: string;
  role: "RIDER" | "CAPTAIN";
  name?: string;
  phone?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export const authService = {
  register: async (data: RegisterDTO) => {
    const response = await apiClient.post("/auth/register", data);
    return response.data; // { user, tokens: { access, refresh } }
  },

  login: async (data: LoginDTO) => {
    const response = await apiClient.post("/auth/login", data);
    return response.data; // { user, tokens: { access, refresh } }
  },

  refresh: async (refreshToken: string) => {
    const response = await apiClient.post("/auth/refresh", { refreshToken });
    return response.data; // { tokens: { access, refresh } }
  },

  logout: async () => {
    const response = await apiClient.post("/auth/logout");
    return response.data;
  },
};
