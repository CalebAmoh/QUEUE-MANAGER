# 🏦 BankAssist Queue Management System

**BankAssist Queue** is an enterprise-grade, high-performance queue management solution engineered specifically for retail banking environments. Designed to eliminate the friction of traditional waiting lines, it transforms the customer experience through real-time digital signage, intelligent ticket routing, and automated voice announcements. The system provides a unified platform where lobby displays, teller dashboards, and supervisor analytics converge to create a seamless, efficient, and data-driven branch environment.

## 🚀 Key Features

- **Real-time "Big Screen" Display**: Dynamic lobby screen that shows current tickets being served with instant updates via WebSockets.
- **Adaptive UI Density Engine**: Automatically adjusts Waiting List columns (1, 2, or 3 columns) and text sizes dynamically so all tickets up to 50 are always clearly visible with zero cutoff.
- **Dual-Layer Ambient Ad Signage**: Edge-to-edge ambient blurred background with centered foreground media—eliminates ugly black bars while preserving 100% of flyer graphics and text.
- **Seasonal Ad Status Control**: Supervisors can toggle ads between **`ACTIVE`** and **`PAUSED`** with 1 click in the Media Gallery, preserving seasonal promotions year-round without deletion.
- **Interactive Teller Dashboard**: Empowers staff to call, start, complete, or recall tickets with a single click.
- **Teller 30-Minute Inactivity Auto-Logout**: Monitors teller workstation interactions and automatically releases the desk to `OFFLINE` status after 30 minutes of idle time.
- **Supervisor Control Center**: Real-time branch statistics, office management, and media gallery control for advertisements.
- **Automated Voice Announcements**: Multi-lingual support using browser-native speech synthesis for "Now Serving" notifications.
- **Dynamic Ad Rotation**: Full-screen advertisements that play automatically when the queue is idle, maximizing customer engagement.
- **Smart Branch LOV Resolution**: Automatically fetches branch list and resolves branch codes (e.g. `000` $\rightarrow$ `HEAD OFFICE`) dynamically via Core Banking APIs.
- **Dynamic Teller Activity Integration**: Links logged-in tellers to their authorized service activities, extracting clean human-readable labels and eliminating raw form codes.
- **Supervisor-Unavailable Station Self-Creation**: Allows tellers to safely create desk stations with a confirmation checkpoint when supervisors are unavailable.
- **Daily On-Hold Ticket Reset**: Ensures skipped and on-hold tickets automatically reset daily so no past-day tickets persist into new business days.

## 🛠️ Technology Stack

- **Frontend**: Vite, React, TypeScript
- **Backend**: Express, Prisma, PostgreSQL (`DB_SELFSERVICE`), Socket.io
- **Styling**: Vanilla CSS, Tailwind CSS, shadcn/ui
- **Animations**: Framer Motion
- **Networking**: Socket.io (Real-time), TanStack Query (Data Fetching), Axios
- **Icons**: Lucide React
- **Validation**: Zod & React Hook Form

## ⚙️ How can I edit this code?

BankAssist Queue is an open project that can be modified via integrated tools or your preferred local environment.

### Local Development

Run the unified command from the root directory to start **both the backend (port 9002) and the frontend (port 9001)** simultaneously:

```sh
npm run dev
```

- **Lobby Screen**: `http://localhost:9001/queue/screen?branch_id=000`
- **Teller Dashboard**: `http://localhost:9001/queue/office?branch_id=000&served_by=TESTTEL`
- **Supervisor Dashboard**: `http://localhost:9001/queue/supervisor?branch_id=000`
- **Admin Portal**: `http://localhost:9001/admin`
- **Backend API & Sockets**: `http://localhost:9002`

## 💡 Creativity & Innovations

- **Progressive Web App (PWA) Architecture**: The system is fully PWA-ready, allowing it to be installed as a standalone application on Windows, Android, and iOS. It features local caching for lightning-fast loads and "Add to Home Screen" support.
- **Real-Time Event-Driven Sync**: Utilizing **Socket.io** for bidirectional communication, ensuring the lobby display reacts to teller actions in under 50ms across the entire network.
- **Adaptive UI Density Engine**: A custom algorithm that qualitatively shifts layout paradigms (Single-Card vs. Multi-Column List) based on live ticket density for optimal legibility on large TVs.
- **Psychological Wait-Time Anchors**: Incorporates `BackgroundBeams` and micro-animations to keep the viewer's eye engaged, reducing perceived wait times.
- **Zero-Config Dynamic Topology**: A custom URL resolver that automatically bridges the frontend and backend regardless of the machine's IP, enabling "plug-and-play" deployment.

## 📦 Deployment

To deploy the project, you can use built-in distribution commands:

```sh
# Create a production build
npm run build

# Preview the production build locally
npm run preview
```

## 🌐 Custom Domain & Settings

For enterprise deployments, custom domains can be configured through your hosting provider or via the project's orchestration settings.

---

*Built with precision for the modern banking era.*
