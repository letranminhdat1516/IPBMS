

# 🌐 Healthcare Vision AI — Unified Patient Monitoring Platform

### AI-powered real-time fall detection, seizure monitoring, caregiver workflow, and medical data management.

Healthcare Vision AI is an end-to-end intelligent healthcare monitoring platform consisting of:

* **VisionEdge AI (Python)** – Camera streaming, frame extraction, on-device AI inference
* **Healthcare Backend (NestJS)** – Event pipeline, user management, subscription & billing
* **Admin Dashboard (React + ShadcnUI)** – Operational dashboard, provider & system management
* **Caregiver Mobile App (Flutter)** – Real-time patient alerts, medical info, caregiver workflow

This README provides a **high-level system overview** across all components.

---

# 🧭 System Overview

The Healthcare Vision AI ecosystem enables hospitals, clinics, home-care agencies, and caregivers to detect abnormal patient behaviors—such as falls, seizures, prolonged inactivity, or leaving the bed—in real time.

The system is built with:

* **AI Computer Vision** (YOLO Pose / MediaPipe)
* **Realtime Event Streaming**
* **Multi-channel alerting**
* **Caregiver-first workflows**
* **Enterprise-grade security**
* **Flexible healthcare subscription plans**

It supports large-scale deployment from single-room homecare to hospital-level operations.

---

# 🏗️ High-Level Architecture

```
            ┌───────────────────────────────────────────────┐
            │                    VisionEdge AI               │
            │  • RTSP Streaming                             │
            │  • Frame Extraction                           │
            │  • Fall & Seizure Detection (YOLO/Pose)       │
            │  • Snapshot Uploading                         │
            └──────────────┬────────────────────────────────┘
                           |
                           v
┌────────────────────────────────────────────────────────────────────────┐
│                   Healthcare Backend (NestJS + PostgreSQL)             │
│  • User / Role / Permission Management                                 │
│  • Camera & Room Management                                             │
│  • Event Pipelines (Fall/Seizure/Alerts)                                │
│  • Realtime WebSocket + Supabase Option                                 │
│  • Subscription & Payment (VNPay)                                       │
│  • Audit Logs / System Health / Monitoring                              │
└───────────────────────┬─────────────────────────────────────────────────┘
                        |
          ┌─────────────┼──────────────────────┐
          v             v                      v
┌────────────────┐ ┌──────────────────┐ ┌───────────────────────────────┐
│ Admin Dashboard│ │ Caregiver Mobile │ │ Customer Mobile (future)      │
│ React + Shadcn │ │ Flutter App      │ │ Patient / Family Monitoring   │
│ • Analytics    │ │ • Realtime Alerts│ │ • Delayed Alerts (30s rule)   │
│ • Providers    │ │ • Assignments    │ │ • Medical Records             │
│ • Billing      │ │ • Medical Info   │ │ • Subscriptions               │
└────────────────┘ └──────────────────┘ └───────────────────────────────┘
```

---

# 🧠 Core Capabilities

## 1️⃣ VisionEdge AI (Python – On-device Inference)

* RTSP camera streaming (IMOU, IP camera…)
* Keyframe extraction
* YOLOv8-Pose: fall detection & posture analysis
* VSViG / MediaPipe seizure detection (optional)
* Snapshot uploading to backend
* Runs on Orange Pi / Jetson / PC

## 2️⃣ Backend API (NestJS)

* Modular architecture with clean layer separation
* Event ingestion & alert classification
* User roles: Admin, Doctor, Nurse, Caregiver, Customer
* Medical assignment system
* Camera & room management
* AI event logs & snapshot history
* Subscription plans (free/standard/premium)
* VNPay payment + proration
* System health monitoring, retries, caching, rate limiting

## 3️⃣ Admin Dashboard (React + ShadcnUI)

* Full medical operations dashboard
* Patient & caregiver management
* Vision AI camera status and diagnostic tools
* Real-time system health widget
* Activity logs & compliance tracking
* Billing & subscription management
* Enhanced error boundaries + exponential backoff retry
* Network-aware UI (detect offline/online)

## 4️⃣ Caregiver Mobile App (Flutter)

* Real-time alerts with sound + critical popup
* Intelligent 30-second delayed customer alert pipeline
* Patient medical information
* Assignments (daily tasks & shift workflows)
* Multi-channel notifications: push, SMS, email, call
* Configurable image retention & alert settings
* Supabase Realtime + REST fallback
* Service-layer business logic: SLA, escalation, validity checks

---

# 📁 Monorepo Directory Structure (Recommended)

```
healthcare-vision-ai/
├── edge/                   # VisionEdge AI (Python)
├── backend/                # NestJS API
├── admin-dashboard/        # React + ShadcnUI dashboard
└── caregiver-app/          # Flutter mobile app
```

---

# 🔐 Security & Compliance

* Role-based access control (RBAC)
* 21 permission seeds for fine-grained healthcare access
* JWT authentication with refresh lifecycle
* Audit logs (user activities, system anomalies)
* Health checks for cameras, services & workers
* Encrypted storage for medical snapshots
* Compliant patient data handling design

---

# 🚨 Alert Processing Pipeline

### Caregiver path

1. VisionEdge detects abnormal event
2. Backend stores event + snapshot
3. Realtime push to caregiver mobile app
4. Caregiver can **acknowledge / cancel / escalate**

### Customer path (patient family)

* Alerts delayed **30 seconds**
* If caregiver cancels → customer alert suppressed
* Reduces false positives in homecare setting

---

# 📊 Admin Dashboard Features

* Medical dashboard with real-time stats
* Patient list, medical history, caregiver assignments
* Vision camera list + stream health
* Error boundaries + retry logic
* System uptime, service endpoints health monitor
* Subscription & billing
* Full Vietnamese localization

---

# 📱 Mobile App Features

* Realtime alerts
* Popup + alarm sound
* Medical info & habits
* Assignments system
* Multi-channel notifications
* Supabase Realtime listener
* REST fallback for offline-first reliability

---

# 🧰 Tech Stack Summary

| Layer     | Technology                                                  |
| --------- | ----------------------------------------------------------- |
| Edge AI   | Python, YOLOv8-Pose, OpenCV, MediaPipe                      |
| Backend   | NestJS 11, Prisma, PostgreSQL, Redis, WebSocket             |
| Dashboard | React 18, TypeScript, ShadcnUI, TanStack Query/Router       |
| Mobile    | Flutter 3, Supabase Realtime, Provider/Service architecture |
| DevOps    | Docker, CI/CD, Supabase optional, S3/Cloudinary             |

---

# 🚀 Development Quick Start

## Clone monorepo

```bash
git clone [https://github.com/letranminhdat1516/IPBMS](https://github.com/letranminhdat1516/IPBMS)
```

---

# 💬 Contact

**Vision AI Capstone Team**
📧 [datltmse@gmail.com](mailto:datltmse@gmail.com)

