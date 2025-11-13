Below is the **professional English translation** of your entire README, rewritten fluently and clearly while preserving the structure and technical meaning.
I refined certain phrases to make it more natural in English for GitHub-style documentation.

---

# Detect Care – AI-Powered Patient Monitoring System

> A Flutter application that enables caregivers and medical staff to monitor patients in real time, receive immediate alerts for abnormal behaviors, and manage service subscriptions.

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture & Data Flow](#architecture--data-flow)
4. [Source Code Structure](#source-code-structure)
5. [System Requirements](#system-requirements)
6. [Quick Start](#quick-start)
7. [Useful Commands](#useful-commands)
8. [Configuration & Environment](#configuration--environment)
9. [Networking & ApiClient](#networking--apiclient)
10. [Subscription & Payment](#subscription--payment)
11. [Deployment & Operations](#deployment--operations)
12. [Contributing](#contributing)
13. [Documentation & Contact](#documentation--contact)

---

## Overview

Detect Care combines computer vision and AI to detect:

* Falls, seizures, and prolonged inactivity.
* Patients leaving the bed or disappearing from the camera’s field of view.
* Irregular activities in critical care environments.

Alerts are delivered to the mobile app, web dashboard, FCM push notifications, webhooks, or email to ensure caregivers can respond immediately.
This README focuses on guiding developers through setup, architecture, API communication standards, and common extension points.

---

## Key Features

* **Real-time AI detection**: YOLO/Pose-based model processes frames in a few hundred milliseconds.
* **Multi-channel alerting**: FCM push, webhook, email, and optional SMS fallback.
* **Strict role management**: doctor/nurse/admin/caregiver roles with camera quota control.
* **Flexible subscription system**: multiple service packages with upgrade/downgrade support and proration.
* **Cross-platform application**: Flutter (iOS/Android/Web/MacOS) + optional web dashboard.

---

## Architecture & Data Flow

1. **VisionCore (Ingest Layer)**

   * Receives RTSP/HTTP streams, takes periodic snapshots.
   * Sends frames into a queue (Kafka/Redis/AMQP).

2. **VisionAI (Analysis Layer)**

   * Worker nodes run YOLO/Pose models and return bbox, keypoints, and confidence.
   * Applies business rules (inactivity duration, danger zones, restricted areas, etc.).

3. **Backend API**

   * REST/WebSocket pipeline for event storage, alerting, user management, and subscription logic.
   * Integrates payment, webhook processing, and system notifications.

4. **Client Applications**

   * Flutter app for caregivers and doctors.
   * Next.js dashboard for admin/operations.

5. **Storage**

   * Media storage: S3/Cloudinary/NAS.
   * Metadata: PostgreSQL or MongoDB.
   * Observability stack: Prometheus + Grafana, centralized logs (Elastic/Sentry).

---

## Source Code Structure

```
detect_care_app/
├── lib/
│   ├── core/              # configuration, logger, networking, theme
│   ├── features/          # feature modules (alerts, subscription, media, ...)
│   ├── widgets/           # shared widgets across screens
│   └── services/          # supporting services (notifications, SMS, ...)
├── assets/                # icons, images, lottie animations
├── docs/, openapi/        # API documentation, OpenAPI specs
├── android/, ios/, web/, macos/, linux/, windows/
└── tools/, test/, coverage/
```

Each module lives under `lib/features/<module>`; for example,
`lib/features/subscription` contains APIs, providers, controllers, and mixins for subscription logic.

---

## System Requirements

* [Flutter](https://flutter.dev) ≥ 3.19 with corresponding Dart SDK.
* Android Studio or Xcode for native builds.
* FVM (recommended) to lock Flutter versions.
* Additional CLI tools:

  * `melos` (optional for workspace scripting)
  * `firebase-tools` (if using Firebase notifications/deployment)
* Test devices:

  * iOS 13+, Android 8+, Chrome (web)

Run `flutter doctor` to validate your environment.

---

## Quick Start

```bash
# 1. Clone repository
git clone <repo-url>
cd detect_care_app

# 2. Install dependencies
flutter pub get

# 3. Configure environment variables (see section below)
cp .env.dev .env.local   # or create manually

# 4. Run application
flutter run

# 5. Run tests
flutter test
```

> **Note:** The project uses multiple native plugins. If the build fails, check Gradle/Xcode logs or run `pod install` inside the `ios` directory.

---

## Useful Commands

| Task                   | Command                                        |
| ---------------------- | ---------------------------------------------- |
| Format & lint          | `flutter analyze`                              |
| Run all tests          | `flutter test`                                 |
| Run a specific test    | `flutter test test/<file>.dart`                |
| Watch AppLogger output | DevTools logging / `flutter run -v`            |
| Build Android release  | `flutter build apk --release`                  |
| Build IPA (CI)         | `flutter build ipa --export-options-plist ...` |

---

## Configuration & Environment

* **AppConfig** (`lib/core/config/app_config.dart`) reads environment variables for:
  `apiBaseUrl`, `wsBaseUrl`, `paymentConfig`, and more.
* `.env.dev` contains examples. Create `.env.local` or use Flutter flavors for `dev/staging/prod`.
* Important environment keys:

  * `API_BASE_URL`
  * `PAYMENT_BASE_URL`
  * `SENTRY_DSN`, `FIREBASE_*`
  * `SUPABASE_URL`, `SUPABASE_KEY` (if modules are enabled)

For CI/CD builds, inject variables via `--dart-define` or `flutter_dotenv`.

---

## Networking & ApiClient

All internal requests are routed through `ApiClient` (`lib/core/network/api_client.dart`):

* Automatically attaches Authorization header (Bearer) using `AuthStorage.getAccessToken`.
* Standardized response envelope:
  `{ success, data, message }`
  and throws structured exceptions for easier debugging.
* Supports mocking with `ApiProvider` in unit/integration tests.

Example:

```dart
class ServicePackageApi {
  final ApiClient _apiClient;
  ServicePackageApi()
      : _apiClient = ApiClient(tokenProvider: AuthStorage.getAccessToken);

  Future<List<Plan>> fetchPlans() async {
    final resp = await _apiClient.get('/plan');
    final data = _apiClient.extractDataFromResponse(resp);
    return (data as List).map((e) => Plan.fromJson(e)).toList();
  }
}
```

**Tip:** Use `package:http` only for third-party services; all internal backend calls should go through `ApiClient` for unified logging, retry, and error handling.

---

## Subscription & Payment

* Logic is located under `lib/features/subscription/`:

  * `data/`: API adapters (`ServicePackageApi`, `PaymentEndpointAdapter`)
  * `controllers/`: high-level `SubscriptionController` for UI
  * `mixins/`: `SubscriptionLogic` for fetching plans, selecting packages, payment guards
  * `screens/`: main UI including `select_subscription_screen.dart` and `payment/`

### Flow:

1. `SubscriptionLogic` loads available plans and determines the active one based on ID/code/price/name.
2. When upgrading, UI calls `upgradeSubscription` → backend prepares the transaction.
   If a `transactionId/payment_url` is returned, app redirects to `PaymentScreen`.
3. Free plans call `registerFreePlan` directly.

`AppLogger.api` uses Vietnamese messages to align with local operations; you may filter logs by `Subscription`/`Payment`.

---

## Deployment & Operations

* **Packaging**: backend + workers run in Docker, deployed via Kubernetes or ECS.
  Flutter apps are released via TestFlight, Firebase App Distribution, or official stores.

* **Monitoring & Observability**:

  * Metrics: Prometheus + Grafana
  * Errors: Sentry, Firebase Crashlytics
  * Alerting: PagerDuty/Slack webhooks from backend

* **AI Capability Levels**:

  1. Basic motion detection
  2. Pose estimation (YOLOv8-Pose) for fall detection
  3. Context-aware detection (patient history, medication schedule, etc.) to reduce false positives

---

## Contributing

1. Create a branch from `dev`: `feature/<name>` or `fix/<name>`.
2. Keep commits small and descriptive.
   Run `flutter format`, `flutter analyze`, and `flutter test` before pushing.
3. Open a Pull Request:

   * Describe the issue, solution, and attach screenshots for UI changes.
   * Add unit tests for critical logic.
   * Update README/CHANGELOG for major updates.

---

## Documentation & Contact

* API documentation: located in `docs/` & `openapi/`.
* Common endpoints:

  * `GET /api/cameras`
  * `GET /api/events`
  * `POST /api/uploads`
  * `POST /api/assignments`

Contact the **Vision AI Capstone Team**:
📧 **[datltmse@gmail.com](mailto:datltmse@gmail.com)**


