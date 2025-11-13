import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FcmService } from '../../application/services/fcm.service';

interface DeviceInfo {
  deviceId: string;
  platform: string;
  userAgent?: string;
  connectedAt: Date;
  lastActivity: Date;
}

interface DeviceMessage {
  fromDeviceId: string;
  toDeviceId?: string; // undefined = broadcast to all devices
  type: 'sync' | 'command' | 'data' | 'notification';
  payload: any;
  timestamp: Date;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/device-sync',
})
export class DeviceSyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DeviceSyncGateway.name);

  // Map userId -> Map deviceId -> socket
  private userDevices = new Map<string, Map<string, Socket>>();
  // Map socketId -> userId
  private socketUsers = new Map<string, string>();
  // Map socketId -> deviceId
  private socketDevices = new Map<string, string>();
  // Map userId -> device info
  private deviceRegistry = new Map<string, Map<string, DeviceInfo>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly fcmService: FcmService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token;
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub || payload.userId;
      const deviceId = client.handshake.auth.deviceId || client.handshake.query.deviceId;

      if (!userId || !deviceId) {
        this.logger.warn(`Connection rejected: Missing userId or deviceId`);
        client.disconnect();
        return;
      }

      // Register device
      this.registerDevice(userId, deviceId, client);

      this.logger.log(`Device connected: ${userId}:${deviceId} (${client.id})`);

      // Notify other devices about new connection
      this.broadcastToOtherDevices(userId, deviceId, 'device_connected', {
        deviceId,
        connectedAt: new Date(),
      });

      // Send list of active devices to newly connected device
      const activeDevices = this.getActiveDevices(userId);
      client.emit('active_devices', activeDevices);
    } catch (error) {
      this.logger.error(`Connection failed:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    const deviceId = this.socketDevices.get(client.id);

    if (userId && deviceId) {
      this.unregisterDevice(userId, deviceId);

      this.logger.log(`Device disconnected: ${userId}:${deviceId} (${client.id})`);

      // Notify other devices about disconnection
      this.broadcastToOtherDevices(userId, deviceId, 'device_disconnected', {
        deviceId,
        disconnectedAt: new Date(),
      });
    }
  }

  @SubscribeMessage('device_message')
  handleDeviceMessage(@MessageBody() data: DeviceMessage, @ConnectedSocket() client: Socket) {
    const userId = this.socketUsers.get(client.id);
    const fromDeviceId = this.socketDevices.get(client.id);

    if (!userId || !fromDeviceId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    data.fromDeviceId = fromDeviceId;
    data.timestamp = new Date();

    if (data.toDeviceId) {
      // Send to specific device
      this.sendToDevice(userId, data.toDeviceId, 'device_message', data);
    } else {
      // Broadcast to all other devices
      this.broadcastToOtherDevices(userId, fromDeviceId, 'device_message', data);
    }

    // Acknowledge message
    client.emit('message_sent', { messageId: data.timestamp.getTime() });
  }

  @SubscribeMessage('sync_request')
  handleSyncRequest(
    @MessageBody() data: { syncType: string; lastSync?: Date },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.socketUsers.get(client.id);
    const deviceId = this.socketDevices.get(client.id);

    if (!userId || !deviceId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    this.logger.log(`Sync request from ${userId}:${deviceId} - ${data.syncType}`);

    // Broadcast sync request to other devices
    this.broadcastToOtherDevices(userId, deviceId, 'sync_request', {
      fromDeviceId: deviceId,
      syncType: data.syncType,
      lastSync: data.lastSync,
    });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const userId = this.socketUsers.get(client.id);
    const deviceId = this.socketDevices.get(client.id);

    if (userId && deviceId) {
      // Update last activity
      const userDevices = this.deviceRegistry.get(userId);
      if (userDevices) {
        const deviceInfo = userDevices.get(deviceId);
        if (deviceInfo) {
          deviceInfo.lastActivity = new Date();
        }
      }
    }

    client.emit('pong', { timestamp: new Date() });
  }

  private registerDevice(userId: string, deviceId: string, socket: Socket) {
    // Initialize user devices map if not exists
    if (!this.userDevices.has(userId)) {
      this.userDevices.set(userId, new Map());
    }

    // Store socket reference
    this.userDevices.get(userId)!.set(deviceId, socket);
    this.socketUsers.set(socket.id, userId);
    this.socketDevices.set(socket.id, deviceId);

    // Register device info
    if (!this.deviceRegistry.has(userId)) {
      this.deviceRegistry.set(userId, new Map());
    }

    const deviceInfo: DeviceInfo = {
      deviceId,
      platform: socket.handshake.auth.platform || 'unknown',
      userAgent: socket.handshake.headers['user-agent'],
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.deviceRegistry.get(userId)!.set(deviceId, deviceInfo);
  }

  private unregisterDevice(userId: string, deviceId: string) {
    const userSockets = this.userDevices.get(userId);
    if (userSockets) {
      userSockets.delete(deviceId);
      if (userSockets.size === 0) {
        this.userDevices.delete(userId);
      }
    }

    // Remove from socket mappings
    const socketId = Array.from(this.socketUsers.entries()).find(([_, uid]) => uid === userId)?.[0];

    if (socketId) {
      this.socketUsers.delete(socketId);
      this.socketDevices.delete(socketId);
    }

    // Remove from device registry
    const userDevices = this.deviceRegistry.get(userId);
    if (userDevices) {
      userDevices.delete(deviceId);
      if (userDevices.size === 0) {
        this.deviceRegistry.delete(userId);
      }
    }
  }

  private sendToDevice(userId: string, deviceId: string, event: string, data: any) {
    const userSockets = this.userDevices.get(userId);
    if (userSockets) {
      const socket = userSockets.get(deviceId);
      if (socket) {
        socket.emit(event, data);
        return true;
      }
    }
    return false;
  }

  private broadcastToOtherDevices(
    userId: string,
    excludeDeviceId: string,
    event: string,
    data: any,
  ) {
    const userSockets = this.userDevices.get(userId);
    if (userSockets) {
      userSockets.forEach((socket, deviceId) => {
        if (deviceId !== excludeDeviceId) {
          socket.emit(event, data);
        }
      });
    }
  }

  private getActiveDevices(userId: string): DeviceInfo[] {
    const userDevices = this.deviceRegistry.get(userId);
    if (!userDevices) return [];

    return Array.from(userDevices.values()).filter((device) => {
      const userSockets = this.userDevices.get(userId);
      return userSockets?.has(device.deviceId) || false;
    });
  }

  // Public methods for other services to use
  async broadcastToUserDevices(userId: string, event: string, data: any) {
    const userSockets = this.userDevices.get(userId);
    if (userSockets) {
      userSockets.forEach((socket) => {
        socket.emit(event, data);
      });
    }
  }

  async sendToUserDevice(userId: string, deviceId: string, event: string, data: any) {
    return this.sendToDevice(userId, deviceId, event, data);
  }

  getUserActiveDevices(userId: string): string[] {
    const userSockets = this.userDevices.get(userId);
    return userSockets ? Array.from(userSockets.keys()) : [];
  }

  isDeviceOnline(userId: string, deviceId: string): boolean {
    const userSockets = this.userDevices.get(userId);
    return userSockets?.has(deviceId) || false;
  }
}
