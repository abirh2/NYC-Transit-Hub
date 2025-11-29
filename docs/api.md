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
| `near` | string | Find nearby stations by coordinates (format: `lat,lon`) |
| `radius` | number | Search radius in miles when using `near` (default: 1, max: 5) |
| `limit` | number | Maximum results (default: 50, max: 100) |

**Example Request - Search:**

```bash
curl "http://localhost:3000/api/stations?search=times&limit=5"
```

**Example Request - Nearby:**

```bash
curl "http://localhost:3000/api/stations?near=40.758,-73.985&radius=0.5&limit=5"
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
        },
        "allIds": ["127", "725", "902", "A27"],
        "allPlatforms": {
          "north": ["127N", "725N", "902N", "A27N"],
          "south": ["127S", "725S", "902S", "A27S"]
        }
      }
    ],
    "totalCount": 1
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Primary station ID |
| `name` | string | Station name |
| `latitude` | number | Station latitude |
| `longitude` | number | Station longitude |
| `platforms.north` | string\|null | Primary northbound platform ID |
| `platforms.south` | string\|null | Primary southbound platform ID |
| `allIds` | string[] | All station complex IDs sharing this name (for multi-complex stations like Times Sq) |
| `allPlatforms.north` | string[] | All northbound platform IDs across all complexes |
| `allPlatforms.south` | string[] | All southbound platform IDs across all complexes |
| `distance` | number | Distance in miles (only present when using `near` parameter)
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

### Incidents

#### GET /api/incidents

Get service incidents with filtering, sorting, and statistics. Extends the alerts endpoint with computed stats and status-based filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: "active" (currently happening) or "upcoming" (future planned work) |
| `routeId` | string | Filter by route (e.g., "A", "F") |
| `alertType` | string | Filter by type (see Alert Types above) |
| `severity` | string | Filter by severity: "INFO", "WARNING", "SEVERE" |
| `from` | string | Filter by start date (ISO 8601) |
| `to` | string | Filter by end date (ISO 8601) |
| `activeOnly` | boolean | Legacy: filter to not-yet-ended incidents |
| `limit` | number | Maximum results |

**Example Request - Active Incidents:**

```bash
curl "http://localhost:3000/api/incidents?status=active"
```

**Example Request - Upcoming Planned Work:**

```bash
curl "http://localhost:3000/api/incidents?status=upcoming"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "incidents": [
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
    "stats": {
      "total": 5,
      "byLine": [
        { "line": "A", "count": 3 },
        { "line": "F", "count": 2 }
      ],
      "byType": [
        { "type": "DELAY", "count": 3 },
        { "type": "PLANNED_WORK", "count": 2 }
      ],
      "bySeverity": {
        "severe": 1,
        "warning": 3,
        "info": 1
      }
    },
    "lastUpdated": "2024-01-15T12:00:00.000Z"
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Status Filter:**

| Status | Description |
|--------|-------------|
| `active` | Incidents that have started AND not ended (currently affecting service) |
| `upcoming` | Future planned work that hasn't started yet |

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

### Reliability

#### GET /api/reliability

Get line reliability metrics based on historical incident data.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `routeId` | string | Filter by subway line (e.g., "A", "F") |
| `days` | number | Number of days to include (default: 30, max: 30) |

**Example Request:**

```bash
curl "http://localhost:3000/api/reliability?days=7"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "totalIncidents": 145,
    "periodDays": 7,
    "dataStartDate": "2024-01-08",
    "hasHistoricalData": true,
    "byLine": [
      {
        "routeId": "A",
        "totalIncidents": 25,
        "delayCount": 15,
        "severeCount": 3,
        "avgIncidentsPerDay": 3.57,
        "reliabilityScore": 72
      }
    ],
    "byTimeOfDay": [
      { "period": "amRush", "label": "AM Rush", "hours": "6am - 10am", "totalIncidents": 45 },
      { "period": "midday", "label": "Midday", "hours": "10am - 2pm", "totalIncidents": 20 },
      { "period": "pmRush", "label": "PM Rush", "hours": "2pm - 6pm", "totalIncidents": 50 },
      { "period": "evening", "label": "Evening", "hours": "6pm - 10pm", "totalIncidents": 18 },
      { "period": "night", "label": "Night", "hours": "10pm - 6am", "totalIncidents": 12 }
    ],
    "dailyTrend": [
      { "date": "2024-01-08", "totalIncidents": 22, "delayCount": 12, "severeCount": 3 },
      { "date": "2024-01-09", "totalIncidents": 18, "delayCount": 10, "severeCount": 2 }
    ],
    "liveAlerts": null,
    "lastUpdated": "2024-01-15T12:00:00.000Z"
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `totalIncidents` | number | Total incidents in the time period |
| `periodDays` | number | Number of days in the query |
| `dataStartDate` | string\|null | Earliest date with data |
| `hasHistoricalData` | boolean | Whether historical data exists |
| `byLine` | array | Per-line reliability metrics |
| `byTimeOfDay` | array | Incidents by time of day |
| `dailyTrend` | array | Daily incident counts for charting |
| `liveAlerts` | object\|null | Current alerts (fallback when no historical data) |

**Reliability Score:**

Calculated as `100 - (avgIncidentsPerDay * 20)`, clamped to 0-100.

| Score | Label |
|-------|-------|
| 90-100 | Excellent |
| 80-89 | Good |
| 70-79 | Fair |
| 60-69 | Poor |
| 0-59 | Very Poor |

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
