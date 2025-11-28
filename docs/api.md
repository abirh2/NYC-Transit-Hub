# API Reference

This document describes the API endpoints available in NYC Transit Hub.

---

## Base URL

- **Development:** `http://localhost:3000/api`
- **Production:** `https://your-domain.com/api`

---

## Authentication

Most endpoints are public and require no authentication.

**Bus API** requires the `MTA_BUS_API_KEY` environment variable to be set.

---

## Endpoints

### Stations

#### GET /api/stations

Search and retrieve subway station information.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search stations by name (partial match) |
| `id` | string | Get specific station by ID |
| `limit` | number | Maximum results (default: 50) |

**Example Request:**

```bash
curl "http://localhost:3000/api/stations?search=times&limit=5"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "stations": [
      {
        "id": "127",
        "name": "Times Sq-42 St",
        "latitude": 40.75529,
        "longitude": -73.987495,
        "platforms": {
          "north": "127N",
          "south": "127S"
        }
      }
    ],
    "totalCount": 4
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

### Routes

#### GET /api/routes

Get subway route/line information.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Get specific route by ID (e.g., "A", "1", "L") |

**Example Request:**

```bash
curl "http://localhost:3000/api/routes?id=A"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "id": "A",
        "shortName": "A",
        "longName": "8 Avenue Express",
        "description": "Trains operate between Inwood-207 St...",
        "color": "#0062CF",
        "textColor": "#FFFFFF",
        "url": "https://www.mta.info/schedules/subway/a-train"
      }
    ],
    "totalCount": 1
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

### Alerts

#### GET /api/alerts

Get active service alerts from MTA.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `routeId` | string | Filter by route (e.g., "A", "F") |
| `severity` | string | Filter by severity: "INFO", "WARNING", "SEVERE" |
| `limit` | number | Maximum results |

**Example Request:**

```bash
curl "http://localhost:3000/api/alerts?limit=3"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "lmm:alert:123456",
        "affectedRoutes": ["A", "C", "E"],
        "affectedStops": ["A15"],
        "headerText": "Delays on A/C/E due to signal problems",
        "descriptionText": "Expect delays of up to 15 minutes",
        "severity": "WARNING",
        "alertType": "DELAY",
        "activePeriodStart": "2024-01-15T10:00:00.000Z",
        "activePeriodEnd": null
      }
    ],
    "totalCount": 3,
    "lastUpdated": "2024-01-15T12:00:00.000Z"
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Alert Severity Levels:**

| Level | Description |
|-------|-------------|
| `INFO` | Minor advisory, normal service |
| `WARNING` | Delays or service changes |
| `SEVERE` | Suspended service or major disruption |

**Alert Types:**

- `DELAY` - Trains running with delays
- `DETOUR` - Service rerouted
- `STATION_CLOSURE` - Station bypassed or closed
- `PLANNED_WORK` - Scheduled maintenance
- `SERVICE_CHANGE` - Route modifications
- `REDUCED_SERVICE` - Fewer trains running
- `SHUTTLE_BUS` - Bus replacement service
- `OTHER` - Other alerts

---

### Elevators

#### GET /api/elevators

Get elevator and escalator outage information.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `stationName` | string | Filter by station name (partial match) |
| `line` | string | Filter by subway line |
| `equipmentType` | string | "ELEVATOR" or "ESCALATOR" |
| `adaOnly` | boolean | Only ADA-compliant equipment |
| `limit` | number | Maximum results |

**Example Request:**

```bash
curl "http://localhost:3000/api/elevators?line=A&adaOnly=true"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "equipment": [
      {
        "equipmentId": "EL001",
        "stationName": "Jay St-MetroTech",
        "borough": "Brooklyn",
        "equipmentType": "ELEVATOR",
        "serving": "Street to platform",
        "adaCompliant": true,
        "isActive": false,
        "outageReason": "Capital Replacement",
        "outageStartTime": "2024-01-10T08:00:00.000Z",
        "estimatedReturn": "2024-06-01T00:00:00.000Z",
        "trainLines": ["A", "C", "F", "R"]
      }
    ],
    "totalOutages": 1,
    "lastUpdated": "2024-01-15T12:00:00.000Z"
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

### Train Arrivals

#### GET /api/trains/realtime

Get real-time train arrival predictions.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `stationId` | string | Filter by station/platform ID |
| `routeId` | string | Filter by route (e.g., "A", "1") |
| `direction` | string | "N" (uptown) or "S" (downtown) |
| `limit` | number | Maximum results (default: 20) |

**Example Request:**

```bash
curl "http://localhost:3000/api/trains/realtime?routeId=A&limit=5"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "arrivals": [
      {
        "tripId": "123456_A..N",
        "routeId": "A",
        "direction": "N",
        "headsign": "Inwood-207 St",
        "stopId": "A15N",
        "stationName": "",
        "arrivalTime": "2024-01-15T12:05:00.000Z",
        "departureTime": "2024-01-15T12:05:30.000Z",
        "delay": 0,
        "isAssigned": true,
        "minutesAway": 3
      }
    ],
    "lastUpdated": "2024-01-15T12:02:00.000Z"
  },
  "timestamp": "2024-01-15T12:02:00.000Z"
}
```

---

### Bus Arrivals

#### GET /api/buses/realtime

Get real-time bus arrival predictions.

**Requires:** `MTA_BUS_API_KEY` environment variable

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `routeId` | string | Filter by bus route (e.g., "M15") |
| `stopId` | string | Filter by stop ID |
| `limit` | number | Maximum results (default: 20) |

**Example Request:**

```bash
curl "http://localhost:3000/api/buses/realtime?routeId=M15&limit=5"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "arrivals": [
      {
        "vehicleId": "1234",
        "tripId": "trip_001",
        "routeId": "M15",
        "headsign": null,
        "latitude": 40.7128,
        "longitude": -74.0060,
        "bearing": 180.5,
        "nextStopId": "stop_123",
        "nextStopName": null,
        "arrivalTime": "2024-01-15T12:08:00.000Z",
        "distanceFromStop": null,
        "progressStatus": null,
        "minutesAway": 6
      }
    ],
    "lastUpdated": "2024-01-15T12:02:00.000Z"
  },
  "timestamp": "2024-01-15T12:02:00.000Z"
}
```

**Error Response (No API Key):**

```json
{
  "success": false,
  "data": null,
  "error": "Bus API not configured. Set MTA_BUS_API_KEY environment variable.",
  "timestamp": "2024-01-15T12:02:00.000Z"
}
```

---

### System Status

#### GET /api/status

Get overall system health and feed status.

**Example Request:**

```bash
curl "http://localhost:3000/api/status"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "feeds": [
      {
        "id": "subway",
        "name": "Subway GTFS-RT",
        "lastFetch": null,
        "lastSuccess": null,
        "lastError": null,
        "recordCount": 0,
        "isHealthy": true
      },
      {
        "id": "alerts",
        "name": "Service Alerts",
        "isHealthy": true
      },
      {
        "id": "elevators",
        "name": "Elevator/Escalator Status",
        "isHealthy": true
      },
      {
        "id": "buses",
        "name": "Bus GTFS-RT",
        "lastError": "API key not configured",
        "isHealthy": false
      }
    ],
    "overallHealth": "degraded",
    "lastUpdated": "2024-01-15T12:00:00.000Z"
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Health Status:**

| Status | Description |
|--------|-------------|
| `healthy` | All feeds operational |
| `degraded` | Some feeds have issues |
| `down` | All feeds unavailable |

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "data": null,
  "error": "Error message describing what went wrong",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Common HTTP Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 500 | Server error |
| 503 | Service unavailable (feed down or not configured) |

---

## Rate Limiting

Currently no rate limiting is implemented. MTA feeds are cached:

| Feed | Cache Duration |
|------|----------------|
| Trains | 30 seconds |
| Alerts | 60 seconds |
| Elevators | 5 minutes |
| Buses | 30 seconds |

---

## Development Scripts

Test all APIs with the included test script:

```bash
# Start dev server first
npm run dev

# In another terminal
node scripts/test-all-apis.mjs
```
