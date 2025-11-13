# 🏥 Healthcare Vision AI Backend

> **Comprehensive healthcare monitoring and alert management system with AI-powered computer vision capabilities**

[![Version](https://img.shields.io/badge/version-3.3.0-blue.svg)](https://github.com/Kwoitd/healthcare_vision_backend)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/nestjs-11.1.6-red.svg)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/prisma-6.14.0-indigo.svg)](https://prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-latest-blue.svg)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://docker.com/)

## 📋 Table of Contents

- [🏥 Healthcare Vision AI Backend](#-healthcare-vision-ai-backend)
  - [📋 Table of Contents](#-table-of-contents)
  - [🌟 Features](#-features)
  - [🏗️ Architecture](#️-architecture)
  - [🚀 Tech Stack](#-tech-stack)
  - [📋 Prerequisites](#-prerequisites)
  - [⚡ Quick Start](#-quick-start)
  - [🔧 Installation](#-installation)
  - [🐳 Docker Deployment](#-docker-deployment)
  - [📚 API Documentation](#-api-documentation)
  - [🔐 Authentication & Authorization](#-authentication--authorization)
  - [💾 Database](#-database)
  - [🎯 Core Modules](#-core-modules)
  - [🔄 Shared Missions Flow](#-shared-missions-flow)
  - [📊 Monitoring & Health Checks](#-monitoring--health-checks)
  - [🧪 Testing](#-testing)
  - [📈 Performance](#-performance)
  - [🔒 Security](#-security)
  - [🚀 Deployment](#-deployment)
  - [📖 API Reference](#-api-reference)
  - [🤝 Contributing](#-contributing)
  - [📄 License](#-license)

## 🌟 Features

### 🚨 **Real-time Healthcare Monitoring**

- **AI-powered fall detection** and abnormal behavior analysis
- **Live camera streaming** with RTSP support
- **Smart alert management** with multi-level severity
- **Real-time notifications** via FCM, SMS, and voice calls

### 👥 **Advanced User Management**

- **Role-based access control** (Admin, Customer, Caregiver)
- **OTP authentication** via phone number
- **Caregiver assignment system** with approval workflow
- **Granular permission sharing** between customers and caregivers

### 🔐 **Complete Roles & Permissions System** _(v3.3.1)_

- **Database-backed access control** with full CRUD operations
- **21 pre-seeded permissions** with granular resource control
- **3 core roles** (Admin, Caregiver, Customer) with proper access matrix
- **Many-to-many relationships** between roles and permissions
- **JWT authentication** with role-based guards
- **Audit logging** for all permission operations
- **UUID-based identifiers** for distributed systems

### 🏠 **Room & Camera Management**

- **Multi-camera support** with IP camera integration
- **Room-based user assignments** with bed tracking
- **Camera health monitoring** with automatic status detection
- **Video snapshot management** with cloud storage

### 📊 **Analytics & Reporting**

- **Daily health summaries** with AI insights
- **Event detection analytics** with confidence scoring
- **Activity logs** with comprehensive audit trails
- **Dashboard metrics** for admin and caregivers

### 💰 **Subscription & Billing**

- **Flexible subscription plans** with feature restrictions
- **VNPay payment integration** for Vietnamese market
- **Quota management** for API usage and storage
- **Automatic plan upgrades/downgrades**

### 🔍 **Advanced Search & Audit System** _(v3.3.0)_

- **Unified search** across events, caregivers, and invoices
- **Complete audit trail** with actor tracking and compliance
- **Emergency contact management** for user safety
- **Camera error ticket system** for issue tracking
- **Enhanced caregiver permissions** with granular control

## 🏗️ Architecture

### **Modern Hybrid Architecture**

- **90% TypeORM → Prisma Migration Complete**
- **Repository Pattern** with `BasePrismaRepository`
- **Unit of Work** transaction management
- **Type-safe database operations** with Prisma Client v6.14.0
- **Microservices-ready** modular design

### **Performance Optimizations**

- **In-memory caching** with TTL & pattern invalidation
- **Database connection pooling** with Prisma
- **Response compression** and rate limiting
- **Automatic cache invalidation** for real-time updates

### **API Standardization**

- **Global response wrapper** interceptor
- **Standardized API format**: `{success, data, message, timestamp, pagination}`
- **Consistent error handling** with error codes
- **TypeScript type safety** throughout

## 🚀 Tech Stack

| Category           | Technology      | Version |
| ------------------ | --------------- | ------- |
| **Runtime**        | Node.js         | ≥18.0.0 |
| **Framework**      | NestJS          | 11.1.6  |
| **Database ORM**   | Prisma          | 6.14.0  |
| **Legacy ORM**     | TypeORM         | 0.3.25  |
| **Database**       | PostgreSQL      | Latest  |
| **Authentication** | JWT + Passport  | Latest  |
| **Documentation**  | Swagger/OpenAPI | 3.0     |
| **Real-time**      | Socket.IO       | 4.8.1   |
| **Cloud Storage**  | Cloudinary      | 1.41.3  |
| **Notifications**  | Firebase Admin  | 13.4.0  |
| **SMS/Voice**      | Twilio + Vonage | Latest  |
| **Payments**       | VNPay           | 2.4.1   |
| **Testing**        | Jest            | 30.1.2  |
| **Container**      | Docker          | Latest  |

## 📋 Prerequisites

- **Node.js** ≥ 18.0.0
- **pnpm** ≥ 8.0.0 (recommended) or npm
- **PostgreSQL** ≥ 14.0
- **Docker** & Docker Compose (for containerized deployment)
- **Firebase Project** (for push notifications)
- **Cloudinary Account** (for image storage)

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/Kwoitd/healthcare_vision_backend.git
cd healthcare_vision_backend

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Setup database
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Start development server
pnpm dev
```

**🌐 Access Points:**

- API: http://localhost:3010/api
- Swagger Docs: http://localhost:3010/api/docs
- Health Check: http://localhost:3010/api/health

## 🔧 Installation

### **1. Clone & Setup**

```bash
git clone https://github.com/Kwoitd/healthcare_vision_backend.git
cd healthcare_vision_backend
pnpm install
```

### **2. Environment Configuration**

Create `.env` file with required variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/healthcare_db"
DB_LOGGING=true

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES="7d"

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID="your-firebase-project"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_ENABLED=true # set to false to skip Firebase initialisation in local dev

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# SMS/Voice Services
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
VONAGE_API_KEY="your-vonage-key"
VONAGE_API_SECRET="your-vonage-secret"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-pass"
SMTP_VERIFY_ON_BOOT=false # optional: skip connection verification during development

# Payment Gateway
VNPAY_TMN_CODE="your-vnpay-code"
VNPAY_HASH_SECRET="your-vnpay-secret"

# Cache
REDIS_URL="redis://localhost:6379"
ACL_CACHE_TTL_MS=30000

# API Configuration
PORT=3010
NODE_ENV=development
API_PREFIX=api
SWAGGER_TITLE="Healthcare Vision API"
SWAGGER_DESCRIPTION="Healthcare monitoring and alert management system"
```

### **3. Database Setup**

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed

# Optional: Open Prisma Studio
pnpm db:studio
```

### **4. Development**

```bash
# Start development server with hot reload
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Check code quality
pnpm quality

# Fix code issues
pnpm quality:fix
```

## 🐳 Docker Deployment

### **Development with Docker Compose**

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### **Production Deployment**

```bash
# Build production image
docker buildx build --platform linux/amd64 -t your-registry/healthcare-vision-backend:latest .

# Push to registry
docker push your-registry/healthcare-vision-backend:latest

# Deploy with production compose
# If your repository includes a `docker-compose.prod.yml` use it; otherwise use
# the default `docker-compose.yml` or create `docker-compose.prod.yml` in
# your deployment environment.
if [ -f docker-compose.prod.yml ]; then
  docker-compose -f docker-compose.prod.yml up -d
else
  docker-compose up -d
fi
```

## 📚 API Documentation

### **Swagger UI**

- **Local**: http://localhost:3010/api/docs
- **Production**: https://your-domain.com/api/docs

### **Key API Endpoints**

| Endpoint                     | Method | Description                  |
| ---------------------------- | ------ | ---------------------------- |
| `/api/auth/login`            | POST   | User authentication          |
| `/api/auth/verify-otp`       | POST   | OTP verification             |
| `/api/users/profile`         | GET    | Get user profile             |
| `/api/cameras`               | GET    | List user cameras            |
| `/api/events`                | GET    | Event detections             |
| `/api/alerts`                | GET    | Alert management             |
| `/api/caregiver-invitations` | POST   | Create caregiver invitation  |
| `/api/shared-permissions`    | PUT    | Update sharing permissions   |
| `/api/roles`                 | GET    | **NEW** List all roles       |
| `/api/permissions`           | GET    | **NEW** List all permissions |

### **Detailed Documentation**

- **[📖 API Master List](docs/API_MASTER_LIST.md)** - Complete API endpoint reference
- **[🔐 Roles & Permissions System](docs/ROLES_PERMISSIONS.md)** - **NEW** Complete access control documentation
- **[🔄 Shared Permissions](docs/SHARED_PERMISSIONS.md)** - Caregiver permission sharing
- **[💰 Payment & Subscription](docs/PAYMENT_SUBSCRIPTION_WORKFLOW.md)** - Billing integration

### **Response Format**

```json
{
  "success": true,
  "data": {
    /* actual response data */
  },
  "message": "Operation completed successfully",
  "timestamp": "2025-09-14T10:30:00.000Z",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## 🔐 Authentication & Authorization

### **Authentication Flow**

1. **Phone Number Registration**: Submit phone number
2. **OTP Verification**: Verify 6-digit code via SMS
3. **JWT Token**: Receive access token for API calls
4. **Token Refresh**: Automatic token refresh before expiry

### **Role-Based Access Control**

- **Admin**: Full system access, user management
- **Customer**: Manage own cameras, view events, assign caregivers
- **Caregiver**: View assigned patients, acknowledge alerts

### **API Security**

```typescript
// Protected endpoint example
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer', 'caregiver')
@ApiBearerAuth()
export class CamerasController {
  // Controller implementation
}
```

## 💾 Database

### **Database Schema**

- **Users**: Authentication and profile management
- **Cameras**: IP camera configuration and status
- **Events**: AI detection results and analysis
- **Alerts**: Notification and alert management
- **Assignments**: Caregiver-patient relationships
- **Permissions**: Granular access control
- **Subscriptions**: Plan management and billing

### **Key Relationships**

- User → Cameras (1:N)
- Camera → Events (1:N)
- Event → Alerts (1:N)
- Customer → Caregiver (N:N via assignments)
- Customer → Permissions (1:N via shared_permissions)

### **Migration Commands**

```bash
# Create new migration
npx prisma migrate dev --name your-migration-name

# Deploy to production
npx prisma migrate deploy

# Reset database (development only)
pnpm db:reset
```

## 🎯 Core Modules

### **1. Authentication Module**

- JWT-based authentication
- OTP verification via SMS
- Role-based authorization
- Session management

### **2. User Management**

- Profile CRUD operations
- Role assignment
- Activity logging
- Soft delete support

### **3. Camera Management**

- IP camera integration
- RTSP stream handling
- Health monitoring
- Status tracking

### **4. Event Detection**

- AI-powered analysis
- Fall detection
- Abnormal behavior detection
- Confidence scoring

### **5. Alert System**

- Multi-level severity
- Real-time notifications
- Acknowledgment workflow
- Escalation rules

### **6. Assignment System**

- Caregiver-patient relationships
- Approval workflow
- Permission management
- Room assignments

## 🔄 Shared Missions Flow

The Healthcare Vision Backend implements a sophisticated **shared missions** system that enables seamless collaboration between customers (patients) and caregivers. This system consists of three main components:

### **1. Caregiver Assignment Flow**

```mermaid
graph TD
    A[Customer] -->|Create Assignment| B[Pending Status]
    B -->|Notification| C[Caregiver]
    C -->|Accept| D[Active Assignment]
    C -->|Reject| E[Rejected Status]
    D -->|Access Granted| F[Shared Resources]
    A -->|Can Cancel| G[Assignment Deleted]
    C -->|Can Cancel| G
```

**Assignment States:**

- `pending`: Waiting for caregiver approval
- `accepted`: Active caregiver-patient relationship
- `rejected`: Caregiver declined assignment

**Business Rules:**

- Caregiver cannot accept multiple active assignments
- Only one pending assignment per caregiver-customer pair
- Previous rejected assignments can be reassigned

### **2. Shared Permissions System**

Granular permission control allowing customers to share specific data access with caregivers:

```typescript
interface SharedPermissions {
  stream_view: boolean; // Live camera access
  alert_read: boolean; // View alerts
  alert_ack: boolean; // Acknowledge alerts
  profile_view: boolean; // Patient profile access
  log_access_days: number; // Historical data access (days)
  report_access_days: number; // Report access duration
  notification_channel: string[]; // ['push', 'sms', 'call']
}
```

### **3. Room Assignment System**

Physical space management connecting users to specific rooms and beds:

```typescript
interface UserRoomAssignment {
  user_id: string;
  room_id: string;
  bed_number?: string;
  assigned_at: Date;
  is_active: boolean;
}
```

### **Access Control Logic**

The system uses a **multi-layer access control** approach:

1. **Explicit Assignment Check**: Direct caregiver-customer relationship
2. **Room-based Access**: Shared room assignments
3. **Permission Validation**: Granular permission verification
4. **Cache Layer**: 30-second TTL for performance optimization

### **API Endpoints**

| Endpoint                                 | Purpose                      |
| ---------------------------------------- | ---------------------------- |
| `POST /caregiver-invitations`            | Customer creates invitation  |
| `POST /caregiver-invitations/:id/accept` | Caregiver accepts invitation |
| `POST /caregiver-invitations/:id/reject` | Caregiver rejects invitation |
| `PUT /shared-permissions/:caregiver_id`  | Update sharing permissions   |
| `POST /user-room-assignments`            | Assign user to room          |

## 📊 Monitoring & Health Checks

### **Health Check Endpoints**

```bash
# Basic health check
GET /api/health

# Detailed system status
GET /api/health/detailed

# Database connectivity
GET /api/health/database
```

### **Performance Monitoring**

- **Response time tracking** for all endpoints
- **Database query optimization** with Prisma insights
- **Memory usage monitoring** with automatic garbage collection
- **Error rate tracking** with detailed logging

### **Cache Performance**

```typescript
// Cache configuration
const cacheConfig = {
  ttl: 30000, // 30 seconds TTL
  maxSize: 1000, // Maximum cache entries
  invalidationPattern: true, // Pattern-based invalidation
};
```

## 🧪 Testing

### **Test Suite**

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Run tests in watch mode
pnpm test:watch

# Run CI tests
pnpm test:ci
```

### **Test Categories**

- **Unit Tests**: Service and utility functions
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete user workflow testing
- **Performance Tests**: Load and stress testing

### **Coverage Requirements**

- **Minimum Coverage**: 80%
- **Critical Paths**: 95%
- **Services**: 90%
- **Controllers**: 85%

## 📈 Performance

### **Optimization Features**

- **Connection Pooling**: PostgreSQL connection optimization
- **Query Optimization**: Prisma query batching and caching
- **Response Compression**: Gzip compression for large responses
- **Rate Limiting**: API rate limiting to prevent abuse
- **Caching Strategy**: Multi-layer caching with Redis

### **Performance Metrics**

- **Average Response Time**: < 200ms
- **Database Query Time**: < 50ms
- **Cache Hit Ratio**: > 85%
- **Uptime**: 99.9%

## 🔒 Security

### **Security Measures**

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permission system
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Prisma parameterized queries
- **Rate Limiting**: Request throttling and abuse prevention
- **CORS Configuration**: Cross-origin request security
- **Helmet.js**: Security headers middleware

### **Data Protection**

- **Encryption at Rest**: Database encryption
- **Encryption in Transit**: TLS/SSL for all communications
- **PII Protection**: Personal data anonymization
- **Audit Logging**: Comprehensive activity tracking
- **GDPR Compliance**: Data protection regulations

### **Security Headers**

```typescript
// Security configuration
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
    hsts: { maxAge: 31536000 },
  }),
);
```

## 🚀 Deployment

### **Environment Setup**

#### **Development**

```bash
NODE_ENV=development
DATABASE_URL="postgresql://localhost:5432/healthcare_dev"
JWT_SECRET="dev-secret-key"
PORT=3010
```

#### **Staging**

```bash
NODE_ENV=staging
DATABASE_URL="postgresql://staging-db:5432/healthcare_staging"
JWT_SECRET="staging-secret-key"
PORT=3010
```

#### **Production**

```bash
NODE_ENV=production
DATABASE_URL="postgresql://prod-db:5432/healthcare_prod"
JWT_SECRET="super-secure-production-key"
PORT=3010
```

### **CI/CD Pipeline**

```yaml
# GitHub Actions example
name: Deploy Healthcare Vision Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: pnpm test:ci
      - name: Build application
        run: pnpm build
      - name: Deploy to production
        run: |
          if [ -f docker-compose.prod.yml ]; then
            docker-compose -f docker-compose.prod.yml up -d
          else
            docker-compose up -d
          fi
```

### **Monitoring & Logging**

#### **Application Logging**

```typescript
// Structured logging
const logger = new Logger('HealthcareVisionAPI');
logger.log('API server started on port 3010');
logger.error('Database connection failed', error.stack);
logger.warn('Rate limit exceeded for user', { userId });
```

#### **Health Monitoring**

- **Uptime monitoring** with external services
- **Performance metrics** tracking
- **Error rate monitoring** with alerts
- **Database health checks** with automatic failover

## 📖 API Reference

### **Complete API Documentation**

- **Swagger UI**: http://localhost:3010/api/docs
- **OpenAPI Spec**: [docs/api-spec.json](./docs/api-spec.json)
- **Postman Collection**: [docs/postman-collection.json](./docs/postman-collection.json)

### **Authentication Examples**

#### **Phone Authentication**

```bash
# Send OTP
curl -X POST http://localhost:3010/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890"}'

# Verify OTP
curl -X POST http://localhost:3010/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890", "otp": "123456"}'
```

#### **API Access**

```bash
# Access protected endpoint
curl -X GET http://localhost:3010/api/users/profile \
  -H "Authorization: Bearer your-jwt-token"
```

### **Caregiver Invitation Management**

#### **Create Caregiver Invitation**

```bash
curl -X POST http://localhost:3010/api/caregiver-invitations \
  -H "Authorization: Bearer customer-token" \
  -H "Content-Type: application/json" \
  -d '{
    "caregiver_id": "uuid-caregiver-id",
    "assignment_notes": "Please monitor daily activities"
  }'
```

#### **Accept Caregiver Invitation**

```bash
curl -X POST http://localhost:3010/api/caregiver-invitations/uuid-invitation-id/accept \
  -H "Authorization: Bearer caregiver-token"
```

### **Shared Permissions**

#### **Update Permissions**

```bash
curl -X PUT http://localhost:3010/api/customers/uuid-customer-id/shared-permissions/uuid-caregiver-id \
  -H "Authorization: Bearer customer-token" \
  -H "Content-Type: application/json" \
  -d '{
    "stream_view": true,
    "alert_read": true,
    "alert_ack": false,
    "log_access_days": 7,
    "notification_channel": ["push", "sms"]
  }'
```

## 🤝 Contributing

### **Development Workflow**

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### **Code Standards**

- **ESLint**: Code linting with strict rules
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **Conventional Commits**: Commit message format

### **Pull Request Guidelines**

- **Tests Required**: All new features must include tests
- **Documentation**: Update README and API docs
- **Code Review**: At least one reviewer approval
- **CI/CD**: All checks must pass

### **Development Commands**

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run quality checks
pnpm quality

# Fix code issues
pnpm quality:fix

# Run full CI pipeline
pnpm ci
```

## 📄 License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

### **Documentation**

- **API Docs**: [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)
- **Master API List**: [docs/API_MASTER_LIST.md](./docs/API_MASTER_LIST.md)
- **Payment Flow**: [docs/flow/payments.md](./docs/flow/payments.md)
- **FCM Integration**: [docs/flow/fcm-flow.md](./docs/flow/fcm-flow.md)

### **Getting Help**

- **Issues**: [GitHub Issues](https://github.com/Kwoitd/healthcare_vision_backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Kwoitd/healthcare_vision_backend/discussions)
- **Email**: support@healthcarevision.com

### **System Status**

- **Uptime**: [status.healthcarevision.com](https://status.healthcarevision.com)
- **Health Check**: http://localhost:3010/api/health

---

<div align="center">

**Built with ❤️ for Healthcare Innovation**

[🏠 Homepage](https://healthcarevision.com) • [📚 Docs](./docs/) • [🚀 Deploy](./docker-compose.yml) • [🔧 API](http://localhost:3010/api/docs)

</div>

NestJS (Framework chính)

Prisma (ORM)

PostgreSQL (Database)

JWT Auth + Role Guard

Swagger (OpenAPI)

� **Performance Features (New!)**

In-memory Cache với TTL & Pattern Invalidation

Performance Monitoring & Metrics

Health Check Endpoints

Auto Cache Integration cho Events & Admin Services

�🛠 Yêu cầu môi trường

Node.js ≥ 18

PostgreSQL ≥ 12

Yarn hoặc npm

⚙️ Cấu hình môi trường

Tạo file .env ở thư mục gốc:

# App

PORT=3001 JWT_SECRET=super-secret

# Database

DATABASE_URL=postgresql://username:password@localhost:5432/healthcare_vision

# Firebase (cho FCM)

FIREBASE_PROJECT_ID=your-project-id FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

📌 Swagger: http://localhost:3001/api/docs

## 🚀 Quick Start

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Setup database:**

   ```bash
   # Generate Prisma client
   pnpm db:generate

   # Push schema to database
   pnpm db:push

   # Seed database (optional)
   pnpm db:seed
   ```

3. **Start development server:**

   ```bash
   pnpm start:dev
   ```

4. **View database:**
   ```bash
   pnpm db:studio
   ```

## 🛠️ Development Workflow

### Code Quality

```bash
# Run linter
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov
```

### Database Scripts

- `pnpm db:generate` - Generate Prisma client
- `pnpm db:migrate` - Create and apply migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:seed` - Seed database with initial data
- `pnpm db:studio` - Open Prisma Studio

### Pre-commit Hooks

Husky is configured to run lint-staged before each commit:

- ESLint fixes
- Prettier formatting
- Tests run automatically

## 📁 Project Structure

```
src/
├── application/          # Application services & business logic
│   ├── services/        # Core business services
│   └── dto/            # Data transfer objects
├── core/               # Domain entities & types
├── infrastructure/     # Database, external APIs, repositories
├── modules/           # Feature modules (auth, fcm, etc.)
├── presentation/      # Controllers, decorators, guards
└── shared/           # Shared utilities & configurations

prisma/
├── schema.prisma     # Database schema
└── seed/            # Database seeding

test/               # Unit & integration tests
```

## 📚 Documentation

### Frontend Integration

Chúng tôi đã tạo tài liệu chi tiết để giúp frontend developers dễ dàng tích hợp:

#### 📖 **FRONTEND_INTEGRATION.md**

#### 📖 **FRONTEND_INTEGRATION.md**

- **30+ Controllers & Endpoints** - Đầy đủ tất cả API endpoints
- **Authentication Endpoints** - OTP, Firebase, JWT, Admin login
- **User Management** - CRUD users, medical info, profiles
- **Camera & AI Features** - Cameras, events, snapshots, AI configs
- **Healthcare Features** - Daily summaries, health reports, activity logs
- **Admin Features** - Plans, users, permissions, roles management
- **Payment & Subscription** - VNPay, subscriptions, billing
- **Integration Examples** - React/Flutter/Vue code samples
- **Testing Guide** - Postman collections, cURL examples
- **Error Handling** - HTTP status codes, validation patterns

#### 🚀 **API_QUICK_REFERENCE.md**

- Quick reference cho các endpoints thường dùng
- Authentication flow
- Mobile integration patterns
- Emergency scenarios
- Testing commands
- Common error codes

#### 💻 **FRONTEND_EXAMPLE.md**

- **React Integration Example** - Project structure hoàn chỉnh
- API client setup với axios
- Custom hooks cho authentication, events, cameras
- React components mẫu (LoginForm, Dashboard, EventList)
- Context setup cho authentication
- Testing utilities
- Environment configuration

#### 🔐 **AUTHENTICATION_DOCUMENTATION.md**

- Chi tiết authentication flow
- JWT token management
- Firebase integration
- Role-based access control
- Security best practices

#### ⚡ **PERFORMANCE_README.md** (New!)

- Performance monitoring quick start
- Cache system overview
- Health check endpoints
- Integration examples
- Troubleshooting guide

#### 📊 **PERFORMANCE_MONITORING.md** (New!)

- Chi tiết kỹ thuật cache service
- Performance metrics tracking
- Service integration patterns
- Best practices và optimization
- API reference hoàn chỉnh

#### 📱 **DEVICE_MANAGEMENT.md** (New!)

- Device management API documentation
- FCM token management
- User device listing endpoint
- Flutter/React integration examples
- Security and access control
- Testing guide and sample data

### Cách sử dụng:

1. **Bắt đầu với Quick Reference** để hiểu overview
2. **Đọc Frontend Integration** để hiểu chi tiết từng endpoint
3. **Sử dụng Frontend Example** làm template cho project
4. **Tham khảo Authentication docs** cho security setup

### 📋 Checklist tích hợp:

- [ ] ✅ Authentication flow implemented
- [ ] ✅ Token storage và refresh
- [ ] ✅ Error handling cho tất cả requests
- [ ] ✅ FCM token registration
- [ ] ✅ Camera management
- [ ] ✅ Event monitoring
- [ ] ✅ Push notification handling
- [ ] ✅ User profile management
- [ ] ✅ Settings synchronization
- [ ] ✅ Offline data handling
- [ ] ✅ Real-time updates (WebSocket)

## 🔄 CI/CD Pipeline

Hệ thống sử dụng GitHub Actions cho automated testing, security scanning, và deployment.

### Workflows

- **CI/CD Pipeline**: Chạy trên push/PR cho `main` và `develop`
  - Code quality (lint, format, type-check)
  - Unit tests với coverage
  - Security scanning (Snyk, Trivy)
  - Docker build & scan (chỉ main branch)

- **Dependency Review**: Kiểm tra dependencies trong PR
- **CodeQL Analysis**: Static code analysis
- **Release**: Tự động build và release khi tag version

### Setup Secrets

Trong GitHub repository Settings > Secrets:

```bash
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password
SNYK_TOKEN=your-snyk-token (optional)
```

### Badges

[![CI/CD](https://github.com/Kwoitd/healthcare_vision_backend/actions/workflows/ci.yml/badge.svg)](https://github.com/Kwoitd/healthcare_vision_backend/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Kwoitd/healthcare_vision_backend/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/Kwoitd/healthcare_vision_backend/actions/workflows/codeql-analysis.yml)
[![codecov](https://codecov.io/gh/Kwoitd/healthcare_vision_backend/branch/main/graph/badge.svg)](https://codecov.io/gh/Kwoitd/healthcare_vision_backend)

### Chi tiết

Xem [CI/CD Documentation](./docs/CI_CD.md) để biết thêm thông tin.

---

_Tài liệu được cập nhật liên tục. Kiểm tra docs/ folder để có phiên bản mới nhất._

(Để thử API cần nhấn Authorize, dán JWT token – chỉ token, không cần "Bearer " ở trước)

▶️ Chạy dự án

# Cài dependencies

npm install

# Dev (tự reload)

npm run start:dev

# Build & chạy production

npm run build npm run start:prod

Mặc định chạy tại:

API: http://localhost:3001

Swagger: http://localhost:3001/api/docs
