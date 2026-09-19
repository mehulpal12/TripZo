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

  connect() {
    if (typeof window === "undefined") return null;
    if (this.socket) return this.socket;

    const token = Cookies.get("token");
    if (!token) {
      console.error("Socket connection failed: No token found");
      return null;
    }

    const socketUrl = getBaseSocketUrl();

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      useSocketStore.getState().setConnected(true);
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
      useSocketStore.getState().setConnected(false);
    });

    this.socket.io.on("reconnect_attempt", () => {
      useSocketStore.getState().setReconnecting(true);
      const currentToken = Cookies.get("token");
      if (currentToken && this.socket) {
        this.socket.auth = { token: currentToken };
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
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
