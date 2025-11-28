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
│   ├── dashboard/             # Dashboard card components
│   ├── layout/                # Layout components
│   ├── ui/                    # Reusable UI components
│   └── Providers.tsx          # Context providers
│
├── lib/                       # Utilities and helpers
│   ├── db.ts                  # Prisma client singleton
│   ├── generated/prisma/      # Generated Prisma client
│   ├── gtfs/                  # GTFS static data parser
│   │   ├── parser.ts          # CSV parsing and station lookup
│   │   └── index.ts
│   └── mta/                   # MTA feed clients
│       ├── config.ts          # Feed URLs and configuration
│       ├── gtfs-rt.ts         # Protobuf parser for subway
│       ├── alerts.ts          # Service alerts (JSON)
│       ├── elevators.ts       # Elevator status (JSON)
│       ├── buses.ts           # Bus feeds (protobuf)
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
│       └── routes.txt         # Route data (29 routes)
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
| `/api/alerts` | GET | Get active service alerts (live) |
| `/api/elevators` | GET | Get elevator/escalator outages (live) |
| `/api/trains/realtime` | GET | Get train arrivals (live GTFS-RT) |
| `/api/buses/realtime` | GET | Get bus arrivals (requires API key) |
| `/api/status` | GET | Get system health status |

### Ingestion APIs (Database)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ingest/subway` | POST | Ingest subway GTFS-RT data |
| `/api/ingest/alerts` | POST | Ingest service alerts |
| `/api/ingest/elevators` | POST | Ingest elevator status |
| `/api/ingest/buses` | POST | Ingest bus data |

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
