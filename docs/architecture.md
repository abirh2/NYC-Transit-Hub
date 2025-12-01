# System Architecture

This document describes the architecture and design decisions of the NYC Transit Hub application.

## Overview

NYC Transit Hub is a Next.js application that consumes MTA real-time data feeds and presents them in a user-friendly dashboard interface.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Dashboard  │  │   Station   │  │    Live     │    ...       │
│  │    Page     │  │    Board    │  │   Tracker   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js App Router                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Server Components (RSC)                     │    │
│  │   - Initial data fetching                               │    │
│  │   - SEO optimization                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              API Routes (/api/*)                         │    │
│  │   - /api/trains/realtime    - /api/alerts               │    │
│  │   - /api/elevators          - /api/stations             │    │
│  │   - /api/buses/realtime     - /api/routes               │    │
│  │   - /api/status             - /api/ingest/*             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   MTA GTFS   │  │   Database   │  │  GTFS Static │          │
│  │  RT Feeds    │  │  (Supabase)  │  │    Files     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
NYC-Transit-Hub/
├── app/                        # Next.js App Router
│   ├── layout.tsx             # Root layout (providers, shell)
│   ├── page.tsx               # Home dashboard
│   ├── globals.css            # Global styles + Tailwind config
│   ├── api/                   # API routes
│   │   ├── alerts/            # Service alerts endpoint
│   │   ├── buses/realtime/    # Bus arrivals endpoint
│   │   ├── elevators/         # Elevator status endpoint
│   │   ├── ingest/            # Data ingestion endpoints
│   │   │   ├── alerts/
│   │   │   ├── buses/
│   │   │   ├── elevators/
│   │   │   └── subway/
│   │   ├── routes/            # Route info endpoint
│   │   ├── stations/          # Station search endpoint
│   │   ├── status/            # System health endpoint
│   │   └── trains/realtime/   # Train arrivals endpoint
│   ├── accessibility/
│   ├── board/
│   ├── commute/
│   ├── crowding/
│   ├── incidents/
│   ├── realtime/
│   └── reliability/
│
├── components/                 # React components
│   ├── accessibility/         # Elevator outage and route components
│   │   ├── OutageStats.tsx    # Summary statistics
│   │   ├── OutageFilters.tsx  # Filter controls
│   │   ├── OutageList.tsx     # Outage card list
│   │   ├── RouteFinder.tsx    # Route planning UI
│   │   ├── RouteResults.tsx   # Route display
│   │   └── index.ts
│   ├── board/                 # Station board components
│   ├── dashboard/             # Dashboard card components
│   ├── incidents/             # Incident explorer components
│   ├── layout/                # Layout components
│   ├── realtime/              # Live train tracker components
│   │   ├── LineSelector.tsx   # Multi-select line picker
│   │   ├── LineDiagram.tsx    # Vertical track diagram
│   │   ├── TrainMarker.tsx    # Train position indicator
│   │   ├── TrainDetailPopover.tsx # Train info popover
│   │   └── index.ts
│   ├── reliability/           # Line reliability components
│   │   ├── ReliabilityClient.tsx    # Main client component
│   │   ├── ReliabilitySummaryCards.tsx # Summary stats
│   │   ├── LinePerformanceCard.tsx  # Per-line scores
│   │   ├── ReliabilityChart.tsx     # Trend chart
│   │   ├── TimeOfDayChart.tsx       # Time-of-day analysis
│   │   └── index.ts
│   ├── ui/                    # Reusable UI components
│   └── Providers.tsx          # Context providers
│
├── lib/                       # Utilities and helpers
│   ├── db.ts                  # Prisma client singleton
│   ├── generated/prisma/      # Generated Prisma client
│   ├── gtfs/                  # GTFS static data parser
│   │   ├── parser.ts          # CSV parsing and station lookup
│   │   ├── line-stations.ts   # Ordered station sequences per line
│   │   └── index.ts
│   ├── hooks/                 # React hooks
│   │   ├── useStationPreferences.ts  # Favorite stations (localStorage)
│   │   └── useGeolocation.ts         # Browser geolocation
│   ├── utils/                 # Utility functions
│   │   └── distance.ts        # Haversine distance calculations
│   ├── mta/                   # MTA feed clients
│   │   ├── config.ts          # Feed URLs and configuration
│   │   ├── gtfs-rt.ts         # Protobuf parser for subway
│   │   ├── alerts.ts          # Service alerts (JSON)
│   │   ├── elevators.ts       # Elevator status (JSON)
│   │   ├── buses.ts           # Bus feeds (protobuf)
│   │   └── index.ts
│   └── routing/               # Accessible route pathfinding
│       ├── graph.ts           # Station graph + Dijkstra algorithm
│       ├── realtime.ts        # Real-time travel time integration
│       └── index.ts
│
├── types/                     # TypeScript definitions
│   ├── gtfs.ts               # GTFS-RT message types
│   ├── mta.ts                # MTA-specific types
│   ├── api.ts                # API request/response types
│   └── index.ts
│
├── data/                      # Static data files
│   └── gtfs/                  # MTA GTFS static feed
│       ├── stops.txt          # Station data (496 stations)
│       ├── routes.txt         # Route data (29 routes)
│       └── line-stations.json # Ordered station sequences per line
│
├── prisma/                    # Database schema
│   └── schema.prisma          # Prisma schema definition
│
├── public/                    # Static assets
│   └── icons/subway/          # MTA bullet SVGs
│
├── scripts/                   # Development scripts
│   ├── test-all-apis.mjs      # API test suite
│   ├── test-mta-apis.mjs      # Raw MTA API tester
│   └── test-gtfs-parser.mjs   # GTFS parser tester
│
├── tests/                     # Test files
│   ├── unit/                  # Unit tests
│   ├── components/            # Component tests
│   └── e2e/                   # End-to-end tests
│
├── docs/                      # Documentation
└── stories/                   # Storybook stories
```

---

## API Endpoints

### Public Read APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stations` | GET | Search stations by name, get by ID |
| `/api/routes` | GET | Get subway route info and colors |
| `/api/routes/accessible` | GET | Calculate accessible routes between stations |
| `/api/routes/trip` | GET | Plan transit trip using MTA's OTP API (addresses) |
| `/api/alerts` | GET | Get active service alerts (live) |
| `/api/incidents` | GET | Get incidents with stats and filtering |
| `/api/elevators` | GET | Get elevator/escalator outages (live) |
| `/api/elevators/upcoming` | GET | Get planned elevator/escalator outages |
| `/api/trains/realtime` | GET | Get train arrivals (live GTFS-RT) |
| `/api/buses/realtime` | GET | Get bus arrivals (requires API key) |
| `/api/reliability` | GET | Get line reliability metrics (30-day history) |
| `/api/status` | GET | Get system health status |

### Ingestion APIs (Database)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ingest/subway` | POST | Ingest subway GTFS-RT data |
| `/api/ingest/alerts` | POST | Ingest service alerts |
| `/api/ingest/elevators` | POST | Ingest elevator status |
| `/api/ingest/buses` | POST | Ingest bus data |
| `/api/ingest/reliability` | POST | Aggregate alerts into daily metrics + cleanup |

---

## Data Sources

### MTA GTFS-Realtime Feeds

| Feed | Format | Auth Required |
|------|--------|---------------|
| Subway (8 feeds) | Protobuf | No |
| Alerts | JSON | No |
| Elevator/Escalator | JSON | No |
| Buses | Protobuf | Yes (API key) |

### Static GTFS Data

- **stops.txt** - 496 subway stations with coordinates
- **routes.txt** - 29 subway routes with colors
- **line-stations.json** - Ordered station sequences for all 26 subway lines

---

## Database Schema (Supabase)

| Table | Purpose |
|-------|---------|
| `stations` | Station metadata and accessibility |
| `realtime_trips` | Train positions and arrivals |
| `alerts` | Service alerts |
| `elevator_status` | Elevator/escalator outages |
| `bus_trips` | Bus positions and arrivals |
| `feed_status` | Feed health tracking |
| `daily_line_metrics` | Aggregated reliability metrics per line per day |

### Data Retention

| Table | Retention Policy |
|-------|------------------|
| `realtime_trips` | 2 hours (auto-cleanup during ingestion) |
| `alerts` | Current only (deleted when inactive) |
| `daily_line_metrics` | 30 days (auto-cleanup during ingestion) |

---

## Key Design Decisions

### 1. Next.js App Router

We use the App Router (not Pages Router) for:
- **Server Components** - Reduce client-side JavaScript
- **Streaming** - Progressive page loading
- **Nested Layouts** - Shared UI across routes
- **Built-in SEO** - Metadata API

### 2. Direct MTA Feed Access

Public APIs fetch directly from MTA feeds in real-time:
- No database required for basic functionality
- Always fresh data (30-60 second cache)
- Database used for historical analytics

### 3. GTFS Static Data as Files

Station and route data loaded from GTFS text files:
- Faster than database queries for static data
- Easy to update by replacing files
- No network latency for lookups

### 4. Prisma + Supabase

Database layer for:
- Historical data storage (analytics)
- User preferences (future)
- Caching heavy computations

### 5. Zod Validation

All external API responses validated with Zod schemas:
- Type-safe parsing
- Graceful error handling
- Self-documenting API contracts

### 6. Custom React Hooks

Encapsulate complex state logic in reusable hooks:

| Hook | Purpose |
|------|---------|
| `useStationPreferences` | Manage favorite stations in localStorage |
| `useGeolocation` | Browser geolocation with permission handling |

### 7. Multi-Complex Station Handling

Some stations (like Times Sq-42 St) span multiple GTFS station complexes. The system handles this by:
- Merging stations with identical names when searching
- Returning `allIds` and `allPlatforms` for all platform IDs
- Fetching arrivals from all platforms in parallel
- Deduplicating results by trip ID

---

## Data Flow

### Real-time Train Data

```
MTA GTFS-RT Feed (Protobuf)
       │
       ▼
┌──────────────┐
│  lib/mta/    │  Parse protobuf
│  gtfs-rt.ts  │  Extract arrivals
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  API Route   │  /api/trains/realtime
│              │  Filter, sort, limit
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Client     │  Display arrivals
│  Component   │
└──────────────┘
```

### Station Search

```
Client Request
       │
       ▼
┌──────────────┐
│  API Route   │  /api/stations?search=...
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  lib/gtfs/   │  Parse stops.txt (cached)
│  parser.ts   │  Search stations
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Response   │  Station list
└──────────────┘
```

### Live Train Tracker

```
User Selects Lines (A, C, E)
       │
       ▼
┌──────────────────┐
│  LineSelector    │  Multi-select by trunk
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  LineDiagram     │  Fetches per-line data
└────────┬─────────┘
         │
   ┌─────┴─────┐
   ▼           ▼
┌────────┐  ┌────────────────┐
│ Static │  │  /api/trains/  │
│ line-  │  │  realtime      │
│stations│  │  ?routeId=A    │
│.json   │  └───────┬────────┘
└───┬────┘          │
    │               │
    ▼               ▼
┌───────────────────────────────┐
│       LineDiagram renders:     │
│  - Station sequence (static)   │
│  - Train markers (realtime)    │
│  - Direction indicators        │
│  - ETA badges                  │
└───────────────────────────────┘
         │
         ▼ (click train)
┌───────────────────────────────┐
│     TrainDetailPopover        │
│  - Destination                │
│  - ETA / Delay status         │
│  - Trip ID                    │
└───────────────────────────────┘
```

### Accessible Route Finding

```
User enters origin + destination
         │
         ▼
┌───────────────────┐
│   RouteFinder     │  Station selection UI
│   Component       │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  /api/routes/     │  API endpoint
│  accessible       │
└────────┬──────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌────────────────┐
│  GTFS  │  │  /api/         │
│ Static │  │  elevators     │
│  Data  │  │  (outages)     │
└───┬────┘  └───────┬────────┘
    │               │
    ▼               ▼
┌───────────────────────────────┐
│       lib/routing/graph.ts    │
│                               │
│  1. Build station graph       │
│  2. Mark inaccessible nodes   │
│     (elevator outages)        │
│  3. Run Dijkstra's algorithm  │
│  4. Calculate travel times    │
│     (static + express/local)  │
└───────────────────────────────┘
         │
         ▼
┌───────────────────────────────┐
│     RouteResults Component    │
│  - Route summary              │
│  - Segment details            │
│  - Accessibility status       │
│  - Alternative routes         │
└───────────────────────────────┘
```

**Graph Structure:**

| Element | Source |
|---------|--------|
| Nodes (Stations) | GTFS stops.txt + line-stations.json |
| Edges (Train segments) | line-stations.json (ordered stops per line) |
| Edge weights | Estimated travel time (2-3 min/stop, 1.5 min express) |
| Accessibility | Real-time elevator outages from /api/elevators |

**Algorithm:**
- Uses Dijkstra's shortest-path algorithm
- Edge weights are travel time in minutes
- Transfer penalty: 3-5 minutes per platform change
- Filters out inaccessible paths when `requireAccessible=true`

### Address-Based Trip Planning

```
User enters origin/destination addresses
         │
         ▼
┌───────────────────────────────────────┐
│  OpenStreetMap Nominatim API          │  Geocoding
│  (Convert addresses to coordinates)   │
└─────────────────┬─────────────────────┘
                  │
         lat/lon coordinates
                  │
                  ▼
┌───────────────────────────────────────┐
│  /api/routes/trip                     │  Our API endpoint
└─────────────────┬─────────────────────┘
                  │
                  ▼
┌───────────────────────────────────────┐
│  MTA OpenTripPlanner API              │  External API
│  (otp-mta-prod.camsys-apps.com)       │
│                                       │
│  - Full NYC transit network           │
│  - Real-time schedules                │
│  - Wheelchair-accessible routing      │
│  - Walking + transit combinations     │
└─────────────────┬─────────────────────┘
                  │
                  ▼
┌───────────────────────────────────────┐
│  Response: Multiple Itineraries       │
│                                       │
│  Each itinerary contains:             │
│  - Walking legs (with step-by-step)   │
│  - Transit legs (subway/bus/rail)     │
│  - Times, distances, stop counts      │
│  - Route colors and headsigns         │
└───────────────────────────────────────┘
```

**External Dependencies:**

| Service | Purpose | Rate Limits |
|---------|---------|-------------|
| Nominatim (OSM) | Address geocoding | 1 req/sec (free) |
| MTA OTP | Trip planning | Unknown (public API) |

**Transit Types Supported:**

| Mode | Display | Examples |
|------|---------|----------|
| SUBWAY | Bullet icon | A, 1, 7X |
| BUS | Colored chip | Q44, BxM1 |
| RAIL | Colored chip | Harlem, Hudson |
| WALK | Dotted line | Walking directions |

---

## Performance Considerations

### Caching Strategy

| Data Type | Cache Duration | Location |
|-----------|----------------|----------|
| Static GTFS | Permanent (in-memory) | Server |
| Train arrivals | 30 seconds | Next.js cache |
| Alerts | 60 seconds | Next.js cache |
| Elevator status | 5 minutes | Next.js cache |
| Routes/Stations | 1 hour+ | Next.js cache |

### Optimization Strategies

1. **Parallel Feed Fetching** - All subway feeds fetched concurrently
2. **In-Memory GTFS Cache** - Static data parsed once, cached in memory
3. **Incremental Compilation** - Turbopack for fast dev server
4. **Code Splitting** - Dynamic imports for heavy components

---

## Security

### Environment Variables

```env
DATABASE_URL=...        # Supabase connection (server only)
MTA_BUS_API_KEY=...     # Bus API key (server only)
```

### Best Practices

1. **Server-only secrets** - Never exposed to client
2. **Input validation** - Zod schemas for all external data
3. **Parameterized queries** - Prisma prevents SQL injection
4. **CORS** - Restricted API access

---

## Future Improvements

- [ ] WebSocket for real-time updates (eliminate polling)
- [ ] PWA with offline support
- [ ] User authentication (NextAuth)
- [ ] Push notifications for alerts
- [ ] Background sync for commute tracking
