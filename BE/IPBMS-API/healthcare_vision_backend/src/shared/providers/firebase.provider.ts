import { Injectable, Logger } from '@nestjs/common';
import { App, cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseAdminService {
  private app: App | null = null;

  constructor() {
    Logger.debug('🔥 FirebaseAdminService constructor called', 'FirebaseAdminService');

    if (!FirebaseAdminService.shouldInitialize()) {
      Logger.warn('🔥 Firebase initialization skipped via configuration', 'FirebaseAdminService');
      return;
    }

    // 1) Nếu set biến môi trường cho service account fields, ưu tiên sử dụng chúng
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKeyRaw) {
      try {
        Logger.debug('🔥 Initializing Firebase from environment variables', 'FirebaseAdminService');
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
        this.app = initializeApp({
          credential: cert({ projectId, clientEmail, privateKey } as any),
        });
        Logger.log('🔥 Firebase initialized successfully from env vars', 'FirebaseAdminService');
        return;
      } catch (error) {
        Logger.error(
          '🔥 Failed to initialize Firebase from env vars:',
          String(error),
          'FirebaseAdminService',
        );
        // Don't throw - allow fallback to file-based auth
      }
    }

    // 1b) Support providing entire service account JSON via env var (base64 or raw)
    const saBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const saJsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (saBase64 || saJsonRaw) {
      try {
        Logger.debug(
          '🔥 Initializing Firebase from SERVICE_ACCOUNT env var',
          'FirebaseAdminService',
        );
        const raw = saJsonRaw ?? Buffer.from(saBase64 as string, 'base64').toString('utf8');
        const creds = typeof raw === 'string' ? JSON.parse(raw) : raw;
        this.app = initializeApp({ credential: cert(creds as any) });
        Logger.log(
          '🔥 Firebase initialized successfully from SERVICE_ACCOUNT env var',
          'FirebaseAdminService',
        );
        return;
      } catch (error) {
        Logger.error(
          '🔥 Failed to initialize Firebase from SERVICE_ACCOUNT env var:',
          String(error),
          'FirebaseAdminService',
        );
        // allow fallback to file-based lookup
      }
    }

    // 2) Fallback: dùng đường dẫn đến file service account (theo biến env hoặc cấu trúc repo)
    // In production Docker images the repo is often compiled to `dist/` and the
    // Dockerfile may copy the file into `dist/src/config/...`. Support common
    // candidate locations and also Docker secrets under /run/secrets.
    const candidates = [] as string[];
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      candidates.push(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    }

    // typical repo layout (dev)
    candidates.push(path.join(process.cwd(), 'src/config/firebase/firebase-service-account.json'));
    // typical built layout inside container (dist)
    candidates.push(
      path.join(process.cwd(), 'dist/src/config/firebase/firebase-service-account.json'),
    );
    // Docker secrets (if mounted as secret)
    candidates.push('/run/secrets/firebase-service-account.json');

    let foundPath: string | null = null;
    for (const p of candidates) {
      try {
        if (p && fs.existsSync(p)) {
          foundPath = p;
          break;
        }
      } catch {
        // ignore
      }
    }

    Logger.debug(`🔥 Firebase candidate paths: ${candidates}`, 'FirebaseAdminService');
    Logger.debug(`🔥 Firebase selected path: ${foundPath}`, 'FirebaseAdminService');
    Logger.debug(`🔥 process.cwd(): ${process.cwd()}`, 'FirebaseAdminService');
    Logger.debug(`🔥 __dirname: ${__dirname}`, 'FirebaseAdminService');

    if (!foundPath) {
      Logger.warn(
        '🔥 Firebase service account file not found in any candidate path. Firebase features will be disabled.',
        'FirebaseAdminService',
      );
      return;
    }

    try {
      Logger.debug(`🔥 Initializing Firebase from file: ${foundPath}`, 'FirebaseAdminService');
      // require(...) works with both relative and absolute paths in Node
      const creds = require(foundPath);
      this.app = initializeApp({
        credential: cert(creds),
      });
      Logger.log('🔥 Firebase initialized successfully from file', 'FirebaseAdminService');
    } catch (error) {
      Logger.error(
        '🔥 Failed to initialize Firebase from file:',
        String(error),
        'FirebaseAdminService',
      );
      // Don't throw - Firebase will be marked as not initialized
    }
  }

  async verifyIdToken(idToken: string) {
    if (!this.app) {
      throw new Error('Firebase is not initialized');
    }
    const auth = getAuth(this.app);
    return auth.verifyIdToken(idToken);
  }

  getApp(): App | null {
    return this.app;
  }

  getMessaging(): Messaging {
    if (!this.app) return null as unknown as Messaging;
    return getMessaging(this.app);
  }

  getAuthClient() {
    if (!this.app) return null as unknown;
    return getAuth(this.app);
  }

  private static parseBoolean(value?: string | boolean | null): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on', 'enabled'].includes(normalized)) return true;
      if (['false', '0', 'no', 'off', 'disabled'].includes(normalized)) return false;
    }

    return undefined;
  }

  private static shouldInitialize(): boolean {
    const enabled = FirebaseAdminService.parseBoolean(process.env.FIREBASE_ENABLED);
    if (typeof enabled === 'boolean') {
      return enabled;
    }

    const skip = FirebaseAdminService.parseBoolean(process.env.FIREBASE_SKIP_INIT);
    if (typeof skip === 'boolean') {
      return !skip;
    }

    return true;
  }
}
