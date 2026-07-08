import { io, type Socket } from 'socket.io-client';
import { getPublicBackendApiUrl } from '@/lib/backend-client-url';
import type { SocketZoneStatusUpdate } from '@/lib/seatmap-data';

export interface ZoneStatusSocketMessage {
  type: 'zone_status_update';
  updates: SocketZoneStatusUpdate[];
}

export interface SeatmapSocketHandlers {
  onZoneUpdate: (updates: SocketZoneStatusUpdate[]) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function connectSeatmapSocket(
  concertId: string,
  handlers: SeatmapSocketHandlers,
): Socket {
  const socket = io(`${getPublicBackendApiUrl()}/concerts`, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  const handleZoneUpdate = (payload: ZoneStatusSocketMessage) => {
    if (!payload?.updates?.length) return;
    handlers.onZoneUpdate(payload.updates);
  };

  socket.on('connect', () => {
    socket.emit('subscribe', { concertId });
    handlers.onConnect?.();
  });

  socket.on('disconnect', () => {
    handlers.onDisconnect?.();
  });

  socket.on('zone_status_update', handleZoneUpdate);

  return socket;
}

export function disconnectSeatmapSocket(socket: Socket, concertId: string): void {
  socket.emit('unsubscribe', { concertId });
  socket.off('zone_status_update');
  socket.disconnect();
}
