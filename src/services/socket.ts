import { io } from 'socket.io-client';
import { BACKEND_URL } from '@/config';

// use relative path which will be proxied during development
const SOCKET_URL = import.meta.env.DEV 
  ? '/' 
  : BACKEND_URL;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});
