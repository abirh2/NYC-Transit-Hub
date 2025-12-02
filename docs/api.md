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

#### GET /api/elevators/upcoming

Get planned/upcoming elevator and escalator outages.

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
curl "http://localhost:3000/api/elevators/upcoming?adaOnly=true"
```

**Example Response:**

Same format as `/api/elevators`, but returns planned future outages.

---

### Accessible Routes

#### GET /api/routes/accessible

Find accessible routes between subway stations, accounting for elevator outages.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string | **Required.** Origin station ID |
| `to` | string | **Required.** Destination station ID |
| `requireAccessible` | boolean | Only return fully accessible routes (default: false) |

**Example Request:**

```bash
curl "http://localhost:3000/api/routes/accessible?from=127&to=A15&requireAccessible=true"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "primary": {
      "segments": [
        {
          "fromStationId": "127",
          "fromStationName": "Times Sq-42 St",
          "toStationId": "A28",
          "toStationName": "34 St-Penn Station",
          "line": "A",
          "isExpress": false,
          "travelMinutes": 3.5,
          "isAccessible": true,
          "hasElevatorOutage": false
        }
      ],
      "totalMinutes": 12.5,
      "isFullyAccessible": true,
      "blockedStations": [],
      "transferCount": 1
    },
    "alternatives": [
      {
        "segments": [...],
        "totalMinutes": 15,
        "isFullyAccessible": true,
        "blockedStations": [],
        "transferCount": 2
      }
    ],
    "warnings": [],
    "fromStation": {
      "id": "127",
      "name": "Times Sq-42 St"
    },
    "toStation": {
      "id": "A15",
      "name": "Jay St-MetroTech"
    },
    "lastUpdated": "2024-01-15T12:00:00.000Z"
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Route Segment Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `fromStationId` | string | Origin station ID for this segment |
| `fromStationName` | string | Origin station name |
| `toStationId` | string | Destination station ID for this segment |
| `toStationName` | string | Destination station name |
| `line` | string | Subway line (or "TRANSFER" for walking transfer) |
| `isExpress` | boolean | Whether this is an express segment |
| `travelMinutes` | number | Estimated travel time in minutes |
| `isAccessible` | boolean | Whether this segment is wheelchair accessible |
| `hasElevatorOutage` | boolean | Whether destination has elevator outage |

**Route Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `primary` | object\|null | Recommended route (fastest) |
| `alternatives` | array | Alternative routes, sorted by accessibility and time |
| `warnings` | array | Any warnings (e.g., "No accessible route available") |
| `fromStation` | object | Origin station info |
| `toStation` | object | Destination station info |

#### GET /api/routes/trip

Plan a transit trip between two locations using MTA's OpenTripPlanner API. Supports wheelchair-accessible routing and returns detailed itineraries with walking and transit legs.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `fromLat` | number | **Required.** Origin latitude |
| `fromLon` | number | **Required.** Origin longitude |
| `toLat` | number | **Required.** Destination latitude |
| `toLon` | number | **Required.** Destination longitude |
| `wheelchair` | boolean | Require wheelchair-accessible routes (default: false) |
| `date` | string | Trip date in MM/DD/YY format (default: today) |
| `time` | string | Trip time in h:mma format (default: now) |
| `numItineraries` | number | Number of route options to return (default: 3) |

**Example Request:**

```bash
curl "http://localhost:3000/api/routes/trip?fromLat=40.8731&fromLon=-73.8837&toLat=40.7567&toLon=-73.9814&wheelchair=true"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "from": { "name": "Origin", "lon": -73.8837, "lat": 40.8731 },
    "to": { "name": "Destination", "lon": -73.9814, "lat": 40.7567 },
    "wheelchair": true,
    "itineraries": [
      {
        "duration": 2640,
        "startTimeFmt": "2024-12-01T13:19:00-05:00",
        "endTimeFmt": "2024-12-01T14:03:00-05:00",
        "walkTime": 540,
        "transitTime": 2100,
        "walkDistance": 650.5,
        "transfers": 0,
        "legs": [
          {
            "startTimeFmt": "2024-12-01T13:19:00-05:00",
            "endTimeFmt": "2024-12-01T13:25:00-05:00",
            "mode": "WALK",
            "duration": 360,
            "distance": 400,
            "from": { "name": "Origin", "lon": -73.8837, "lat": 40.8731 },
            "to": { "name": "Bedford Park Blvd", "lon": -73.8871, "lat": 40.8731 },
            "transitLeg": false
          },
          {
            "startTimeFmt": "2024-12-01T13:25:00-05:00",
            "endTimeFmt": "2024-12-01T14:00:00-05:00",
            "mode": "SUBWAY",
            "route": "D",
            "routeColor": "FF6319",
            "headsign": "Coney Island-Stillwell Av",
            "duration": 2100,
            "distance": 15000,
            "from": { "name": "Bedford Park Blvd", "lon": -73.8871, "lat": 40.8731 },
            "to": { "name": "47-50 Sts-Rockefeller Ctr", "lon": -73.9814, "lat": 40.7589 },
            "intermediateStops": [
              { "name": "Kingsbridge Rd" },
              { "name": "Fordham Rd" }
            ],
            "transitLeg": true
          },
          {
            "startTimeFmt": "2024-12-01T14:00:00-05:00",
            "endTimeFmt": "2024-12-01T14:03:00-05:00",
            "mode": "WALK",
            "duration": 180,
            "distance": 250.5,
            "from": { "name": "47-50 Sts-Rockefeller Ctr", "lon": -73.9814, "lat": 40.7589 },
            "to": { "name": "Destination", "lon": -73.9814, "lat": 40.7567 },
            "transitLeg": false
          }
        ]
      }
    ]
  }
}
```

**Leg Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `mode` | string | "WALK", "SUBWAY", "BUS", "RAIL", "TRAM", "FERRY" |
| `route` | string | Transit route (e.g., "D", "Harlem", "Q44") |
| `routeColor` | string | Hex color code for the route |
| `headsign` | string | Destination displayed on the train/bus |
| `duration` | number | Duration in seconds |
| `distance` | number | Distance in meters |
| `transitLeg` | boolean | True for transit, false for walking |
| `intermediateStops` | array | Stops between origin and destination (transit only) |

**Error Response:**

```json
{
  "success": false,
  "error": "No trip found. There may be no transit service within the maximum specified distance.",
  "noPath": true
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

### Commute Settings

#### GET /api/commute/settings

Get the authenticated user's commute settings.

**Authentication:** Required (Supabase Auth)

**Example Request:**

```bash
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/commute/settings"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "isConfigured": true,
    "settings": {
      "homeAddress": "123 Main St, Brooklyn, NY",
      "homeLat": 40.6782,
      "homeLon": -73.9442,
      "workAddress": "456 Broadway, Manhattan, NY",
      "workLat": 40.7614,
      "workLon": -73.9776,
      "targetArrival": "09:00"
    }
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

#### POST /api/commute/settings

Create or update commute settings for the authenticated user.

**Authentication:** Required (Supabase Auth)

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| `homeAddress` | string | Home address display text |
| `homeLat` | number | Home latitude |
| `homeLon` | number | Home longitude |
| `workAddress` | string | Work address display text |
| `workLat` | number | Work latitude |
| `workLon` | number | Work longitude |
| `targetArrival` | string | Target arrival time in HH:MM format (24-hour) |

**Example Request:**

```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"homeAddress":"123 Main St","homeLat":40.6782,"homeLon":-73.9442,"workAddress":"456 Broadway","workLat":40.7614,"workLon":-73.9776,"targetArrival":"09:00"}' \
  "http://localhost:3000/api/commute/settings"
```

---

### Commute Summary

#### GET /api/commute/summary

Get real-time commute summary with departure suggestions.

**Authentication:** Optional (returns limited data if not authenticated)

**Example Request:**

```bash
curl "http://localhost:3000/api/commute/summary"
```

**Example Response (Authenticated & Configured):**

```json
{
  "success": true,
  "data": {
    "isAuthenticated": true,
    "isConfigured": true,
    "leaveIn": "12 min",
    "leaveAt": "2024-01-15T08:48:00.000Z",
    "arriveBy": "9:00 AM",
    "duration": 35,
    "route": "F → A",
    "status": "on_time",
    "delayMinutes": 0,
    "targetArrival": "9:00 AM"
  },
  "timestamp": "2024-01-15T08:36:00.000Z"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `isAuthenticated` | boolean | Whether user is logged in |
| `isConfigured` | boolean | Whether commute settings are complete |
| `leaveIn` | string | Time until departure ("12 min", "Now", "1h 5m") |
| `leaveAt` | string | ISO timestamp of suggested departure |
| `arriveBy` | string | Formatted arrival time ("9:00 AM") |
| `duration` | number | Trip duration in minutes |
| `route` | string | Transit route summary ("F → A → 1") |
| `status` | string | "on_time", "delayed", or "early" |
| `delayMinutes` | number | Minutes ahead/behind target |

---

### Crowding Metrics

#### GET /api/metrics/crowding

Get real-time crowding estimates for subway lines.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `route` | string | Optional. Specific subway line (e.g., "A", "1") |
| `enhanced` | boolean | Optional. Use `true` for multi-factor analysis (default: false) |

**Example Request - Network-wide (Simple):**

```bash
curl "http://localhost:3000/api/metrics/crowding"
```

**Example Response (Simple):**

```json
[
  {
    "routeId": "A",
    "avgHeadwayMin": 8,
    "crowdingLevel": "MEDIUM",
    "timestamp": "2024-12-02T20:00:00.000Z",
    "referenceStation": "A27"
  }
]
```

**Example Request - Enhanced Analysis:**

```bash
curl "http://localhost:3000/api/metrics/crowding?enhanced=true&route=A"
```

**Example Response (Enhanced):**

```json
{
  "routeId": "A",
  "mode": "subway",
  "avgScore": 45,
  "avgLevel": "MEDIUM",
  "segments": [
    {
      "routeId": "A",
      "mode": "subway",
      "direction": "N",
      "segmentId": "A-inwood",
      "segmentName": "Inwood",
      "segmentStart": "A02",
      "segmentEnd": "A12",
      "crowdingLevel": "MEDIUM",
      "crowdingScore": 45,
      "factors": {
        "headway": 0.42,
        "demand": 0.45,
        "delay": 0.0,
        "alerts": 0.46
      },
      "timestamp": "2024-12-02T20:00:00.000Z",
      "stationsInSegment": ["A02", "A03", "A05", "A06", "A07", "A09", "A10", "A11", "A12"]
    }
  ],
  "timestamp": "2024-12-02T20:00:00.000Z"
}
```

**Crowding Levels:**

| Level | Score Range | Description |
|-------|-------------|-------------|
| `LOW` | 0-33 | Good service, minimal crowding |
| `MEDIUM` | 34-66 | Moderate crowding, busy but manageable |
| `HIGH` | 67-100 | Heavy crowding, expect delays and packed trains |

**Enhanced Mode Factors:**

| Factor | Weight | Description |
|--------|--------|-------------|
| Headway | 35% | Time gaps between trains |
| Demand | 35% | Time-of-day ridership patterns |
| Delay | 20% | Real-time train delays |
| Alerts | 10% | Active service disruptions |

**Caching:** 60 seconds

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
