import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer;

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*", // Adjust in production
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected to socket:", socket.id);
    
    // Support room joining based on branch
    socket.on("join_branch", ({ branchId }) => {
      if (branchId) {
        socket.join(branchId);
        console.log(`Socket ${socket.id} joined branch room: ${branchId}`);
      }
    });

    socket.on("join", ({ branchId }) => {
      if (branchId) {
        socket.join(branchId);
        console.log(`Socket ${socket.id} joined branch room via 'join': ${branchId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export const emitEvent = (event: string, data: any, branchId?: string) => {
  if (io) {
    if (branchId) {
      io.to(branchId).emit(event, data);
    } else {
      io.emit(event, data);
    }
  }
};
