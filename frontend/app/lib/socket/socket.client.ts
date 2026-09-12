import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { useSocketStore } from "@/stores/socket.store";

class SocketClient {
  private socket: Socket | null = null;
  private url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

  connect() {
    if (this.socket) return this.socket;

    const token = Cookies.get("token");
    if (!token) {
      console.error("Socket connection failed: No token found");
      return null;
    }

    this.socket = io(this.url, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
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
