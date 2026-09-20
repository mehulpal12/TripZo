import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { useSocketStore } from "@/stores/socket.store";

export const getBaseSocketUrl = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
      if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
        return envUrl.replace(/\/$/, "");
      }
      const protocol = window.location.protocol;
      return `${protocol}//${hostname}:4000`;
    }
  }
  return (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000").replace(/\/$/, "");
};

class SocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (this.socket && token) {
      this.socket.auth = { token };
    }
  }

  connect(explicitToken?: string) {
    if (typeof window === "undefined") return null;
    if (explicitToken) this.token = explicitToken;
    if (this.socket) return this.socket;

    const socketUrl = getBaseSocketUrl();
    const token = this.token || Cookies.get("token");

    this.socket = io(socketUrl, {
      auth: token ? { token } : undefined,
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      useSocketStore.getState().setConnected(true);
    });

    this.socket.on("disconnect", () => {
      useSocketStore.getState().setConnected(false);
    });

    this.socket.io.on("reconnect_attempt", () => {
      useSocketStore.getState().setReconnecting(true);
      const currentToken = this.token || Cookies.get("token");
      if (currentToken && this.socket) {
        this.socket.auth = { token: currentToken };
      }
    });

    this.socket.on("connect_error", () => {
      useSocketStore.getState().setConnected(false);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      useSocketStore.getState().setConnected(false);
    }
  }

  getSocket() {
    return this.socket;
  }
}

export const socketClient = new SocketClient();
