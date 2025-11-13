import { Injectable, Logger } from '@nestjs/common';
import { DeviceSyncGateway } from '../gateways/device-sync.gateway';
import { FcmService } from '../../application/services/fcm.service';
import { sanitizeAndChunkRecipients, retryWithBackoff } from '../utils/sync.util';

export interface DeviceSyncMessage {
  type: 'sync' | 'command' | 'data' | 'notification';
  payload: any;
  priority?: 'low' | 'normal' | 'high';
  ttl?: number; // Time to live in seconds
}

export interface DeviceSyncOptions {
  fallbackToFCM?: boolean;
  requireOnline?: boolean;
  broadcast?: boolean;
}

@Injectable()
export class DeviceSyncService {
  private readonly logger = new Logger(DeviceSyncService.name);

  constructor(
    private readonly _deviceSyncGateway: DeviceSyncGateway,
    private readonly _fcmService: FcmService,
  ) {}

  /**
   * Send message to specific device via WebSocket, fallback to FCM if needed
   */
  async sendToDevice(
    userId: string,
    deviceId: string,
    message: DeviceSyncMessage,
    options: DeviceSyncOptions = {},
  ): Promise<boolean> {
    const { fallbackToFCM = true, requireOnline = false } = options;

    try {
      // Check if device is online via WebSocket
      const isOnline = this._deviceSyncGateway.isDeviceOnline(userId, deviceId);

      if (isOnline || !requireOnline) {
        // Try WebSocket first
        const sent = await this._deviceSyncGateway.sendToUserDevice(
          userId,
          deviceId,
          'device_message',
          {
            ...message,
            timestamp: new Date(),
            via: 'websocket',
          },
        );

        if (sent) {
          this.logger.log(`Message sent via WebSocket to ${userId}:${deviceId}`);
          return true;
        }
      }

      // Fallback to FCM if WebSocket failed and fallback is enabled
      if (fallbackToFCM && !requireOnline) {
        await this._fcmService.sendNotificationToDevice(
          userId,
          deviceId,
          `Device Sync: ${message.type}`,
          this.formatMessageForFCM(message),
          {
            type: 'device_sync',
            syncType: message.type,
            payload: JSON.stringify(message.payload),
            timestamp: new Date().toISOString(),
          },
        );

        this.logger.log(`Message sent via FCM to ${userId}:${deviceId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to send message to device ${userId}:${deviceId}`, error);
      return false;
    }
  }

  /**
   * Broadcast message to all user's devices except the sender
   */
  async broadcastToOtherDevices(
    userId: string,
    excludeDeviceId: string,
    message: DeviceSyncMessage,
    options: DeviceSyncOptions = {},
  ): Promise<number> {
    const { fallbackToFCM = true } = options;

    try {
      let sentCount = 0;

      // Get all active devices for the user
      const activeDevices = this._deviceSyncGateway.getUserActiveDevices(userId);

      for (const deviceId of activeDevices) {
        if (deviceId !== excludeDeviceId) {
          const sent = await this.sendToDevice(userId, deviceId, message, {
            ...options,
            broadcast: false, // Prevent infinite recursion
          });

          if (sent) sentCount++;
        }
      }

      // If no devices were reached via WebSocket and fallback is enabled,
      // send via FCM to all other devices (chunked and retried)
      if (sentCount === 0 && fallbackToFCM) {
        const activeDevices = this._deviceSyncGateway.getUserActiveDevices(userId);
        const chunks = sanitizeAndChunkRecipients(
          activeDevices.filter((d) => d !== excludeDeviceId),
          userId,
          100,
        );

        for (const chunk of chunks) {
          try {
            await retryWithBackoff(
              async () => {
                // send to each token/device via fcmService
                for (const deviceId of chunk) {
                  await this._fcmService.sendNotificationToDevice(
                    userId,
                    deviceId,
                    `Device Sync: ${message.type}`,
                    this.formatMessageForFCM(message),
                    {
                      type: 'device_sync',
                      syncType: message.type,
                      payload: JSON.stringify(message.payload),
                      timestamp: new Date().toISOString(),
                    },
                  );
                }
              },
              3,
              300,
            );

            // count number of devices successfully queued/sent in this chunk
            sentCount += chunk.length;
          } catch (err) {
            this.logger.error('FCM chunk send failed', err);
            // count as failure, continue
          }
        }

        if (sentCount > 0) {
          this.logger.log(`Message broadcast via FCM to other devices of ${userId}`);
        }
      }

      return sentCount;
    } catch (error) {
      this.logger.error(`Failed to broadcast message to other devices of ${userId}`, error);
      return 0;
    }
  }

  /**
   * Broadcast message to all user's devices
   */
  async broadcastToAllDevices(
    userId: string,
    message: DeviceSyncMessage,
    options: DeviceSyncOptions = {},
  ): Promise<number> {
    const { fallbackToFCM = true } = options;

    try {
      let sentCount = 0;

      // Get all active devices for the user
      const activeDevices = this._deviceSyncGateway.getUserActiveDevices(userId);

      for (const deviceId of activeDevices) {
        const sent = await this.sendToDevice(userId, deviceId, message, {
          ...options,
          broadcast: false,
        });

        if (sent) sentCount++;
      }

      // If no devices were reached via WebSocket and fallback is enabled,
      // send via FCM to all devices (chunked + retry)
      if (sentCount === 0 && fallbackToFCM) {
        const chunks = sanitizeAndChunkRecipients(activeDevices, userId, 100);
        for (const chunk of chunks) {
          try {
            await retryWithBackoff(
              async () => {
                for (const deviceId of chunk) {
                  await this._fcmService.sendNotificationToDevice(
                    userId,
                    deviceId,
                    `Device Sync: ${message.type}`,
                    this.formatMessageForFCM(message),
                    {
                      type: 'device_sync',
                      syncType: message.type,
                      payload: JSON.stringify(message.payload),
                      timestamp: new Date().toISOString(),
                    },
                  );
                }
              },
              3,
              300,
            );
            sentCount += chunk.length;
          } catch (err) {
            this.logger.error('FCM chunk send failed', err);
          }
        }

        if (sentCount > 0) this.logger.log(`Message broadcast via FCM to all devices of ${userId}`);
      }

      return sentCount;
    } catch (error) {
      this.logger.error(`Failed to broadcast message to all devices of ${userId}`, error);
      return 0;
    }
  }

  /**
   * Sync data between devices
   */
  async syncData(
    userId: string,
    fromDeviceId: string,
    dataType: string,
    data: any,
    targetDeviceId?: string,
  ): Promise<boolean> {
    const message: DeviceSyncMessage = {
      type: 'sync',
      payload: {
        dataType,
        data,
        fromDeviceId,
      },
    };

    if (targetDeviceId) {
      return this.sendToDevice(userId, targetDeviceId, message);
    } else {
      return (await this.broadcastToOtherDevices(userId, fromDeviceId, message)) > 0;
    }
  }

  /**
   * Send command to device
   */
  async sendCommand(
    userId: string,
    deviceId: string,
    command: string,
    params: any = {},
  ): Promise<boolean> {
    const message: DeviceSyncMessage = {
      type: 'command',
      payload: {
        command,
        params,
      },
    };

    return this.sendToDevice(userId, deviceId, message);
  }

  /**
   * Get device status information
   */
  getDeviceStatus(userId: string): {
    activeDevices: string[];
    onlineCount: number;
  } {
    const activeDevices = this._deviceSyncGateway.getUserActiveDevices(userId);
    return {
      activeDevices,
      onlineCount: activeDevices.length,
    };
  }

  /**
   * Check if device is online
   */
  isDeviceOnline(userId: string, deviceId: string): boolean {
    return this._deviceSyncGateway.isDeviceOnline(userId, deviceId);
  }

  private formatMessageForFCM(message: DeviceSyncMessage): string {
    switch (message.type) {
      case 'sync':
        return 'Data synchronization in progress';
      case 'command':
        return `Command: ${message.payload.command}`;
      case 'data':
        return 'New data available';
      case 'notification':
        return message.payload.title || 'Device notification';
      default:
        return 'Device sync message';
    }
  }
}
