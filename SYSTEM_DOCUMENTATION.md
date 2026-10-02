# System Documentation: Fingerprint Biometric Cash Withdrawal & Queue System

> ## ⚠️ CRITICAL SECURITY NOTICES — READ BEFORE DEPLOYING
>
> The following security gaps exist in the current codebase and **must be resolved before any production or multi-branch rollout**.
>
> ### 1. Hardcoded Bank API Credentials
>
> **File:** `server/src/index.ts`  
> The `Authorization` header for the intra-bank proxy is hardcoded:
>
> ```text
> Authorization: Basic dGVzdF9QQzp0ZXN0UEM=   →  testPC:testPC (Base64)
> ```
>
> These are **test credentials**. Anyone with read access to the repository or the deployed server process can extract them. Move to `BANK_API_USER` / `BANK_API_PASS` environment variables immediately.
>
> ### 2. Hardcoded Fraud Reporting API Key
>
> **File:** `src/services/api.ts`  
> The fraud reporting API key (`x-api-key: 20171411891`) is hardcoded in frontend source code, meaning it is **shipped in the browser bundle** and visible to any user who opens DevTools. Move to a server-side proxy route (same pattern as the funds-transfer proxy) so the key is never sent to the browser.
>
> ### 3. Admin Authentication is Client-Side Only
>
> **File:** `src/pages/AdminLogin.tsx`  
> Admin credentials are validated entirely in the browser against **hardcoded demo accounts** (`admin/admin123`, `manager/manager123`). The session token is stored in `sessionStorage`. **Any person with network access to the kiosk can open DevTools, read or write `sessionStorage`, and gain full admin privileges** — including toggling services, reading audit logs, and changing system settings. There is no server-side session, no JWT validation, and no rate limiting on login attempts. This is an accepted temporary gap for isolated intranet deployment; it must be replaced with server-side authentication before any internet-facing or multi-tenant use.
>
> **Tracked as items #4 and #5 in [§16 Known Limitations](#16-known-limitations--pending-work).**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Frontend Application](#5-frontend-application)
   - 5.1 [Customer Kiosk](#51-customer-kiosk)
6. [Backend Server](#6-backend-server)
   - 6.1 [Express App Setup](#61-express-app-setup)
7. [Database Schema](#7-database-schema)
8. [External Integrations](#8-external-integrations)
   - 8.1 [Suprema Fingerprint Scanner SDK](#81-suprema-fingerprint-scanner-sdk)
9. [Service Catalogue](#9-service-catalogue)
10. [Transaction Flow](#10-transaction-flow)
11. [Security & Configuration](#11-security--configuration)
    - [Authentication](#authentication)
12. [Environment Variables](#12-environment-variables)
13. [Running the System](#13-running-the-system)
14. [Monitoring & Alerting](#14-monitoring--alerting)
15. [API Versioning Strategy](#15-api-versioning-strategy)
16. [Known Limitations & Pending Work](#16-known-limitations--pending-work)

---

## 1. System Overview

This application is a self-service biometric transaction kiosk and queue management solution built for retail banking environments. It enables bank customers to authenticate using a fingerprint scanner, view account balances, perform self-service operations (cash withdrawal, cash deposit, intra-bank transfers, balance enquiry, statement generation, fraud reporting), and receive a queue number to be served by a teller.

### Core Objectives

- **Biometric Security:** Replace manual ID verification with 1:N fingerprint matching via Suprema hardware SDK.
- **Lobby Experience:** Provide a high-impact lobby display (Big Screen) showing queue status, calling numbers via multi-lingual Text-to-Speech (TTS), and rotating full-screen promotional ads when idle.
- **Teller Assistance:** Give tellers a desktop interface to call, serve, skip, or recall tickets, with automated synchronization to the bank's core system (`tb_self_serv_txn` and CORE SOAP).
- **Admin Supervision:** Allow branch managers to monitor traffic in real time, toggle individual kiosk services on/off live, upload ad media, inspect audit trails, and manage station configurations.

### Key Subsystems

| Layer | Purpose |
| --- | --- |
| **Customer Kiosk** | Touch-screen UI for end customers (fingerprint scan → service selection → transact) |
| **BankAssist Queue** | Teller-side queue management: calling, serving, and completing tickets |
| **Admin Dashboard** | Real-time system monitoring, service toggle, audit logs, traffic analysis |

All three run in the same React single-page application on **port 9001**, backed by a single Express/Node.js API server on **port 9002**.

---

## 2. Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                     CUSTOMER DEVICE                      │
│   Browser / Kiosk Terminal (React SPA, port 9001)       │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Customer    │  │  BankAssist  │  │    Admin     │  │
│  │  Kiosk (/)   │  │  Queue       │  │  Dashboard   │  │
│  │              │  │  (/queue/*)  │  │  (/admin)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼───────────┘
          │ HTTP / REST     │ WebSockets      │ REST / Admin
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                 CONSOLIDATED BACKEND                    │
│             Express + Node.js (port 9002)               │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Self-Serv   │  │ Socket.IO    │  │  BankAssist  │  │
│  │  API Routes  │  │ Server       │  │  Router      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │            │
│         └─────────────────┼─────────────────┘            │
│                           ▼                              │
│                    Prisma ORM / pg                       │
└───────────────────────────┬─────────────────────────────┘
                            │ SQL
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL)                  │
│               IP 10.203.14.50 : 5432                    │
│                   DB_SELFSERVICE                        │
│                                                          │
│  Tables: self_services, audit_logs, traffic_entries,    │
│  service_activity_logs, Ticket, Office, Ad, system_config│
│  + Legacy table: tb_self_serv_txn                       │
└─────────────────────────────────────────────────────────┘
```

### High-Level Data Flow (Customer Transaction)

1. Customer touches the screen on Kiosk home (`/`).
2. Scanner SDK (`http://localhost:8080/verify`) captures and matches fingerprint.
3. Matching user record(s) returned; customer confirms account.
4. Kiosk fetches enabled services from `GET /api/services/self-service` (polled every 30 s).
5. Customer selects service (e.g. Cash Withdrawal) and enters amount.
6. `POST /api/transactions/self-service` writes row to `tb_self_serv_txn` **and creates a queue ticket** in PostgreSQL (`Ticket` table).
7. When the teller **calls** the ticket, the ticket is posted to CORE via SOAP (`INSERT`, `is_served = 'N'`).
8. On **complete**, CORE is updated (`UPDATE`, `is_served = 'Y'`) and the change is synced back to `tb_self_serv_txn`; on **cancel**, `is_served = 'C'`.

---

## 3. Technology Stack

### Frontend

| Package | Version | Role |
| --- | --- | --- |
| React | 18.3 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 5.4 | Dev server & bundler (port 9001) |
| React Router v6 | 6.30 | Client-side routing |
| Tailwind CSS | 3.4 | Utility-first styling |
| shadcn/ui (Radix) | latest | Pre-built accessible components |
| Lucide React | 0.462 | Icon library |
| Axios | 1.12 | HTTP client for scanner SDK calls |
| Socket.IO client | 4.8 | Real-time queue updates |
| TanStack Query | 5.83 | Server-state management (admin) |
| Recharts | 2.15 | Charts in admin dashboard |
| date-fns | 3.6 | Date formatting |
| framer-motion / zod | 12 / 3.25 | Animations / form validation |

### Backend

| Package | Version | Role |
| --- | --- | --- |
| Node.js | 20 | Runtime |
| Express | 5.2 | HTTP server |
| TypeScript (tsx) | 4 / 5 | Dev execution via `tsx watch` |
| Prisma | 7.8 | ORM (schema-driven; `prisma db push`) |
| `@prisma/adapter-pg` | 7.8 | Direct pg pool adapter |
| pg (node-postgres) | 8.20 | PostgreSQL driver |
| Socket.IO | 4.8 | WebSocket server |
| multer | 2.1 | File upload (ad media) |
| dotenv | 17.3 | Environment config |

### Database

| Engine | Role |
| --- | --- |
| PostgreSQL 14+ | Primary data store (hosted at `10.203.14.50:5432`, db `DB_SELFSERVICE`) |
| Oracle (bank core) | Transaction posting via stored proc `CBXDMX.VRT_TRANS_POSTING`; CORE SOAP insert/update on `10.203.14.33:8182`, REST balance/statement on `8181` |

---

## 4. Project Structure

```text
FINGERPRINT-BIOMETRIC-CASH-WITHDRAWAL/
│
├── src/                          # Frontend (React)
│   ├── components/               # Reusable UI components
│   │   ├── admin/                # Admin sub-views (ServiceActivity, SystemTraffic, AuditLogs, etc.)
│   │   ├── ui/                   # shadcn/ui primitives (button, card, dialog, badge, switch)
│   │   └── withdrawal/           # Customer kiosk screens (FingerprintScan, AccountDetails, etc.)
│   │
│   ├── pages/                    # Route pages
│   │   ├── Index.tsx             # Customer Kiosk landing page
│   │   ├── Admin.tsx             # Admin Dashboard frame (sidebar + active section)
│   │   ├── AdminLogin.tsx        # Client-side admin auth form
│   │   └── bankassist/           # Queue system views:
│   │       ├── BigScreen.tsx     # Public display / digital signage TV (TTS, chime, ads)
│   │       ├── OfficeDashboard.tsx # Teller / CRO desk interface (call, serve, complete)
│   │       ├── SupervisorDashboard.tsx # Branch manager dashboard & ad media gallery
│   │       └── QueueEntry.tsx    # Role selection landing page (/queue)
│   │
│   ├── services/                 # API client layers
│   │   ├── api.ts                # Kiosk & admin endpoints (Axios)
│   │   ├── bankassistApi.ts      # Queue REST client
│   │   ├── socket.ts             # Socket.IO connection manager
│   │   └── ttsService.ts         # Browser SpeechSynthesis wrapper (voice announcements)
│   │
│   └── main.tsx                  # App entry point + polyfills (crypto.randomUUID)
│
├── server/                       # Consolidated Backend (Express + Node.js)
│   ├── prisma/
│   │   └── schema.prisma         # PostgreSQL schema (self_services, audit_logs, Ticket, Office, Ad, etc.)
│   │
│   ├── src/
│   │   ├── index.ts              # Express app setup, proxy routes, health checks, Socket.IO server
│   │   ├── seed.ts               # Database seed script (npm run seed)
│   │   └── bankassist/           # BankAssist queue backend domain:
│   │       ├── routes.ts         # Router mounted at /api/self-service
│   │       ├── ticketController.ts# Ticket & office REST handlers
│   │       ├── ticketService.ts  # Ticket state transitions + PostgreSQL logic
│   │       ├── coreBankingService.ts # SOAP client for bank CORE (insert/update is_served)
│   │       ├── branchService.ts  # Dynamic branch LOV code resolver
│   │       ├── tellerActivityService.ts # Dynamic teller activities loader & label extractor
│   │       └── socket.ts         # Socket.IO event emitter helper (emitEvent)
│   │
│   └── scratch/                  # Ad-hoc scripts (db-test, insert-system-config)
│
├── uploads/
│   └── ads/                      # Uploaded ad media files
│
├── public/                       # Static SVG animations for landing page
└── vite.config.ts                # Dev proxy: /api → :9002, /socket.io → :9002, /uploads → :9002
```

---

## 5. Frontend Application

### 5.1 Customer Kiosk

**Entry point:** `src/pages/Index.tsx`  
**Route:** `/` (and `/?mode=services`, `/?mode=assistance`)

#### Landing Page (`/`)

The home screen displays an animated three-column layout:

- **Left column:** Rotating SVG animations (fingerprint, security, wallet, banknote)
- **Centre column:** Two mode selection cards — *Customer Mode* and *Request Assistance*
- **Right column:** Two smaller SVG sliders showing the transaction flow steps and security features

The page polls `/api/settings/public` on mount to check for `maintenanceMode`. If active, a full-screen maintenance notice is shown instead.

Idle session timeout (default 300 s, configurable by admin) is enforced by listening to `mousemove`, `keydown`, `touchstart`, `click`, and `scroll` events. When the timer expires, the user is returned to `/?`.

---

#### Session Orchestrator: `WithdrawalApp.tsx`

All customer transactions pass through `WithdrawalApp`, which manages a five-step linear state machine:

```text
scan → account → services → service-flow → complete
```

| Step | Component Rendered | Description |
| --- | --- | --- |
| `scan` | `FingerprintScan` | Initialises Suprema SDK, triggers `/verify` |
| `account` | `AccountDetails` | Shows matched accounts; customer confirms |
| `services` | `ServiceSelection` | Grid of enabled services (live-polled every 30 s) |
| `service-flow` | Dynamic (see below) | Renders the selected service component |
| `complete` | `TransactionComplete` | Receipt screen with ticket, queue number, print option |

---

## 6. Backend Server

### 6.1 Express App Setup

**File:** `server/src/index.ts`  
**Port:** `9002` (configurable via `PORT` env var)  
**Host:** `0.0.0.0`

---

## 7. Database Schema

All Prisma models map to PostgreSQL tables. The bank's legacy transaction table (`tb_self_serv_txn`) is accessed via raw SQL, not Prisma.

---

## 8. External Integrations

### 8.1 Suprema Fingerprint Scanner SDK

| Property | Value |
| --- | --- |
| Base URL | `http://localhost:8080` |
| `GET /init` | Initialises scanner hardware; returns `1` on success |
| `POST /verify` | Body: `multipart/form-data` with `fingerprintData`; returns `{ user_verified: bool, customer_details: User[] }` |

---

## 9. Service Catalogue

| `serviceId` | Display Name | Tag | API Status |
| --- | --- | --- | --- |
| `cash_withdrawal` | Cash Withdrawal | Cash | ✅ Queue ticket (auto) + imaging API |
| `cash_deposit` | Cash Deposit | Cash | ✅ Queue ticket (auto) |
| `check_deposits` | Cheque Deposits | Deposits | ⚠️ Stubbed |
| `fund_transfers` | Fund Transfers | Transfers | ✅ Intra-bank live; GhIPSS/MoMo stubbed |
| `bill_payments` | Bill Payments | Payments | ⚠️ Stubbed |
| `balance` | Balance Inquiry | Insights | ✅ Balance proxy (core REST 8181) |
| `statement_generation` | Statement Generation | Documentation | ✅ Statement proxy (core REST 8181) |
| `account_updates` | Account Updates | Maintenance | ⚠️ Stubbed |
| `pin_reset` | PIN / Password Reset | Security | ⚠️ Stubbed |
| `fraud_reporting` | Fraud Reporting | Security | ✅ Fraud API |
| `mfa_setup` | Multi-Factor Setup | Security | ⚠️ Stubbed |

---

## 10. Transaction Flow

### Cash Withdrawal (End-to-End)

```text
1. Customer places finger on Suprema scanner
2. GET localhost:8080/init       → scanner ready
3. POST localhost:8080/verify    → customer details returned
4. Customer selects account → selects "Cash Withdrawal"
5. Customer enters amount
6. [Validation] amount > 0 AND amount ≤ balance
7. POST :9002/api/transactions/self-service
       → INSERT INTO tb_self_serv_txn (is_served = 'N')
       → Backend auto-creates Ticket (PENDING) in PostgreSQL
       → Returns queueNumber + ticketId → Socket.IO emits ticket:created
8. POST 10.203.14.169/imaging/make_bio_transaction  [fire-and-forget]
9. setCurrentStep('complete') — shown immediately
10. Customer sees: Ticket #XXXXXX | Queue Number #N
11. Teller on /queue/office calls ticket → CALLING
12. (First call only) CORE SOAP INSERT → isPostedToCore = true
13. Teller clicks Start → SERVING
14. Teller clicks Complete → COMPLETED
       → CORE SOAP UPDATE is_served = 'Y'
       → tb_self_serv_txn.is_served synced to 'Y'
```

---

## 11. Security & Configuration

### Authentication

| Scope | Mechanism |
| --- | --- |
| Customer identity | Fingerprint biometric (Suprema SDK) |
| Admin dashboard | Username/password (demo accounts `admin/admin123`, `manager/manager123`; session stored in `sessionStorage`; validated by `AdminLogin.tsx`) |
| Bank API calls | `Authorization: Basic` header (credentials embedded in proxy / env vars) |
| No customer-facing JWT | Sessions are purely in-memory React state; cleared on page reload |

---

## 12. Environment Variables

Create `server/.env`:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:password@10.203.14.50:5432/DB_SELFSERVICE

# Server bind config (optional — defaults shown)
PORT=9002
HOST=0.0.0.0

# Core Banking Smart Branch LOV API
SMART_BRANCH_LOV_URL=http://10.203.14.33:8181/core/api/v1.0/info/smart-branch-lov-codes
BALANCE_API_KEY=20171411891
BALANCE_API_SECRET=141116517P
BALANCE_FORWARDED_FOR=10.203.18.114

# Core Banking Teller Activities API
TELLER_ACTIVITIES_URL=http://10.203.14.33:8182/autoAPIGenerator/plx/api/gen/bb13652c-add1-4e72-9e62-497a85fd8ce4/api/v1.0/teller-activities
TELLER_API_KEY=testPC
TELLER_API_SECRET=test_PC

# CORE Banking SOAP auth (optional — fallback creds are hardcoded, see §8.6)
CORE_SOAP_USERNAME=test_PC
CORE_SOAP_PASSWORD=testPC

# Statement proxy auth (optional — fallback values are hardcoded, see §6.5)
STATEMENT_API_KEY=test_PC
STATEMENT_API_SECRET=testPC
STATEMENT_FORWARDED_FOR=10.203.18.237
```

---

## 13. Running the System

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (with `DB_SELFSERVICE` database created)
- Suprema SDK running on `localhost:8080` (for live fingerprint; dev can skip)

### Installation & Setup

```zsh
# 1. Install root & frontend dependencies
npm install --legacy-peer-deps

# 2. Install backend dependencies
cd server && npm install && cd ..

# 3. Apply the schema (no migrations folder — uses db push)
cd server && npx prisma db push && npx prisma generate && cd ..

# 4. (Optional) Seed initial service catalogue + sample logs
cd server && npm run seed && cd ..
```

### Starting the Application

Start **both frontend (port 9001) and backend (port 9002)** concurrently with a single command:

```zsh
npm run dev
```

- **Frontend Kiosk & Admin**: `http://localhost:9001`
- **Backend API & WebSockets**: `http://localhost:9002`

*(Or start individually with `npm run dev:client` and `npm run dev:server`)*

---

## 14. Monitoring & Alerting

### Health Endpoints

| Endpoint | Purpose | Expected response time |
| --- | --- | --- |
| `GET /api/health` | Quick liveness check (load balancer / uptime monitor) | < 50 ms |
| `GET /api/health/detailed` | Per-component status — use for diagnostics | < 200 ms |

---

## 15. API Versioning Strategy

### Current State

The API has **no version prefix** in its URL paths (e.g. `/api/services/self-service`, not `/api/v1/services/self-service`). This is intentional for the initial deployment: the kiosk frontend and backend are always deployed together as a single unit, so version skew between client and server cannot occur in normal operation.

---

## 16. Known Limitations & Pending Work

| # | Item | Status |
| --- | --- | --- |
| 1 | **GhIPSS transfer endpoint** | Stubbed. Awaiting endpoint details from bank IT. Wire into `FundTransfers.tsx` → `executeGhIPSS()`. |
| 2 | **Mobile Money transfer endpoint** | Stubbed. Same as above → `executeMobileMoney()`. |
| 3 | **Bank core Oracle proc** `CBXDMX.VRT_TRANS_POSTING` | Had a compilation error in Oracle DB; must be verified by the bank database team before intra-bank transfers complete. |
| 4 | **Admin authentication is client-side only** | Demo accounts (`admin/admin123`, `manager/manager123`) compared in the browser; session token in `sessionStorage`; no server-side validation. Anyone on the LAN can spoof admin access. Must be replaced with server-side JWT before any internet-facing or multi-branch deployment. See [Authentication](#authentication). |
| 5 | **Bank/API credentials hardcoded in source** | `Authorization: Basic dGVzdF9QQzp0ZXN0UEM=` in `server/src/index.ts`; CORE SOAP fallback `20171411891`/`141116517P` in `coreBankingService.ts`; balance proxy `x-api-key`/`x-api-secret` in `index.ts`; fraud key in `src/services/api.ts` (shipped in the browser bundle). Move all to environment variables / server-side. |
| 6 | **CORS policy** | Currently `origin: *` (both Express and Socket.IO). Restrict to kiosk origin in production. |
| 7 | **Stubbed services** | Cheque Deposits, Bill Payments, Account Updates, PIN Reset, MFA Setup all show placeholder UIs. Real API integrations pending. |
| 8 | **Daily withdrawal limit enforcement** | `dailyWithdrawalLimit` is stored in `SystemConfig` but not yet checked in `handleAmountSubmit`. |

---

*Documentation last updated — August 2026.*
