# SkyGuard AI — Edge Gateway REST & SSE API Reference

The SkyGuard Edge Gateway (`gateway/server.py`) is a lightweight, zero-dependency Python HTTP server designed for edge nodes (ESP32 / Raspberry Pi) and real-time dashboard connectivity.

Default Address: `http://localhost:3101`  
Protocol: HTTP/1.1 with CORS enabled (`*`)

---

## 1. Endpoints Overview

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status and simulator state | Public |
| `POST` | `/api/edge/ingest` | Ingest sensor reading from edge node or simulator | Public |
| `GET` | `/api/edge/latest` | Retrieve latest observation from all active stations | Public |
| `GET` | `/api/edge/latest/{station_id}` | Retrieve latest observation for a specific station | Public |
| `GET` | `/api/edge/history/{station_id}` | Retrieve historical observations for a station | Public |
| `GET` | `/api/edge/stream` | Server-Sent Events (SSE) live telemetry feed | Public |
| `POST` | `/api/edge/simulate` | Trigger synthetic data backfill and live generation | Public |
| `POST` | `/api/edge/simulate/stop` | Terminate active background simulation generator | Public |
| `POST` | `/api/notify/complaint` | File a station maintenance complaint / ticket | Public |
| `POST` | `/api/notify/event` | Post custom operational or maintenance event | Public |
| `GET` | `/api/notify/feed` | List recent notification and alert events | Public |

---

## 2. Endpoint Details

### `GET /api/health`
Checks server availability and running background simulation status.

**Response (200 OK):**
```json
{
  "ok": true,
  "svc": "edge-gw",
  "time": "2026-10-15T06:00:00Z",
  "sim": {
    "running": false,
    "station": "EDGE-PUNE-01"
  }
}
```

---

### `POST /api/edge/ingest`
Ingests an observation from an ESP32 hardware node or edge simulator. Automatically runs anomaly evaluation, stores in SQLite (`edge.db`), and broadcasts to SSE clients.

**Request Body (JSON):**
```json
{
  "station_id": "EDGE-PUNE-01",
  "temperature": 27.8,
  "humidity": 68.4,
  "pressure": 1012.3,
  "verdict": "NORMAL",
  "confidence": 94,
  "root_cause": "Normal Operation"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "stored": {
    "id": 142,
    "station_id": "EDGE-PUNE-01",
    "timestamp": "2026-10-15T06:00:15Z",
    "temperature": 27.8,
    "humidity": 68.4,
    "pressure": 1012.3,
    "verdict": "NORMAL",
    "confidence": 94,
    "root_cause": "Normal Operation"
  }
}
```

**Error Responses:**
- `400 Bad Request`: `{"ok": false, "error": "invalid JSON"}` or `{"ok": false, "error": "missing field"}`

---

### `GET /api/edge/latest`
Returns the most recent observation for every tracked station.

**Response (200 OK):**
```json
{
  "ok": true,
  "stations": [
    {
      "station_id": "EDGE-PUNE-01",
      "timestamp": "2026-10-15T06:00:15Z",
      "temperature": 27.8,
      "humidity": 68.4,
      "pressure": 1012.3,
      "verdict": "NORMAL",
      "confidence": 94
    }
  ]
}
```

---

### `GET /api/edge/history/{station_id}?limit=100`
Returns chronological observations for the specified station ID.

**Query Parameters:**
- `limit` (optional, default `100`, max `1000`): Number of records.

**Response (200 OK):**
```json
{
  "ok": true,
  "station_id": "EDGE-PUNE-01",
  "readings": [
    {
      "id": 140,
      "timestamp": "2026-10-15T05:50:00Z",
      "temperature": 27.5,
      "humidity": 69.1,
      "pressure": 1012.5,
      "verdict": "NORMAL"
    },
    {
      "id": 141,
      "timestamp": "2026-10-15T05:55:00Z",
      "temperature": 27.6,
      "humidity": 68.8,
      "pressure": 1012.4,
      "verdict": "NORMAL"
    }
  ]
}
```

---

### `GET /api/edge/stream`
Server-Sent Events (SSE) stream delivering real-time telemetry directly to frontend charts without polling.

**Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Stream Chunk Format:**
```
data: {"type": "reading", "station_id": "EDGE-PUNE-01", "temperature": 27.8, "humidity": 68.4, "pressure": 1012.3, "verdict": "NORMAL", "confidence": 94}

```

---

### `POST /api/edge/simulate`
Starts or backfills simulated meteorological data for demonstration and testing.

**Request Body (JSON):**
```json
{
  "station_id": "EDGE-PUNE-01",
  "hours": 24,
  "interval": 5.0,
  "live": true,
  "verdict": "auto"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "injected": 288,
  "hours": 24,
  "station": "EDGE-PUNE-01",
  "live": true,
  "started": true
}
```

---

### `POST /api/edge/simulate/stop`
Stops an active background simulation.

**Response (200 OK):**
```json
{
  "ok": true,
  "sim": false,
  "stopped": true
}
```
