import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceId?: string;
  platform?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private sessions = new Map<string, SessionInfo>();

  constructor(private readonly _jwt: JwtService) {}

  async createSession(
    userId: string,
    deviceInfo: {
      deviceId?: string;
      platform?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const session: SessionInfo = {
      sessionId,
      userId,
      deviceId: deviceInfo.deviceId,
      platform: deviceInfo.platform,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    };

    this.sessions.set(sessionId, session);
    this.logger.log(`Session created for user ${userId}: ${sessionId}`);

    return sessionId;
  }

  async getActiveSessions(userId: string): Promise<SessionInfo[]> {
    const userSessions: SessionInfo[] = [];

    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.isActive) {
        userSessions.push(session);
      }
    }

    return userSessions;
  }

  async terminateSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.isActive = false;
    this.logger.log(`Session terminated: ${sessionId} for user ${session.userId}`);

    return true;
  }

  async terminateAllSessions(userId: string): Promise<number> {
    let terminatedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId && session.isActive) {
        session.isActive = false;
        terminatedCount++;
      }
    }

    if (terminatedCount > 0) {
      this.logger.log(`Terminated ${terminatedCount} sessions for user ${userId}`);
    }

    return terminatedCount;
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session && session.isActive) {
      session.lastActivity = new Date();
    }
  }

  async validateSession(sessionId: string): Promise<SessionInfo | null> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return null;
    }

    // Check if session has expired (24 hours)
    const now = new Date();
    const sessionAge = now.getTime() - session.createdAt.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (sessionAge > maxAge) {
      session.isActive = false;
      this.logger.log(`Session expired: ${sessionId}`);
      return null;
    }

    return session;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Clean up expired sessions
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;

    for (const [, session] of this.sessions.entries()) {
      const sessionAge = now.getTime() - session.createdAt.getTime();
      if (sessionAge > maxAge) {
        // Session will be deleted in the next iteration
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired sessions`);
    }

    return cleanedCount;
  }
}
