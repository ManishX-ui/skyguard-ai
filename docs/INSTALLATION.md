# SkyGuard AI — Installation & Local Setup Guide

This guide provides instructions for setting up, testing, and running **SkyGuard AI** on Windows (PowerShell) as well as macOS and Linux.

---

## 1. System Prerequisites

| Component | Minimum Version | Required For |
| :--- | :--- | :--- |
| **Python** | 3.9+ (tested up to 3.12) | Core detection engine, Edge Gateway, unit tests |
| **Node.js & npm** | Node 18+ & npm 9+ | Modern React dashboard (`skyguard-app/`) |
| **Git** | 2.30+ | Version control and repository management |
| **Google Chrome / Edge** | Modern evergreen | Dashboard visualization and live mapping |
| **Arduino IDE 2.x** | *(Optional)* | Flashing ESP32 microcontroller firmware |

---

## 2. Cloning the Repository

```powershell
# Clone the repository
git clone https://github.com/ManishX-ui/skyguard-ai.git
cd skyguard-ai
```

*(On Linux / macOS, use the same `git clone` command in `bash` or `zsh`)*

---

## 3. Python Environment & Core Engine Setup

SkyGuard AI's core engine (`anomaly_engine.py`) has **zero mandatory third-party dependencies**—it executes cleanly on Python's standard library alone.

### Optional: Set Up a Virtual Environment (Recommended)

```powershell
# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1

# Linux / macOS
# python3 -m venv venv
# source venv/bin/activate
```

### Optional: Install Extras
If you wish to use large pandas datasets, enhanced SHAP plots, or MQTT ingestion:

```powershell
pip install -r requirements.txt
```

---

## 4. Running Tests & Verifying Core Logic

Run the automated test suite to ensure the 5-layer detection stack operates correctly:

```powershell
# Run the 29 unit tests
python -m unittest discover -s tests -v

# Run the fault-injection demo with real-time Precision / Recall / F1 output
python anomaly_engine.py --demo

# Run streaming demo with live alerts and additive explanations
python examples/stream_example.py
```

---

## 5. Running the Edge Gateway (Backend)

The Edge Gateway serves real-time REST and SSE endpoints for weather station ingest and frontend updates:

```powershell
# Run from repository root
python gateway/server.py --port 3101
```

Once running:
- Health check: `http://localhost:3101/api/health`
- Ingest test:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3101/api/edge/simulate" -Method Post -Body '{"station_id":"EDGE-PUNE-01","hours":24,"live":true}' -ContentType "application/json"
  ```

---

## 6. Running the Dashboards

SkyGuard AI includes two dashboard options:

### Option A: Modern React + Vite Dashboard (Recommended)

Requires Node.js:

```powershell
# Navigate into the frontend directory
cd skyguard-app

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your web browser.

To verify a production build:
```powershell
npm run build
npm run preview
```

### Option B: Standalone Zero-Install Dashboard

For instant inspection without Node.js:
- Double-click `index.html` in your file explorer, or
- Serve locally:
  ```powershell
  python -m http.server 8000
  # Open http://localhost:8000/index.html
  ```

---

## 7. Troubleshooting

### Port 3101 Already in Use
If another process holds port 3101:
```powershell
# Start gateway on an alternate port
python gateway/server.py --port 3102
```
Then configure `VITE_EDGE_API_URL=http://localhost:3102` in `skyguard-app/.env`.

### PowerShell Script Execution Policy
If `.\venv\Scripts\Activate.ps1` gives an execution policy error:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Frontend Build Warning: Chunk Size
Vite may report that certain vendor chunks (e.g. Leaflet or Recharts) exceed 500 kB. This is expected and normal for comprehensive visualization libraries. The application is fully optimized for client-side rendering.
