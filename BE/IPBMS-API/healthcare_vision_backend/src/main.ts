import 'reflect-metadata';
import path from 'path';
import moduleAlias from 'module-alias';
moduleAlias.addAlias('@', path.resolve(__dirname));

import { NestFactory } from '@nestjs/core';

// Import module chính của ứng dụng
import { AppModule } from './app.module';

// ValidationPipe dùng để validate dữ liệu request đầu vào theo các DTO class-validator
import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BigIntInterceptor } from './shared/interceptors/bigint.interceptor';

// WebSocket adapter
import { IoAdapter } from '@nestjs/platform-socket.io';

// Các thư viện để cấu hình và khởi tạo Swagger UI
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Import shared utilities và filters
import { APP_CONSTANTS } from './shared/constants/app.constants';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';

// Security middleware
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { CustomLogger } from './shared/logger/custom-logger.service';

// Types and interfaces
interface AppConfig {
  port: number;
  isProduction: boolean;
  trustProxy: boolean;
  forceHttps: boolean;
  swaggerEnabled: boolean;
  rateLimit: {
    windowMs: number;
    max: number;
    authMax: number;
  };
}

interface ExpressApp {
  set: (_key: string, _value: any) => void;
  [key: string]: any;
}

// Configuration factory
function createAppConfig(): AppConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const trustProxy =
    process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1' || isProduction;
  const forceHttps = process.env.FORCE_HTTPS === 'true';

  // Optimized swagger check
  const swaggerEnvValue = process.env.SWAGGER_ENABLED || process.env.ENABLE_SWAGGER;
  const isTruthy = (value: string | undefined): boolean => {
    if (!value) return false;
    const normalized = value.toLowerCase().trim();
    return ['true', '1', 'yes', 'on', 'enabled'].includes(normalized);
  };

  const swaggerEnabled = !isProduction ? true : isTruthy(swaggerEnvValue);

  return {
    port: Number(process.env.PORT || 3002),
    isProduction,
    trustProxy,
    forceHttps,
    swaggerEnabled,
    rateLimit: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
      max: Number(process.env.RATE_LIMIT_MAX || 100),
      authMax: Number(process.env.RATE_LIMIT_AUTH_MAX || 10),
    },
  };
}

// Logger factory
function createLogger(context: string): Logger {
  return new Logger(context);
}

// Setup functions
function setupWebSocketAdapter(app: any): void {
  app.useWebSocketAdapter(new IoAdapter(app));
}

function setupTrustProxy(app: any, config: AppConfig): void {
  if (!config.trustProxy) return;

  try {
    const expressApp = app.getHttpAdapter().getInstance() as ExpressApp;
    if (typeof expressApp?.set === 'function') {
      expressApp.set('trust proxy', 1);
    }
  } catch (error) {
    createLogger('TrustProxySetup').error('Failed to setup trust proxy', error);
  }
}

function setupCors(app: any): void {
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
}

function setupGlobalPrefix(app: any): void {
  app.setGlobalPrefix(APP_CONSTANTS.API_PREFIX);
}

function setupHttpsRedirect(app: any, config: AppConfig): void {
  if (!config.forceHttps || !config.isProduction) return;

  app.use((req: any, res: any, next: any) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

function setupHelmet(app: any, config: AppConfig): void {
  const logger = createLogger('HelmetSetup');

  if (!config.isProduction) {
    logger.debug('Development - CSP disabled');
    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginOpenerPolicy: false,
      }),
    );
    return;
  }

  // Production mode
  if (config.swaggerEnabled) {
    logger.debug('Production with Swagger - relaxed CSP');
    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
      }),
    );
  } else {
    logger.debug('Production without Swagger - strict CSP');
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'"],
            fontSrc: ["'self'"],
            imgSrc: ["'self'", 'data:'],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ['none'],
            objectSrc: ['none'],
            mediaSrc: ["'self'"],
            manifestSrc: ["'self'"],
          },
        },
      }),
    );
  }
}

function setupRateLimiting(app: any, config: AppConfig): void {
  const logger = createLogger('RateLimitSetup');

  // Global rate limiter
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests, please try again later.',
    }),
  );

  // Auth endpoints stricter limiter
  app.use(
    `${APP_CONSTANTS.API_PREFIX}/auth`,
    rateLimit({
      windowMs: 60_000,
      max: config.rateLimit.authMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many auth attempts, please wait and try again.',
    }),
  );

  logger.debug(
    `Rate limiting configured: ${config.rateLimit.max} req/${config.rateLimit.windowMs}ms`,
  );
}

function setupGlobalFilters(app: any): void {
  app.useGlobalFilters(new GlobalExceptionFilter());
}

function setupValidationPipe(app: any): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
}

function setupClassSerializer(app: any): void {
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
}

function setupSwagger(app: any, config: AppConfig): void {
  if (!config.swaggerEnabled) {
    createLogger('SwaggerSetup').debug('Swagger is DISABLED');
    return;
  }

  const logger = createLogger('SwaggerSetup');
  logger.debug('Setting up Swagger documentation...');

  const swaggerVersion = '3.8.2';

  const configBuilder = new DocumentBuilder()
    .setTitle('Healthcare Vision API')
    .setDescription(`API Documentation for Healthcare Vision System - Version ${swaggerVersion}.`)
    .setVersion(swaggerVersion)
    .addBearerAuth();

  const document = SwaggerModule.createDocument(app, configBuilder.build());

  SwaggerModule.setup(APP_CONSTANTS.SWAGGER_PATH, app, document, {
    useGlobalPrefix: true,
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      tryItOutEnabled: true,
      displayRequestDuration: true,
    },
    customSiteTitle: 'Healthcare Vision API',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .scheme-container { background: transparent; }
    `,
  });

  logger.log(
    `✅ Swagger UI available at: /${APP_CONSTANTS.API_PREFIX}/${APP_CONSTANTS.SWAGGER_PATH}`,
  );
  logger.log(
    `✅ Swagger JSON available at: /${APP_CONSTANTS.API_PREFIX}/${APP_CONSTANTS.SWAGGER_PATH}-json`,
  );
}

function setupDiagnosticMiddleware(app: any): void {
  try {
    const logger = createLogger('HeaderLogger');
    app.use(`${APP_CONSTANTS.API_PREFIX}/plans`, (req: any, _res: any, next: any) => {
      try {
        const auth = req.headers?.authorization || req.headers?.Authorization;
        const preview = auth ? String(auth).slice(0, 120) : 'none';
        logger.debug(
          `Request to /${APP_CONSTANTS.API_PREFIX}/plans - Authorization header preview: ${preview}`,
        );
        logger.debug(`Request headers present: ${Object.keys(req.headers).join(', ')}`);
      } catch {
        logger.debug('Header logger: unable to read headers');
      }
      next();
    });
  } catch (error) {
    createLogger('DiagnosticMiddleware').error('Failed to install diagnostic middleware', error);
  }
}

async function startServer(app: any, config: AppConfig): Promise<void> {
  const logger = createLogger('Server');

  try {
    await app.listen(config.port, '0.0.0.0');

    logger.log('========================================');
    logger.log(`[BOOT] 🚀 Server is running`);
    logger.log(`[BOOT] Environment: ${config.isProduction ? 'production' : 'development'}`);
    logger.log(`[BOOT] Listening on: http://0.0.0.0:${config.port}`);
    logger.log(`[BOOT] API Prefix: /${APP_CONSTANTS.API_PREFIX}`);
    logger.log(`[BOOT] Swagger: ${config.swaggerEnabled ? 'ENABLED' : 'DISABLED'}`);

    if (config.swaggerEnabled) {
      logger.log(
        `[BOOT] Swagger URL: http://localhost:${config.port}/${APP_CONSTANTS.API_PREFIX}/${APP_CONSTANTS.SWAGGER_PATH}`,
      );
    }

    logger.log('========================================');
  } catch (error) {
    logger.error('Failed to start server', error);
    throw error;
  }
}

async function bootstrap(): Promise<void> {
  const logger = createLogger('Bootstrap');

  try {
    // Create application instance
    const app = await NestFactory.create(AppModule);
    app.useLogger(new CustomLogger());
    const config = createAppConfig();
    logger.debug('Application instance created');

    // Setup phases - organized by priority
    setupWebSocketAdapter(app);
    setupTrustProxy(app, config);
    setupCors(app);
    setupGlobalPrefix(app);
    setupHttpsRedirect(app, config);
    setupHelmet(app, config);
    setupRateLimiting(app, config);

    // Global middleware and filters
    setupGlobalFilters(app);
    setupValidationPipe(app);
    setupClassSerializer(app);
    app.useGlobalInterceptors(new BigIntInterceptor());
    // Documentation
    setupSwagger(app, config);

    // Diagnostic tools
    setupDiagnosticMiddleware(app);

    // Start server
    await startServer(app, config);
  } catch (error) {
    logger.error('Bootstrap failed', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  createLogger('UncaughtException').error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  createLogger('UnhandledRejection').error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

bootstrap();
