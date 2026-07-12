import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SeatmapService, ZoneUpdatePayload } from './seatmap.service';

interface SocketServerWithAdapter {
  adapter?: {
    rooms?: {
      get(key: string): { size: number } | undefined;
    };
  };
  sockets?: {
    adapter?: {
      rooms?: {
        get(key: string): { size: number } | undefined;
      };
    };
  };
}

@WebSocketGateway({
  namespace: 'concerts',
  cors: { origin: '*' },
})
export class SeatmapGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SeatmapGateway.name);

  constructor(private readonly seatmapService: SeatmapService) {}

  afterInit() {
    this.logger.log('SeatmapGateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /**
   * Client subscribes to real-time seatmap updates for a specific concert.
   * Joins the room: "concert:{concertId}:seatmap"
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { concertId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `concert:${data.concertId}:seatmap`;
    void client.join(room);
    const serverRef = this.server as unknown as SocketServerWithAdapter;
    const adapter = serverRef.adapter || serverRef.sockets?.adapter;
    const roomInfo = adapter?.rooms?.get(room);
    const size = roomInfo ? roomInfo.size : 0;
    this.logger.debug(
      `Client ${client.id} joined room ${room} (total in room: ${size})`,
    );
    return { event: 'subscribed', data: { concertId: data.concertId } };
  }

  /**
   * Client unsubscribes from seatmap updates.
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { concertId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `concert:${data.concertId}:seatmap`;
    void client.leave(room);
    return { event: 'unsubscribed', data: { concertId: data.concertId } };
  }

  /**
   * Called by SeatmapService after a zone availability change.
   * Broadcasts to all clients subscribed to this concert's seatmap.
   */
  broadcastZoneUpdate(concertId: string, payload: ZoneUpdatePayload) {
    const room = `concert:${concertId}:seatmap`;
    this.server.to(room).emit('zone_status_update', {
      type: 'zone_status_update',
      updates: [payload],
    });
    this.logger.debug(
      `Broadcast zone update to room ${room}: ${payload.ticketTypeId} ${payload.oldStatus} → ${payload.newStatus}`,
    );
  }
}
