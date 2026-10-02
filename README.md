# Fingerprint Biometric & Queue Management System

## 🚀 Overview

This integrated system combines a secure **Fingerprint Cash Withdrawal** application with the **BankAssist Queue Management** solution. It is designed for retail banking environments, providing secure biometric authentication and real-time customer flow orchestration.

### 🌐 Dynamic Environment Support

The system is engineered to run seamlessly across different environments (Local, Server, Remote) without hardcoded IP configurations. It automatically resolves backend URLs based on the current browser host.

## 🛠️ System Architecture & Ports

To avoid common port conflicts, the system uses the following dedicated port range:

| Component | Port | Description |
| --- | --- | --- |
| **Frontend (Web App)** | `9001` | The main React/Vite application. |
| **Consolidated Backend** | `9002` | Express server handling Queue, Sockets, and Admin logs. |
| **Core Banking API** | `9003` | Backend handling account transactions and service logic. |
| **Scanner SDK (Local)** | `8080` | Local service for communicating with fingerprint hardware. |

---

## ⚙️ Development & Hosting

### Local Development

Run the unified command from the root directory to start **both the backend (port 9002) and the frontend (port 9001)** simultaneously:

```bash
npm run dev
```

- **Frontend Application**: `http://localhost:9001`
- **Backend API & Sockets**: `http://localhost:9002`

*(Alternatively, you can run them individually with `npm run dev:client` and `npm run dev:server`)*

### Server Deployment (e.g., .169 Server)

When hosted on a server, the frontend automatically bridges to the backend using the server's IP.

- **Frontend URL**: `http://<SERVER_IP>:9001`
- **API/Socket Bridge**: Automatically resolves to `http://<SERVER_IP>:9002`

---

## 🔒 Security Context & Polyfills

The system includes a custom polyfill for `crypto.randomUUID` in `src/main.tsx`. This ensures the application remains functional even when accessed over insecure **HTTP** connections (common in local IP-based server deployments), which normally disable modern biometric-related APIs.

---

## 📂 Project Structure

- `src/pages/bankassist/`: Queue Management pages (Lobby Screen, Teller Panel, Supervisor).
- `src/components/withdrawal/`: Biometric withdrawal flow components.
- `server/src/index.ts`: The unified Express server on port `9002`.
- `src/services/`: Dynamic API and Socket service definitions.

---

## 🔗 API Catalog

The system interacts with both local backend services and external banking APIs.

### 🏠 Internal APIs (Consolidated Backend - Port 9002)

These routes are hosted within the `/server` directory and connect directly to the PostgreSQL database (`DB_SELFSERVICE`).

| Category | Endpoint Example | Description |
| --- | --- | --- |
| **Admin Stats** | `GET /api/admin/dashboard-stats` | Aggregated metrics for the dashboard. |
| **Audit Logs** | `GET /api/admin/audit-logs` | Fetch real-time system logs. |
| **Service Control** | `PATCH /api/admin/services/self-service/:id/toggle` | Enable/disable kiosk services. |
| **Logging** | `POST /api/service-activity/log` | Record customer interactions. |
| **Queue Mgmt** | `POST /api/self-service/tickets` | Issue new queue tickets. |
| **Health** | `GET /api/health` | Check backend and DB connectivity. |

### 🌐 External & Core APIs

These services are external to this repository and are required for core banking operations.

| Service | Base URL / Example | Provider |
| --- | --- | --- |
| **Core Banking** | `http://10.203.14.169:8082/api/self-service` | Transaction & Account lookup. |
| **Scanner SDK** | `http://localhost:8080/capture` | Local MagTek/Scanner hardware SDK. |
| **Fingerprint SDK** | `http://192.168.1.142:8080/capture` | Biometric hardware interface. |
| **Legacy Imaging** | `http://10.203.14.169/imaging/` | PHP-based document imaging system. |

---

## 💡 Usage Modes

- **Self-Service**: `http://<HOST>:9001/?mode=services`
- **CRO-Assisted**: `http://<HOST>:9001/?mode=assisted`
- **Queue Lobby**: `http://<HOST>:9001/queue/screen?branch_id=MAIN`
- **Teller Panel**: `http://<HOST>:9001/queue/office?branch_id=MAIN`
- **Admin/Supervisor**: `http://<HOST>:9001/admin`

---

*Built for high-security, high-performance banking environments.*
