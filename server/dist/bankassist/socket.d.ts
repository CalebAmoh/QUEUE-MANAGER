import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
export declare const initSocket: (server: HttpServer) => SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const getIo: () => SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const emitEvent: (event: string, data: any, branchId?: string) => void;
//# sourceMappingURL=socket.d.ts.map