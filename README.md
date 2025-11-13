# 🌐 Healthcare Vision AI — Unified Patient Monitoring Platform

### AI-powered real-time fall detection, seizure monitoring, caregiver workflow, blockchain-backed verification, and medical data integrity.

Healthcare Vision AI is an end-to-end intelligent healthcare monitoring platform consisting of:

* **VisionEdge AI (Python)** – Camera streaming, frame extraction, on-device AI inference
* **Healthcare Backend (NestJS)** – Event pipeline, user management, subscription & billing
* **Admin Dashboard (React + ShadcnUI)** – Operational dashboard, provider & system management
* **Caregiver Mobile App (Flutter)** – Real-time patient alerts, medical info, workflow
* **Polkadot Verification Layer (Blockchain)** – On-chain integrity proofs for medical snapshots

This README provides a **high-level system overview** for AI, healthcare, and blockchain competition submission.

---

# 🧭 System Overview

The Healthcare Vision AI ecosystem enables hospitals, clinics, home-care agencies, caregivers, and patient families to detect abnormal behaviors such as:

* Falls
* Seizures
* Prolonged inactivity
* Leaving the bed
* Unsafe movement patterns

The system integrates:

* **Computer Vision AI (YOLOv8-Pose, VSViG, MediaPipe)**
* **Edge computing**
* **Realtime event streaming**
* **Multi-channel notifications**
* **Healthcare workflows**
* **Blockchain integrity verification (Polkadot Parachain)**

Deployable from single-room homecare to full-scale hospitals.

---

# 🏗️ High-Level Architecture

```
            ┌───────────────────────────────────────────────┐
            │                    VisionEdge AI               │
            │  • RTSP Streaming                             │
            │  • Frame Extraction                           │
            │  • Fall & Seizure Detection (YOLO/Pose)       │
            │  • Snapshot Hashing                           │
            │  • Polkadot On-chain Verification             │
            │  • Snapshot Uploading                         │
            └──────────────┬────────────────────────────────┘
                           |
                           v
┌────────────────────────────────────────────────────────────────────────┐
│                   Healthcare Backend (NestJS + PostgreSQL)             │
│  • User / Role / Permission Management                                 │
│  • Camera & Room Management                                            │
│  • Event Pipelines (Fall/Seizure/Alerts)                               │
│  • Realtime WebSocket + Supabase Option                                │
│  • Subscription & Payment (VNPay)                                      │
│  • Polkadot Proof Metadata Storage                                     │
│  • Audit Logs / System Health / Monitoring                             │
└───────────────────────┬─────────────────────────────────────────────────┘
                        |
          ┌─────────────┼───────────────────────┐
          v             v                       v
┌────────────────┐ ┌──────────────────┐ ┌───────────────────────────────┐
│ Admin Dashboard│ │ Caregiver Mobile │ │ Customer Mobile (future)      │
│ React + Shadcn │ │ Flutter App      │ │ Patient / Family Monitoring   │
│ • Analytics    │ │ • Realtime Alerts│ │ • Verified Alerts             │
│ • Providers    │ │ • Assignments    │ │ • Event History               │
│ • Billing      │ │ • Medical Info   │ │ • Subscription Portal         │
└────────────────┘ └──────────────────┘ └───────────────────────────────┘
```

---

# 🔗 NEW: Polkadot Verification Layer (Blockchain Integrity Module)

To enhance trust, compliance, and real-world reliability, the system integrates a **Polkadot Parachain–based verification module** ensuring all AI-detected events are:

✔ **Tamper-proof**
✔ **Cryptographically verified**
✔ **Immutable and auditable**
✔ **Cross-chain interoperable**

Only **image hashes** (SHA-256) are stored on-chain, protecting patient privacy while ensuring medical integrity.

### What is stored on-chain?

```solidity
struct ImageProof {
    address uploader;
    bytes32 imageHash;
    string eventType;
    string cameraId;
    string eventId;
    uint256 timestamp;
}
```

Snapshots remain **securely stored off-chain**, while the blockchain acts as a **proof-of-integrity ledger**.

### Why Polkadot?

* Inherits relay-chain security
* Multi-parachain interoperability
* Low fees → scalable for high-frequency AI events
* Ideal for healthcare compliance (HIPAA, ISO, medical forensics)

---

# 🧩 Expanded: Edge Layer (VisionEdge AI + Polkadot Integration)

The Edge Layer performs:

* RTSP camera ingest
* AI inference for fall/seizure detection
* Keyframe extraction
* Snapshot capture (JPEG)
* SHA-256 hashing
* On-chain verification via Polkadot smart contract
* Upload snapshot + metadata to backend

### Edge-to-Blockchain Flow

```
Camera Frame → AI Detection → Keyframe Extracted
        ↓
Generate sha256 hash of image
        ↓
Send transaction to Polkadot Parachain
        ↓
storeImageProof(hash, metadata)
        ↓
Return txHash to backend
        ↓
Dashboard + Mobile show “Verified on Polkadot”
```

Edge devices supported:

* Orange Pi 5 Plus
* Nvidia Jetson
* Mini PC / Server

---

# 🧠 Core Capabilities

## 1️⃣ VisionEdge AI

* RTSP ingest (IMOU, HikVision…)
* Keyframe extraction
* Fall detection (YOLOv8-Pose)
* Seizure detection (VSViG / MediaPipe)
* Blockchain verification module (Polkadot)
* Snapshot uploader

## 2️⃣ Backend API (NestJS)

Same as before — added:

* Polkadot proof syncing
* txHash storage for snapshots
* Verify endpoint for dashboards

## 3️⃣ Admin Dashboard (React + ShadcnUI)

Now includes:

* “Verified on Polkadot” event label
* Event integrity checking
* Audit-forensics panel

## 4️⃣ Caregiver Mobile App (Flutter)

Extended:

* Verified alert badge
* Blockchain-proof details
* Event authenticity confirmation

---

# 📁 Monorepo Structure

```
healthcare-vision-ai/
├── edge/                   # VisionEdge AI (Python) + Polkadot module
├── backend/                # NestJS API + Proof Service
├── admin-dashboard/        # React + ShadcnUI dashboard
└── caregiver-app/          # Flutter mobile app
```

---

# 🔐 Security & Compliance (Extended)

* RBAC with 21 permissions
* Encrypted medical storage
* On-chain proof for incident integrity
* Audit logs for hospital compliance
* Blockchain-backed event forensic traceability

---

# 🚨 Alert Processing Pipeline (Updated with Blockchain)

### Caregiver Path

1. VisionEdge detects event
2. Snapshot hashed
3. Hash stored on Polkadot parachain
4. Backend receives txHash and metadata
5. Caregiver receives **verified alert**
6. Caregiver can **acknowledge / cancel / escalate**

### Customer Path

* Alerts delayed 30 seconds
* If caregiver cancels → customer alert is suppressed
* Verified proof shown only when finalized

---

# 🧰 Tech Stack Summary

| Layer      | Technology                                                      |
| ---------- | --------------------------------------------------------------- |
| Blockchain | Polkadot Parachain, Solidity (Moonbeam/Astar), substrate-api-js |
| Edge AI    | Python, YOLOv8-Pose, OpenCV, MediaPipe                          |
| Backend    | NestJS 11, Prisma, PostgreSQL, Redis                            |
| Dashboard  | React 18, ShadcnUI, TanStack Query                              |
| Mobile     | Flutter 3, Supabase Realtime                                    |
| DevOps     | Docker, CI/CD, Cloudflare/Supabase                              |

---

# 🚀 Development Quick Start

```bash
git clone https://github.com/letranminhdat1516/IPBMS
```

(maintained as-is)

---

# 💬 Contact

**Vision AI Capstone Team**
📧 [datltmse@gmail.com](mailto:datltmse@gmail.com)

