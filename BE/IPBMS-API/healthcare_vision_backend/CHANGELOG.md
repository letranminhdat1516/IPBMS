# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.6.0] - 2025-10-11

### 🔄 MAJOR: Invoice-Transaction Consolidation & API Cleanup

**Simplified billing architecture - Transactions now serve as invoice records**

### Added

- **Transactions Invoice Lifecycle**: Added `status`, `due_date`, `paid_at`, `payment_id` to transactions table
- **Direct Payment Linking**: 1-1 relationship between transactions and payments via `payment_id`
- **Migration Scripts**: Safe backfill from `payment_applications` to `transactions.payment_id`
- **Validation Scripts**: Reconciliation tools for data integrity checks

### Changed

- **API Consolidation**:
  - `/plans` endpoints merged into `/plan`
  - Invoice operations now use `/transactions` with status filtering
- **Status Mapping**: Legacy status values updated to invoice lifecycle
  - `'succeeded'` → `'paid'`
  - `'failed'` → `'void'`
  - `'pending'` → `'open'`
- **Seed Data**: Updated to create transactions with new lifecycle fields

### Deprecated

- **Invoice APIs**: `/invoices/*` endpoints (use `/transactions` instead)
- **Duplicate Plans**: `/plans` controller (use `/plan`)
- **Invoice Service**: `InvoiceService` (use `TransactionService`)

### Removed

- **Plans Controller**: `plans.controller.ts` merged into `plan.controller.ts`
- **Invoice Creation**: Seed no longer creates separate invoice records

## [unreleased] - 2025-10-19

### Changed - Support tickets migration to Prisma

- Migrated `ticket_history` operations from TypeORM to Prisma and standardized ticket persistence on Prisma.
- `TicketsService.create` now writes the ticket and initial `ticket_history` entry inside a single Prisma transaction to guarantee audit integrity.
- Added unit tests verifying transactional behavior and history logging on ticket creation and status updates.

### Added

- Tests: `test/tickets.transaction.spec.ts`, `test/tickets.history.spec.ts` covering create+history atomicity and status-change history logging.

### Migration Guide

```diff
# Plans API
- GET /plans → GET /plan
- GET /plans/premium → GET /plan/premium

# Invoice → Transaction
- GET /invoices → GET /transactions?status=paid
- POST /invoices → POST /transactions (status='open')
```

### Changed - Expanded history presentation & Swagger docs

- Standardized history endpoints (tickets, events, permission-requests, ...) to return expanded per-field diffs. Each history entry now includes a `change_count` integer and a `changes` array containing per-field diffs: `{ field, path, old, new }`.
- New query parameter `expand_limit` (default = 20, max = 100). Values >100 are clamped to 100; values <= 0 or non-integer will return HTTP 400. This limits the number of `changes` returned per history entry to control payload size.
- Replaced fragile JSON.stringify-based equality checks with deep-equality comparisons to detect nested/object diffs reliably.
- Sanitization applied to history metadata before persistence to avoid storing unserializable objects.
- Swagger docs updated to explicitly document the expanded-history response format and `expand_limit` behavior.

### Added - Tests

- Unit tests for `parseExpandLimit` and history expansion functions (tickets & events) to validate limit parsing and per-field diff detection.

## [3.5.0] - 2025-10-11

### Fixed - Schema Constraints & Data Integrity

**Critical fixes to prevent data corruption in subscription billing**

#### Schema Corrections

- **Removed**: `invoices.transaction_id` - Redundant column that created circular references
  - Relationship already exists via `transactions.invoice_id`
  - Eliminated potential data inconsistency
- **Renamed**: `subscription_histories.subscriptions` → `subscription` - Clearer singular naming for one-to-one relation

- **Confirmed**: Plan versioning strategy - Using `plans.code @unique` with `is_current` flag (no multi-version)

#### Database Constraints Added

**Referential Integrity:**

- `tx_invoice_same_subscription`: Ensures transaction and invoice belong to same subscription
- Transaction-invoice-subscription consistency enforcement

**Period Validity:**

- `tx_period_positive`: Transaction period_end > period_start
- `inv_period_positive`: Invoice period_end > period_start
- `sub_period_positive`: Subscription current_period_end > current_period_start
- `offer_dates_valid`: Offer end_date >= start_date (if not null)

**Amount Validation:**

- `payapp_amount_nonnegative`: Payment allocations must be >= 0
- `inv_total_nonnegative`: Invoice totals must be >= 0
- `inv_subtotal_nonnegative`: Invoice subtotals must be >= 0
- `tx_amount_nonnegative`: Transaction amounts must be >= 0
- `payment_amount_nonnegative`: Payment amounts must be >= 0

**Offer Rules:**

- `offer_discount_exclusive`: Must use either fixed amount OR percentage, not both
- `offer_percentage_range`: Discount percentage must be 0-100%

**Payment Allocation:**

- Trigger `trg_check_invoice_allocations`: Prevents over-allocation to invoices
- Function `check_invoice_allocations()`: Validates total allocations <= invoice total

#### Helper Views & Functions

- **View**: `v_invoice_payment_status` - Shows payment allocation status for each invoice
  - Fields: allocated_amount, remaining_amount, payment_status (unpaid/partially_paid/fully_paid)
- **Function**: `validate_transaction_plan_consistency()` - Checks plan_id matches plan_code
  - Returns transactions with mismatched plan references

#### Migration Files

- `prisma/migrations/20251011_fix_schema_constraints.sql` - Complete constraints migration
- Migration includes verification queries for data integrity checks

#### Documentation

- `docs/business-rules/SCHEMA_CONSTRAINTS_INTEGRITY.md` - Complete guide with examples
  - All constraint rules explained with code examples
  - Verification queries for data validation
  - Best practices for application code
  - Relationship diagram after fixes

### Changed - Subscription Histories Enhancement

**Simplified approach: Use only `subscription_histories` (no separate `plan_history` table)**

#### Schema Enhancements

- **Added normalized columns** to `subscription_histories`:
  - `old_plan_code`, `new_plan_code`: Fast plan change queries
  - `old_status`, `new_status`: Status transition tracking
  - `triggered_by`: User who triggered the event
  - `reason`: Human-readable event reason
  - Indexes on all new columns for performance

- **Removed** `plan_history` table:
  - Redundant with enhanced subscription_histories
  - Simpler architecture with single source of truth
  - Views provide denormalized data when needed

#### Database Views

- `v_subscription_current_plan`: Fast current plan lookup (O(1))
- `v_user_plan_timeline`: Reconstructed plan timeline from events
- Both views eliminate need for separate plan_history table

#### Benefits

- **Simplicity**: One source of truth for subscription events
- **Flexibility**: JSON `event_data` for unlimited metadata
- **Performance**: Normalized columns + indexes = fast queries
- **Maintainability**: No trigger sync between tables

#### Migration Files

- `prisma/migrations/20251011_enhance_subscription_events.sql`
  - Add normalized columns with indexes
  - Create helper views
  - Backfill data from existing event_data JSON
  - Keep `offer` table (useful for marketing)

#### Documentation

- `docs/business-rules/SUBSCRIPTION_HISTORIES_ENHANCED.md` - Complete implementation guide
  - Usage examples with TypeScript + SQL
  - Query performance comparison
  - Best practices for populating normalized columns

## [3.4.0] - 2025-10-11 (DEPRECATED - See 3.5.0)

### Note

This version's approach with separate `plan_history` table was simplified in 3.5.0.
Use enhanced `subscription_histories` instead for better maintainability.

### Added - Enhanced Subscription Schema (Original Design)

**New tables based on Vertabelo diagram for improved subscription management**

#### Database Schema Changes

- **`user_group` table**: Multi-tenant/organization support (REMOVED in 3.5.0)
- **`plan_history` table**: Plan timeline tracking (REMOVED in 3.5.0 - Use subscription_histories instead)
- **`offer` table**: Promotional offers and discounts (KEPT in 3.5.0)
  - Fixed amount or percentage discounts
  - Time-based promotions (start/end dates)
  - Duration-limited offers (e.g., 3 months discount)
  - Flexible discount rules

- **Enhanced `subscriptions` table**:
  - `user_group_id`: Link to user group/organization
  - `offer_id`: Applied promotional offer
  - `offer_start_date` & `offer_end_date`: Offer validity tracking

- **Enhanced `invoices` table**:
  - `plan_history_id`: Reference to specific plan period
  - `customer_invoice_data`: Custom billing information
  - Better linking between invoices and plan timelines

#### Database Functions & Views

- **Trigger**: `update_plan_history()` - Auto-maintains plan timeline
- **View**: `v_subscription_current_plan` - Easy access to current plan info
- **Function**: `get_user_plan_timeline(user_id)` - Query complete plan history

#### Documentation

- Added `docs/business-rules/USER_GROUP_PLAN_HISTORY_OFFER.md` - Complete schema guide
- Added `docs/business-rules/QUICK_START_NEW_SCHEMA.md` - Quick deployment guide
- Added `docs/business-rules/IMPLEMENTATION_SUMMARY.md` - Implementation checklist

#### Migration

- Migration file: `prisma/migrations/20251011_add_user_group_plan_history_offer.sql`
- Idempotent and safe for production
- Includes data migration for existing subscriptions

### Benefits

- **Performance**: Denormalized plan history eliminates event reconstruction
- **Clarity**: Period-based data model easier to understand than event-based
- **Analytics**: Direct SQL queries for revenue and usage reports
- **Flexibility**: Support for family accounts, organizations, and promotional offers
- **Audit Trail**: Complete history of plan changes and offers applied

### Migration Guide

See `docs/business-rules/QUICK_START_NEW_SCHEMA.md` for deployment instructions.

---

## [3.3.1] - 2025-10-03

### ✅ Subscription Pricing Logic - Verified & Production Ready

**Comprehensive verification and documentation of subscription upgrade pricing system**

### Verified & Tested

- **Proration Calculation**: Confirmed accurate proration based on remaining billing period
  - Formula: `amountDue = (newPrice - oldPrice) * (remainingTime / totalPeriodTime)`
  - Handles edge cases: free upgrades, full period upgrades, partial period calculations

- **Upgrade Flow**: Complete upgrade process from preparation to application
  - `prepareUpgrade()`: Calculates proration and creates pending transaction
  - `applyUpgradeOnPaymentSuccess()`: Updates plan code immediately after payment
  - `createAutoRenewalPayment()`: Uses full price of new plan for subsequent renewals

- **Plan Update Timing**: Plan code updates immediately upon successful upgrade
  - No delay between payment success and plan activation
  - Frontend APIs return updated plan information immediately

### Testing Results

- **Unit Tests**: All 5 upgrade test cases passing ✅
- **Proration Accuracy**: Verified calculations for various scenarios
- **Edge Cases**: Idempotency, invalid plans, free upgrades handled correctly
- **API Integration**: All endpoints working with existing frontend

### Documentation Updates

- **Pricing Guide Updated**: `PRICING_CALCULATION_UPGRADE_GUIDE.md` v1.1.0
  - Added implementation status section
  - Verified all calculations and examples
  - Added production readiness checklist
- **API Documentation**: Confirmed compatibility with existing frontend
- **Business Rules**: All documented rules implemented correctly

### Technical Validation

- **Database Schema**: Transaction and subscription tables support full workflow
- **Payment Integration**: VNPay integration working correctly
- **Error Handling**: Comprehensive error handling for all failure scenarios
- **Logging**: Detailed audit logs for all upgrade operations

### Impact Assessment

- **Frontend Compatibility**: ✅ No changes required - existing APIs sufficient
- **Mobile App**: ✅ No changes required - APIs compatible
- **Production Deployment**: ✅ Ready for deployment
- **Backward Compatibility**: ✅ All existing functionality preserved

## [3.3.0] - 2025-09-24

## [3.3.0] - 2025-09-24

### ✅ New Controllers Added - Enhanced System Functionality

**Added 5 new controllers with complete API documentation and testing:**

### Added

- **Search Controller** (`search.controller.ts`): Unified search across events, caregivers, and invoices
  - `GET /search/unified` - Advanced search with keyword, date, status, and confidence filtering
  - Support for pagination and multi-entity search results

- **Audit Controller** (`audit.controller.ts`): Complete audit trail system
  - `POST /audit/events` - Create audit events with actor tracking
  - `GET /audit/users/{userId}/events` - User-specific audit logs
  - `GET /audit/events/summary` - Audit events summary
  - `GET /audit/events` - All audit events (admin only)

- **Emergency Contacts Controller** (`emergency-contacts.controller.ts`): Emergency contact management
  - `GET /users/{userId}/emergency-contacts` - List emergency contacts
  - `POST /users/{userId}/emergency-contacts` - Create emergency contact
  - `PUT /users/{userId}/emergency-contacts/{contactId}` - Update emergency contact
  - `DELETE /users/{userId}/emergency-contacts/{contactId}` - Delete emergency contact

- **Camera Error Tickets Controller** (`camera-error-tickets.controller.ts`): Camera error reporting system
  - `POST /camera-error-tickets` - Create camera error ticket with attachments
  - `GET /camera-error-tickets` - Get user's camera error tickets
  - `GET /camera-error-tickets/{id}` - Get specific ticket details
  - `PATCH /camera-error-tickets/{id}` - Update ticket status

- **Caregiver Shared Permissions Controller** (`caregiver-shared-permissions.controller.ts`): Enhanced caregiver permissions
  - `GET /caregivers/{caregiverId}/shared-permissions` - Get shared permissions for caregiver

### Documentation

- **API Master List Updated**: Version 3.3.0 with 63+ controllers documented
- **Modular Documentation**: Split large documentation files into focused modules
- **Comprehensive Coverage**: All new endpoints documented with examples and parameters

### Technical Details

- **JWT Authentication**: All new endpoints secured with JWT tokens
- **Role-based Access Control**: Proper admin, caregiver, customer role enforcement
- **Input Validation**: Comprehensive request validation and error handling
- **Audit Logging**: Automatic audit trail for sensitive operations
- **Search Optimization**: Advanced filtering and pagination support

## [3.2.9] - 2025-09-23

### ✅ Caregiver Health Report Support

**Implemented role-based health report access for caregivers with comprehensive backend fixes:**

### Added

- **Caregiver Event Access**: Caregivers can now view health events for assigned customers via `/health-report/overview`
- **Role-based Repository Method**: Added `findByRangeForCaregiver` in EventsRepository for caregiver-specific queries
- **Debug Logging**: Added backend logs in HealthAnalyticsService for role and event counts
- **Database View**: Created `caregiver_event_view.sql` for optimized caregiver event queries
- **RLS Policy Template**: Added Row Level Security policy for caregiver access to event_detections table

### Fixed

- **JWT Payload Property Mismatch**: Fixed `req.user.user_id` → `req.user.userId` in multiple controllers
- **Health Report Controller**: Updated to pass `req.user.role` to analytics service methods
- **Type Safety**: Ensured consistent userId property usage across all controllers

### Changed

- **HealthAnalyticsService**: Enhanced with role parameter and caregiver logic routing
- **API Documentation**: Updated both `API_MASTER_LIST.md` and `API_DOCUMENTATION.md` with caregiver support details
- **Version Updates**: Bumped documentation version to 3.2.9

### Technical Details

- **Role-based Logic**: Service automatically uses caregiver methods when `role === 'caregiver'`
- **Event Fetching**: Caregivers see events from customers they are assigned to via shared permissions
- **Backend Validation**: Added comprehensive debug logs for troubleshooting zero-event issues
- **Database Optimization**: Created helper view for efficient caregiver event queries

## [3.2.3] - 2025-09-22

### ✅ Invoice Management API - Frontend Compatibility

**Implemented complete invoice management system with full frontend compatibility:**

### Added

- **Invoice Controller**: New `invoice.controller.ts` with standardized API responses
- **Invoice Service**: Enhanced `invoice.service.ts` with proper data transformation
- **Frontend-Compatible Response Format**:
  - `GET /invoices` returns `{ success: true, data: { items: [...], total: 123, page: 1, limit: 20 } }`
  - `GET /invoices/{id}` returns `{ success: true, data: { invoice: {...} } }`
- **Line Items Structure**: Updated to match frontend expectations (`name`, `quantity`, `unit_price`, `total`, `description`)
- **Date Format Conversion**: `issued_at` and `paid_at` converted from Date objects to ISO8601 strings
- **Status Mapping**: Proper invoice status values (`issued`, `paid`, `failed`)

### Changed

- **API Response Standardization**: All invoice endpoints now return consistent response format
- **Data Structure Updates**: InvoiceData interface updated to match frontend model
- **Documentation Updates**: Added comprehensive invoice API documentation in both `API_DOCUMENTATION.md` and `API_MASTER_LIST.md`

### Technical Details

- **Invoice Generation**: Based on successful transactions (`status: 'succeeded'` or `'booked'`)
- **Line Items**: Include plan name, period, VAT, and discounts with proper calculations
- **Pagination**: Full pagination support with `page`/`limit` parameters
- **Authentication**: JWT-based user-specific invoice access
- **Badge Count Support**: `data.total` field supports mobile app badge count functionality

## [3.2.2] - 2025-09-21

### 📚 Documentation

**Completed comprehensive API documentation audit:**

### Added

- **Documentation Coverage Verification**: Systematic audit of all 30+ controllers
- **API_MASTER_LIST.md & API_DOCUMENTATION.md Synchronization**: Ensured both docs files are fully synchronized
- **Controller Documentation Status**: Verified documentation for all controllers including:
  - `activity-logs`, `admin-plans`, `admin-users`, `ai-configurations`, `ai-processing-logs`
  - `alerts`, `assignments`, `audit`, `auth`, `camera-error-tickets`, `camera-settings`
  - `cameras`, `caregivers`, `cloudinary`, `customers`, `daily-summaries`, `dashboard`
  - `device-sync`, `emergency-contacts`, `events`, `fcm`, `health-report`, `image-settings`
  - `invoice`, `mail`, `notification-preferences`, `notifications`, `payment`, `permissions`
  - `quota`, `roles`, `settings`, `shared-permissions`, `snapshots`, `subscription`
  - `thread-memory`, `tickets`, `uploads`, `user-room-assignments`, `users`, `vnpay`
- **Services Integration Documentation**: Documented services without dedicated controllers (`shared-otp`, `twilio`, `stringee`, `firebase`)

### Changed

- **Version Numbers**: Updated to version 3.2.2 in both documentation files
- **Documentation Quality Assurance**: Verified all endpoints have proper examples, auth requirements, and error handling

## [2.4.0] - 2025-09-17

### 🚨 CRITICAL FIXES - Production Ready

**Fixed API endpoints causing 404/500 errors in Flutter app and admin web:**

### Fixed

- **Plan Current Endpoint**: Fixed `/api/plan/current` returning 404
  - **Root Cause**: Subscription service not setting `plan_id` relationship
  - **Solution**: Updated `createFree()` method to properly set both `plan_code` and `plan_id`
  - **Impact**: Flutter app can now successfully get user plan information

- **Camera Creation Endpoint**: Added missing `POST /api/cameras` endpoint
  - **Root Cause**: Controller missing POST method for camera creation
  - **Solution**: Implemented complete endpoint with proper DTO validation and logging
  - **Impact**: Users can now create cameras through mobile app

- **Plan Version Management**: Fixed admin plan activation allowing multiple active versions
  - **Root Cause**: `deactivateOtherVersions` using code-based exclusion instead of ID-based
  - **Solution**: Implemented ID-based exclusion in repository method
  - **Impact**: Business rule "one active version per plan code" now properly enforced

- **Database Schema Issues**: Fixed quota service handling missing `file_size` column
  - **Root Cause**: Query attempting to access non-existent column
  - **Solution**: Added proper column existence checking and fallback logic
  - **Impact**: Quota calculations work correctly without database errors

### Added

- **Plan Deactivation Endpoint**: New `POST /api/admin/plans/versions/:id/deactivate`
  - Allows manual deactivation of plan versions
  - Includes proper cache invalidation
  - Maintains database consistency

### Enhanced

- **Admin Plans Repository**:
  - Added `findPlanById()` and `updatePlanById()` methods
  - Improved `deactivateOtherVersionsByCode()` with ID-based exclusion
  - Better error handling and validation

- **Admin Plans Service**:
  - Enhanced `activatePlanVersion()` with proper version management
  - Added `deactivatePlanVersion()` method
  - Improved cache invalidation patterns

- **Documentation**:
  - Updated API_DOCUMENTATION.md with v2.4.0 changes
  - Enhanced API_MASTER_LIST.md with fixed endpoints
  - Created FRONTEND_INTEGRATION_GUIDE.md for quick reference
  - Added testing examples and curl commands

### Technical Improvements

- **Business Logic Enforcement**: Database-level consistency for plan versioning
- **Error Handling**: Improved error responses with standardized format
- **Cache Management**: Proper cache invalidation on plan state changes
- **Testing**: All fixes validated with curl commands and database verification

### Migration Notes

Frontend teams should:

1. Update plan current API calls to use `/api/plan/current` (not `/api/subscription/current`)
2. Implement camera creation using new `POST /api/cameras` endpoint
3. Update admin plan management to use fixed activation/deactivation endpoints
4. Handle standardized response format: `{success: boolean, data: any}`

## [2.2.4] - 2025-09-12

### Added

- **🏗️ TypeORM to Prisma Migration (90% Complete)**
  - **Core Business Services**: Fully migrated payment, subscription, transaction services
  - **Repository Pattern**: Implemented BasePrismaRepository with UnitOfWork transaction management
  - **Type Safety**: Full Prisma Client v6.14.0 integration with TypeScript
  - **Advanced Features**: PostgreSQL advisory locks, BigInt support, raw SQL for performance
  - **Hybrid Architecture**: Core business logic on Prisma, specialized FCM services on TypeORM
  - **Documentation**: Comprehensive migration status documentation in `docs/MIGRATION_STATUS.md`

### Technical Improvements

- **Modern ORM Architecture**: Repository pattern with dependency injection
- **Transaction Management**: UnitOfWork service for complex multi-table operations
- **Performance Optimization**: Raw SQL queries for performance-critical operations
- **Business Logic**: Complex proration calculations, payment processing, subscription lifecycle
- **Error Handling**: Comprehensive try-catch blocks with detailed logging
- **Code Quality**: 0 TypeScript compilation errors, ESLint compliant

### Migrated Services (29 total)

- ✅ **PaymentService** - VNPay integration & billing
- ✅ **SubscriptionService** - Subscription lifecycle management
- ✅ **TransactionService** - Financial transaction records
- ✅ **QuotaService** - Resource quota management
- ✅ **AdminPlansService** - Subscription plan management
- ✅ **AdminUsersService** - User administration
- ✅ **DashboardService** - Analytics & reporting
- ✅ **ActivityLogsRepository** - Audit trail management
- ✅ **EventsRepository** - Health event detection
- ✅ **UsersRepository** - User profile management
- ✅ **CaregiversRepository** - Caregiver management
- ✅ **EmergencyContactsRepository** - Emergency contact system
- ✅ **PatientMedicalRecordsRepository** - Medical records
- ✅ **SystemSettingsRepository** - Application configuration
- ✅ **FcmTokenCleanupScheduler** - Token cleanup automation
- ✅ **20+ Additional Domain Repositories** - Full repository pattern implementation

### Remaining TypeORM Services (Strategic)

- ⚠️ **FCM Services** (3 services) - Complex query builders, stable operation
- ⚠️ **Assignment/Room Management** (2 services) - Low business impact

## [2.2.4] - 2025-09-11

### Added

- **Complete API Documentation**: Comprehensive documentation for all missing API endpoints
  - **Caregiver Invitations APIs**: Complete caregiver-customer invitation management
    - `GET /caregiver-invitations` - List all invitations with filtering
    - `GET /caregiver-invitations/caregiver/me` - Caregiver's invitations
    - `GET /caregiver-invitations/customer/me` - Customer's invitations
    - `POST /caregiver-invitations/:id/accept` - Accept invitation
    - `POST /caregiver-invitations/:id/reject` - Reject invitation
  - **Snapshots APIs**: Image capture and management system
    - `POST /snapshots` - Create new snapshot
    - `POST /snapshots/:id/images` - Upload snapshot images
    - `PUT /snapshots/:id/images` - Update snapshot images
    - `DELETE /snapshots/:id/images/:imageId` - Delete specific image
  - **AI Processing Logs APIs**: AI operation tracking and monitoring
    - `GET /ai-processing-logs` - List AI processing logs
    - `POST /ai-processing-logs` - Create new AI log entry
    - `PUT /ai-processing-logs/:id` - Update AI log
    - `DELETE /ai-processing-logs/:id` - Delete AI log
  - **Camera Settings APIs**: Camera configuration management
    - `GET /camera-settings` - List camera settings
    - `POST /camera-settings/:cameraId/report-issue` - Report camera issues
    - `PUT /camera-settings/:id` - Update camera settings
  - **Alert Settings APIs**: User alert preferences
    - `GET /alert-settings` - Get alert settings
    - `PUT /alert-settings/:key/toggle` - Toggle alert settings
  - **Daily Summaries APIs**: Daily activity summaries
    - `GET /daily-summaries` - List daily summaries
    - `POST /daily-summaries` - Create daily summary
    - `PUT /daily-summaries/:id` - Update daily summary
  - **Thread Memory APIs**: AI conversation memory management
    - `POST /thread-memory` - Create thread memory
    - `PUT /thread-memory/:id` - Update thread memory
    - `DELETE /thread-memory/:id` - Delete thread memory
  - **User Room Assignments APIs**: Room assignment management
    - `GET /user-room-assignments` - List room assignments
    - `POST /user-room-assignments` - Create room assignment
    - `PUT /user-room-assignments/:id` - Update room assignment
  - **Notification Preferences APIs**: User notification settings
    - `GET /notification-preferences` - Get notification preferences
    - `PUT /notification-preferences/quiet-hours` - Set quiet hours
    - `PUT /notification-preferences/system-events/toggle` - Toggle system events
    - `PUT /notification-preferences/push/toggle` - Toggle push notifications
  - **Subscription APIs**: Subscription management system
    - `GET /subscription` - List subscriptions
    - `POST /subscription/:id/pause` - Pause subscription
    - `POST /subscription/:id/resume` - Resume subscription
    - `POST /subscription/:id/cancel` - Cancel subscription
    - `POST /subscription/:id/upgrade` - Upgrade subscription
  - **APIs cấu hình**: Quản lý cấu hình người dùng và cấu hình hệ thống
    - `PUT /settings/admin/:userId/:key` - Admin cập nhật tùy chọn người dùng
    - `PUT /settings/:key` - User personal settings
  - **User Management APIs**: Administrative user management
    - `GET /user-management/users` - List all users
    - `GET /user-management/users/:userId/full-details` - Full user details
    - `GET /user-management/statistics` - User statistics

### Fixed

- **Tickets APIs**: Corrected HTTP methods and added access control documentation
  - Fixed `/tickets/:id/status` from PUT to PATCH
  - Added comprehensive role-based access control information
  - Documented pagination parameters for admin users

### Documentation

- **API Master List**: Updated to include all previously missing API endpoints
- **Version Updates**: Updated version numbers across all documentation files
- **Access Control**: Added detailed role-based permissions for all endpoints

## [2.2.3] - 2025-09-11

### Added

- **Device Health APIs**: Complete device monitoring and health check system
  - `GET /device-sync/status` - Device connection status
  - `GET /device-sync/devices/:deviceId/health` - Individual device health check
  - `GET /device-sync/devices/health-summary` - Admin view of all device health
  - `POST /device-sync/devices/:deviceId/ping` - Ping device for health verification
  - `POST /device-sync/devices/:deviceId/restart` - Remote device restart capability
  - `PUT /device-sync/devices/:deviceId/config` - Update device configuration
  - `DELETE /device-sync/devices/:deviceId` - Disconnect device
- **Shared Permissions APIs**: Permission management between customers and caregivers
  - `PUT /customers/:customer_id/shared-permissions/:caregiver_id` - Update sharing permissions
  - `DELETE /customers/:customer_id/shared-permissions/:caregiver_id` - Revoke sharing permissions

### Enhanced

- **API Documentation**: Added comprehensive device health and shared permissions sections
- **Version Consistency**: Updated all version references to 2.2.3 across the project

## [2.2.2] - 2025-09-11

### Added

- **Emergency Contacts API**: Complete CRUD operations for patient emergency contacts
  - `GET /users/:id/emergency-contacts` - List emergency contacts (newly implemented)
  - `POST /users/:id/emergency-contacts` - Create emergency contact
  - `PUT /users/:id/emergency-contacts/:contactId` - Update emergency contact
  - `DELETE /users/:id/emergency-contacts/:contactId` - Delete emergency contact
- **Device Management API**: Enhanced device listing with proper Swagger documentation
  - `GET /users/:id/devices` - List user's registered devices with FCM tokens
  - Added comprehensive Swagger documentation with response schema
  - Activity logging for device access tracking

### Fixed

- **404 Error Resolution**: Fixed missing GET endpoint for emergency contacts
- **API Documentation**: Added missing patient information section to API master list
- **Swagger Coverage**: Ensured all endpoints have proper OpenAPI documentation

### Changed

- **API Master List**: Added comprehensive patient information APIs section
- **Version Update**: Updated all documentation files to version 2.2.2
- **Documentation**: Enhanced API documentation with latest endpoint changes

## [2.2.1] - 2025-09-11

### Added

- **Admin Plans Management**: Complete admin interface for managing plans and their versions
  - `GET /admin/plans?withVersions=all` - View all plans with all their versions
  - `POST /admin/plans/versions/:id/activate` - Activate specific plan version
  - Full CRUD operations for plans and plan versions
  - Statistics and comparison endpoints for plan usage analysis
- **Enhanced Swagger Documentation**: Updated admin-plans API documentation with detailed parameter descriptions
- **Version Management**: Improved plan version handling with effective dates and current version tracking

### Changed

- **Version Update**: Updated all documentation files to version 2.2.1
- **API Master List**: Comprehensive documentation of all admin-plans endpoints
- **Swagger Configuration**: Updated main.ts Swagger version to 2.2.1

## [2.1.2] - 2025-09-11

## [Unreleased]

### Added

- CI/CD Pipeline với GitHub Actions
  - Automated testing cho mọi push/PR
  - Docker image scanning với Trivy
  - Dependency vulnerability checks với Snyk
  - CodeQL static analysis
  - Dependency review cho PR
  - Release automation với Docker image tagging
- Dependabot configuration cho automated dependency updates
- CODEOWNERS file cho code review management
- Comprehensive CI/CD documentation
- **Enhanced `/api/auth/me` endpoint** với thông tin bệnh nhân:
  - Customer role: Hiển thị thông tin patient (chính họ)
  - Caregiver role: Hiển thị danh sách patients được assign kèm permissions
  - Updated API documentation và Swagger specs
- **Global Response Wrapper Interceptor** - Chuẩn hóa format response API:
  - Tất cả API responses giờ đây đều có format thống nhất: `{success, data, message, timestamp, pagination}`
  - Global interceptor tự động wrap tất cả responses thành công
  - Error responses có format chuẩn: `{success: false, error: {code, message, details}, timestamp}`
  - Backward compatibility được duy trì
  - TypeScript interfaces được cập nhật với timestamp field

### Changed

- Updated Jest configuration to remove deprecated `globals` option
- Added `"type": "module"` to package.json for better ESM support
- Fixed Dockerfile port consistency (EXPOSE 3002)
- Enhanced README with CI/CD badges and documentation
- **API Response Format Standardization**:
  - Updated tất cả endpoints để sử dụng response wrapper interceptor
  - Enhanced utility functions với timestamp support
  - Updated global exception filter cho error response consistency
  - Improved type definitions với timestamp field trong ApiResponse interfaces

### Security

- Added Trivy vulnerability scanning for source code and Docker images
- Integrated Snyk for dependency vulnerability detection
- Added CodeQL security analysis
- Configured dependency review for license and vulnerability checks

## [1.0.0] - 2025-09-03

### Added

- Initial release của Healthcare Vision Backend
- NestJS framework với TypeScript
- Prisma ORM với PostgreSQL
- JWT authentication với role-based access control
- FCM push notifications
- WebSocket real-time communication
- Swagger API documentation
- Docker containerization
- Comprehensive test suite với Jest
- ESLint và Prettier code formatting
- Husky pre-commit hooks
- Rate limiting và security middleware
- Health check endpoints
- Multi-environment configuration

### Infrastructure

- Docker Compose setup cho development
- Production-ready Dockerfile với multi-stage build
- Database migrations và seeding
- Environment configuration management
- Logging và error handling

### Documentation

- API documentation với Swagger
- Authentication guides
- Frontend integration examples
- Deployment instructions
- Development workflow documentation

---

## Guidelines for Changelog Updates

### Types of Changes

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** in case of vulnerabilities

### Version Numbering

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

### Release Process

1. Update version in `package.json`
2. Create git tag: `git tag v1.2.3`
3. Push tag: `git push origin v1.2.3`
4. GitHub Actions will automatically create release và build Docker image
