import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface ScriptProgressEvent {
  batchId: string;
  scriptId: string;
  status: 'generating' | 'completed' | 'failed';
  completedCount: number;
  generatingCount: number;
  totalCount: number;
  progress: number;
}

export interface BatchCompletedEvent {
  batchId: string;
  projectId: string;
  totalScripts: number;
  completedScripts: number;
  failedScripts: number;
}

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_BASE_URL || 'http://localhost:3233',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  // Track which clients are subscribed to which batches
  private batchSubscriptions = new Map<string, Set<string>>(); // batchId -> Set<socketId>

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up subscriptions for this client
    for (const [batchId, sockets] of this.batchSubscriptions.entries()) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.batchSubscriptions.delete(batchId);
      }
    }
  }

  /**
   * Subscribe a client to batch updates
   */
  subscribeToBatch(clientId: string, batchId: string) {
    if (!this.batchSubscriptions.has(batchId)) {
      this.batchSubscriptions.set(batchId, new Set());
    }
    this.batchSubscriptions.get(batchId)!.add(clientId);
    this.logger.debug(`Client ${clientId} subscribed to batch ${batchId}`);
  }

  /**
   * Unsubscribe a client from batch updates
   */
  unsubscribeFromBatch(clientId: string, batchId: string) {
    const sockets = this.batchSubscriptions.get(batchId);
    if (sockets) {
      sockets.delete(clientId);
      if (sockets.size === 0) {
        this.batchSubscriptions.delete(batchId);
      }
    }
  }

  /**
   * Emit script progress event to all clients watching this batch
   */
  emitScriptProgress(event: ScriptProgressEvent) {
    this.server.emit(`batch:${event.batchId}:progress`, event);
    this.logger.debug(`Emitted progress for batch ${event.batchId}: ${event.progress}%`);
  }

  /**
   * Emit batch completed event
   */
  emitBatchCompleted(event: BatchCompletedEvent) {
    this.server.emit(`batch:${event.batchId}:completed`, event);
    this.logger.log(`Batch ${event.batchId} completed: ${event.completedScripts}/${event.totalScripts} scripts`);
  }
}
