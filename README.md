# CausalFlow — Autonomous Documentary Intelligence Studio

> Production Monorepo architecture for autonomous documentary intelligence, connecting global macro news catalysts, 10–50 year historical parallels, and micro-economic human impacts into production-ready YouTube video essays.

---

## 🏗️ Architecture & Split Deployment

```
PROJECT Z/
├── frontend/                  # Next.js 16 (App Router) client application (Vercel)
│   ├── src/
│   │   ├── app/               # UI pages, layouts, globals.css (no internal APIs)
│   │   ├── components/        # Blue/Obsidian/White design system components
│   │   ├── lib/api.ts         # Central API endpoints utility
│   │   ├── types/             # Shared TypeScript types
│   │   └── utils/             # Script formatting helpers
│   ├── .env.example           # NEXT_PUBLIC_API_URL=http://localhost:8000
│   └── package.json
│
├── backend/                   # Node.js + Express + TypeScript API server (Render)
│   ├── src/
│   │   └── index.ts           # Express server, CORS, and 3 intelligence routes + health check
│   ├── .env.example           # PORT=8000, FRONTEND_URL=...
│   ├── tsconfig.json
│   └── package.json
│
├── design-system/             # UI/UX Pro Max Architecture
│   └── causalflow/MASTER.md   # Blue (#2563EB), Black (#06080F), White (#FFFFFF) rules
└── package.json               # Monorepo task orchestration scripts
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
# Frontend
npm --prefix frontend install

# Backend
npm --prefix backend install
```

### 2. Run Both Services Concurrently
```bash
# Terminal 1: Start Backend (Port 8000)
npm run dev:backend

# Terminal 2: Start Frontend (Port 3000)
npm run dev:frontend
```

Open **http://localhost:3000** in your browser.

---

## 🌐 Production Deployment Guide

### A. Deploy Backend to Render (Web Service)
1. In [Render Dashboard](https://dashboard.render.com), create a new **Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Health Check Path:** `/health`
4. Set Environment Variables:
   - `PORT`: `8000` (or leave default assigned by Render)
   - `FRONTEND_URL`: Your Vercel frontend domain (e.g. `https://causalflow.vercel.app`)
   - `GROQ_API_KEY`: *(Optional server fallback key)*
   - `TAVILY_API_KEY`: *(Optional server fallback key)*

### B. Deploy Frontend to Vercel
1. In [Vercel Dashboard](https://vercel.com/new), import your repository.
2. Select **Root Directory:** `frontend`.
3. Framework Preset: **Next.js**.
4. Set Environment Variable:
   - `NEXT_PUBLIC_API_URL`: Your deployed Render backend URL (e.g. `https://causalflow-backend.onrender.com`).
5. Click **Deploy**.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Render health check (`{ status: "ok", timestamp: ... }`) |
| `GET` | `/api/radar` | Concurrently scrapes 45+ live global RSS headlines across Geopolitics, Finance, and AI |
| `POST` | `/api/synthesize` | Groq Llama 3.3 70B Autonomous Dot-Connector Agent |
| `POST` | `/api/script` | Tavily deep research + 5-Act documentary screenplay generator & single-act regeneration |
