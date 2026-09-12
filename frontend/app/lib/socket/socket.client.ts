import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";

class SocketClient {
  private socket: Socket | null = null;
  private url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

  connect() {
    if (this.socket?.connected) return this.socket;

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
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }
}

export const socketClient = new SocketClient();
