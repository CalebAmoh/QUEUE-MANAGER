"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvent = exports.getIo = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
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
exports.initSocket = initSocket;
const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
exports.getIo = getIo;
const emitEvent = (event, data, branchId) => {
    if (io) {
        if (branchId) {
            io.to(branchId).emit(event, data);
        }
        else {
            io.emit(event, data);
        }
    }
};
exports.emitEvent = emitEvent;
//# sourceMappingURL=socket.js.map