# Healthcare Vision AI - Admin Dashboard

Advanced admin dashboard for Healthcare Vision AI system, built with enhanced error handling, intelligent retry logic, and real-time health monitoring. Crafted with ShadcnUI and optimized for medical data management.

## 🏥 Healthcare Features

- **Medical Data Management**: Patient records, health reports, medical assignments
- **AI Vision Integration**: Camera management, vision analytics, medical image processing
- **Healthcare Provider Management**: Doctors, caregivers, medical staff administration
- **Plan & Subscription Management**: Healthcare plans, quotas, billing management
- **Audit & Compliance**: Activity logs, system monitoring, compliance tracking
- **Enhanced Error Handling**: Medical-grade reliability with intelligent error recovery

## ✨ Advanced Features

- **🛡️ Enhanced Error Handling**: Intelligent retry logic with exponential backoff
- **📊 Real-time Health Monitoring**: System status dashboard with uptime tracking
- **🌐 Network-aware UI**: Online/offline detection with graceful degradation
- **🔄 Smart Query Management**: TanStack React Query v5 with advanced caching
- **🎯 Vietnamese Localization**: Medical terminology and error messages in Vietnamese
- **⚡ Performance Optimized**: Code-splitting, lazy loading, skeleton loaders
- **🔐 Enterprise Security**: Role-based access, session management, audit trails

## 📱 Healthcare Pages

- **Dashboard**: Medical overview, patient statistics, system health monitoring
- **Patients**: Patient management, health records, medical history
- **Healthcare Providers**: Doctor/caregiver management, assignments, schedules
- **Camera & Vision AI**: Medical imaging cameras, AI analysis, alerts
- **Health Reports**: Medical analytics, diagnostic reports, trending data
- **Plans & Subscriptions**: Healthcare plan management, billing, quotas
- **Settings**: System configuration, medical protocols, compliance settings
- **Auth & Security**: Multi-level authentication, role management, audit logs
- **Error Handling**: Comprehensive error boundaries, retry mechanisms, health status

## 🏗️ Tech Stack

**Frontend Framework:** [React 18](https://react.dev/) với [TypeScript](https://www.typescriptlang.org/)

**UI Library:** [ShadcnUI](https://ui.shadcn.com) (TailwindCSS + RadixUI)

**Data Fetching:** [TanStack React Query v5](https://tanstack.com/query/) - Advanced caching, retry logic

**Routing:** [TanStack Router](https://tanstack.com/router/latest) - Type-safe routing

**Error Handling:** Enhanced error boundaries, global error interceptor, health monitoring

**Build Tool:** [Vite](https://vitejs.dev/) - Fast development and optimized builds

**State Management:** [Zustand](https://zustand-demo.pmnd.rs/) - Lightweight state management

**Styling:** [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework

**Icons:** [Lucide React](https://lucide.dev/) - Beautiful, customizable icons

**Notifications:** [Sonner](https://sonner.emilkowal.ski/) - Toast notifications

**Form Handling:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) validation

## 📁 Project Structure

```text
├── public/
│   └── images/                # Static assets, favicons
├── src/
│   ├── assets/               # SVG components, static files
│   ├── components/
│   │   ├── layout/          # Layout components (header, sidebar, etc.)
│   │   ├── ui/              # ShadcnUI base components
│   │   ├── error-boundary.tsx    # Enhanced error boundaries
│   │   ├── loading-states.tsx    # Skeleton loaders, error states
│   │   └── system-health-status.tsx  # Health monitoring component
│   ├── config/              # App configuration
│   ├── context/             # React contexts (theme, user, etc.)
│   ├── hooks/
│   │   ├── use-retry.tsx    # Intelligent retry logic hooks
│   │   └── use-*.tsx        # Custom hooks
│   ├── lib/
│   │   ├── enhanced-query-client.ts   # Advanced QueryClient config
│   │   ├── global-error-interceptor.ts # Global error handling
│   │   └── utils.ts         # Utility functions
│   ├── pages/               # Page components
│   │   ├── dashboard/       # Medical dashboard
│   │   ├── patients/        # Patient management
│   │   ├── camera/          # Vision AI cameras
│   │   ├── health-reports/  # Medical analytics
│   │   ├── auth/            # Authentication pages
│   │   └── errors/          # Error pages (401, 403, 404, 500)
│   ├── routes/              # TanStack Router configuration
│   ├── services/            # API service layer
│   ├── stores/              # Zustand state stores
│   ├── types/               # TypeScript type definitions
│   └── utils/
│       ├── dashboard-errors.ts    # Error classification & tracking
│       └── handle-server-error.ts # Server error utilities
├── docs/                    # API documentation
│   ├── API_DOCUMENTATION.md
│   └── API_MASTER_LIST.md
├── index.html
├── package.json
├── README.md
├── tsconfig*.json
├── vite.config.ts
└── ...
```

> **Healthcare-focused architecture**: Specialized structure for medical data management với comprehensive error handling và health monitoring capabilities.

## Getting Started

Clone the project:

```bash
git clone https://github.com/vision-ai-capstone/admin_dashboard.git
cd admin_dashboard
```

Install dependencies (choose one):

```bash
# pnpm
pnpm install
# npm
npm install
# yarn
yarn install
# bun
bun install
```

Start the server (choose one):

```bash
# pnpm
pnpm run dev
# npm
npm run dev
# yarn
yarn dev
# bun
bun run dev
```
