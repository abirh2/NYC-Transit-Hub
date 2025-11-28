# API Reference

This document describes the API endpoints for NYC Transit Hub.

> **Note:** API endpoints are planned for Phase 1. This document serves as a specification for future implementation.

---

## Base URL

```
Development: http://localhost:3000/api
Production:  https://nyc-transit-hub.vercel.app/api
```

---

## Authentication

Most endpoints are public. User-specific endpoints (commute, preferences) will require authentication.

```
Authorization: Bearer <token>
```

---

## Endpoints

### Trains

#### Get Real-time Arrivals

```http
GET /api/trains/realtime
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `station_id` | string | No | Filter by station ID |
| `route` | string | No | Filter by route (e.g., "F", "A") |
| `direction` | string | No | Filter by direction ("N" or "S") |

**Response:**

```json
{
  "data": [
    {
      "trip_id": "123456_F..N",
      "route_id": "F",
      "stop_id": "D20N",
      "arrival_time": "2025-11-28T14:30:00Z",
      "departure_time": "2025-11-28T14:30:30Z",
      "direction": "N",
      "destination": "Jamaica-179 St"
    }
  ],
  "timestamp": "2025-11-28T14:25:00Z"
}
```

---

### Stations

#### List All Stations

```http
GET /api/stations
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `line` | string | No | Filter by subway line |
| `borough` | string | No | Filter by borough |
| `accessible` | boolean | No | Filter by accessibility |

**Response:**

```json
{
  "data": [
    {
      "id": "D20",
      "name": "West 4th St-Washington Sq",
      "lines": ["A", "C", "E", "B", "D", "F", "M"],
      "borough": "Manhattan",
      "latitude": 40.732338,
      "longitude": -74.000495,
      "accessible": true
    }
  ]
}
```

#### Get Station Details

```http
GET /api/stations/:id
```

**Response:**

```json
{
  "data": {
    "id": "D20",
    "name": "West 4th St-Washington Sq",
    "lines": ["A", "C", "E", "B", "D", "F", "M"],
    "borough": "Manhattan",
    "latitude": 40.732338,
    "longitude": -74.000495,
    "accessible": true,
    "entrances": [
      {
        "type": "stairs",
        "location": "NW corner of 6th Ave & W 4th St"
      }
    ],
    "elevators": [
      {
        "id": "EL123",
        "status": "active",
        "location": "Street to mezzanine"
      }
    ]
  }
}
```

---

### Alerts

#### Get Service Alerts

```http
GET /api/alerts
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `route` | string | No | Filter by route |
| `severity` | string | No | Filter by severity (major, minor, info) |
| `active` | boolean | No | Only active alerts (default: true) |

**Response:**

```json
{
  "data": [
    {
      "id": "alert_123",
      "header": "F train delays",
      "description": "Delays due to signal problems at 34th St-Penn Station",
      "routes": ["F"],
      "severity": "major",
      "effect": "SIGNIFICANT_DELAYS",
      "start_time": "2025-11-28T10:00:00Z",
      "end_time": null,
      "updated_at": "2025-11-28T14:00:00Z"
    }
  ],
  "count": 1
}
```

---

### Elevators

#### Get Elevator Status

```http
GET /api/elevators
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `station_id` | string | No | Filter by station |
| `status` | string | No | Filter by status (active, outage) |

**Response:**

```json
{
  "data": [
    {
      "id": "EL123",
      "station_id": "D20",
      "station_name": "West 4th St-Washington Sq",
      "type": "elevator",
      "status": "active",
      "description": "Street to mezzanine",
      "ada_compliant": true,
      "outage_start": null,
      "estimated_return": null
    }
  ],
  "outage_count": 0
}
```

---

### Metrics

#### Get Reliability Metrics

```http
GET /api/metrics/reliability
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `route` | string | No | Filter by route |
| `period` | string | No | Time period (today, 7d, 30d) |

**Response:**

```json
{
  "data": [
    {
      "route_id": "F",
      "on_time_percentage": 78.5,
      "average_delay_seconds": 120,
      "total_trips": 450,
      "delayed_trips": 97,
      "period": "7d"
    }
  ]
}
```

#### Get Crowding Estimates

```http
GET /api/metrics/crowding
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `route` | string | No | Filter by route |

**Response:**

```json
{
  "data": [
    {
      "route_id": "F",
      "direction": "N",
      "crowding_level": "medium",
      "headway_seconds": 360,
      "timestamp": "2025-11-28T14:25:00Z"
    }
  ]
}
```

---

### Commute (Authenticated)

#### Get Commute Summary

```http
GET /api/commute/summary
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "data": {
    "home_station": "D20",
    "work_station": "R15",
    "recommended_departure": "2025-11-28T08:15:00Z",
    "estimated_arrival": "2025-11-28T08:49:00Z",
    "estimated_duration_minutes": 34,
    "route": ["F", "A"],
    "status": "on_time",
    "alerts": []
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Invalid station_id provided",
    "details": {
      "parameter": "station_id",
      "value": "invalid"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_PARAMETER` | 400 | Invalid request parameter |
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Authentication required |
| `RATE_LIMITED` | 429 | Too many requests |
| `FEED_UNAVAILABLE` | 503 | MTA feed unavailable |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Public endpoints | 100 requests/minute |
| Authenticated endpoints | 300 requests/minute |

---

## Webhooks (Future)

Planned webhook support for:
- Service alert notifications
- Commute reminders
- Elevator outage alerts

