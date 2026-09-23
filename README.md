# NYC Transit Hub

NYC Transit Hub is an installable web app for exploring New York City transit in one place. It combines rider workflows—nearby departures, station boards, trip planning, saved stations, and accessibility status—with route maps, individual vehicle views, service changes, and incident-derived analytics.

The project is intentionally explicit about data quality: subway map positions are estimates derived from operational progress and GTFS geometry, while bus markers use reported vehicle coordinates when the source provides them.

## What makes it technically interesting

- A normalized transit domain connects otherwise different subway, bus, LIRR, and Metro-North feeds.
- Individual subway trips preserve their GTFS-Realtime identity from prediction through map and line-diagram selection.
- Multi-complex subway stations fetch every relevant platform and deduplicate departures by trip ID.
- Route-scoped GTFS geometry improves subway projection without coupling static geometry loads to realtime polling.
- Nearby bus discovery starts from boardable static stops, then requests bounded SIRI predictions with partial-failure handling.
- Visibility-aware polling pauses realtime work in hidden or offline views and refreshes once when the app resumes.
- Serwist applies separate runtime policies to realtime, slow-changing, and static transit resources.

## Rider and exploration features

| Area | Capability |
|---|---|
| Home | Nearby and saved-station departures, commute context, route status, and relevant alerts |
| Nearby | Search, movable map origin, subway and bus predictions, direction context, and individual trip selection |
| Plan | Point-to-point trip planning with accessibility-aware options |
| Station Board | Multi-platform subway departures, saved stations, accessibility context, and deep links |
| Realtime | Route maps and diagrams for subway, bus, LIRR, and Metro-North; individual trip/vehicle selection |
| Service Changes | Active, upcoming, and recently resolved alerts with route and station context |
| Reliability | Incident-derived line comparison, trends, and time-of-day analysis |
| Crowding | Clearly labeled relative estimates based on service conditions—not passenger counts |
| Accessibility | Current and upcoming elevator/escalator outages and step-free planning entry points |

## Data and position accuracy

### Subway

Each selected train is an individual GTFS-Realtime `Trip`, not an anonymous route marker. The app combines its ordered stop predictions and operational progress with static station topology. When a compatible GTFS shape is available, progress is projected along that route geometry; otherwise it falls back to the adjacent station segment.

The resulting latitude/longitude is an **estimated geographic position**. Subway feeds do not provide consumer GPS coordinates, so the UI must not imply GPS precision.

### Bus

Bus Time supplies realtime vehicle coordinates where available. Those markers represent reported vehicle positions. Boarding predictions and stops-away copy come from SIRI StopMonitoring fields, not from a distance calculation against the marker.

See [System Architecture](./docs/architecture.md) for the complete data flow and domain distinctions.

## Architecture

```text
MTA static GTFS       MTA GTFS-Realtime       MTA Bus Time / JSON feeds
        \                     |                         /
         +---------------- source adapters ------------+
                               |
                    normalized transit domain
                               |
                   shared realtime services
                          /             \
                 rider workflows     maps + analytics
```

- `lib/mta/` validates and adapts upstream feed formats.
- `lib/gtfs/` owns static stations, stops, route topology, and geometry lookup.
- `types/transit.ts` defines shared `Departure`, `TransitTrip`, `TransitVehicle`, and `TransitStation` contracts.
- `app/api/` exposes thin Next.js route handlers.
- `components/` and `app/` compose rider and exploration surfaces.
- PostgreSQL on Supabase, accessed only through Prisma, supports accounts, saved commute data, ingestion, and historical analytics where configured.

## PWA and offline behavior

The app uses Serwist, a standalone manifest, maskable icons, and iOS metadata. Runtime caching is based on data semantics:

- Realtime arrivals, vehicles, alerts, and train progress are network-first with a short maximum age.
- Reliability, crowding, and status responses may use a slightly longer slow-changing cache.
- Station, route, and GTFS-derived geometry can use longer-lived static caching.

Offline mode can retain the application shell and cached static context. It explicitly reports **“Realtime unavailable offline”** rather than presenting an old countdown as current.

## Technology

- Next.js 16 App Router and React 19
- strict TypeScript, HeroUI 2, and Tailwind CSS 4
- Recharts 3 and Leaflet / React Leaflet
- Prisma 7 with PostgreSQL on Supabase
- Supabase Auth for personalized commute features
- Serwist 9 for PWA service-worker integration
- Zod at external-data boundaries
- Vitest, React Testing Library, Playwright, and Storybook

## Local development

The documented runtime is Node.js 24.12.0.

```bash
git clone https://github.com/abirh2/NYC-Transit-Hub.git
cd NYC-Transit-Hub
nvm install 24.12.0
nvm use 24
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Basic subway, alert, and elevator data does not require a database. Database-backed analytics, authentication, and bus features require the environment described in [Development Setup](./docs/setup.md).

Useful checks:

```bash
nvm use 24 && npm run lint
nvm use 24 && npm run test
nvm use 24 && npx tsc --noEmit
nvm use 24 && npm run build
nvm use 24 && npm run test:e2e
```

## Showcase material

The repository keeps capture instructions rather than committing large image binaries. The repeatable state list covers Home, Nearby direction selection, an individual subway train, the full Realtime map, a reported bus vehicle, and Reliability analytics. See [Demo Capture Guide](./docs/demo-capture.md).

## Limitations

- MTA feeds may be late, partial, empty, or internally inconsistent; the UI exposes stale and unavailable states but cannot repair missing source data.
- Subway geographic positions are inferred between reported stops and are not GPS.
- Crowding is a relative service-condition estimate, not measured occupancy or passenger count.
- Reliability scores are derived from recorded incidents; they are not official on-time-performance metrics.
- Historical analytics and personalized features depend on configured Supabase services and ingestion.
- Offline mode does not provide live predictions.

## Documentation

- [System Architecture](./docs/architecture.md)
- [API Contracts](./docs/api.md)
- [Development Setup](./docs/setup.md)
- [Testing](./docs/testing.md)
- [Component Patterns](./docs/components.md)
- [Demo Capture Guide](./docs/demo-capture.md)
- [Contributing](./docs/contributing.md)

Data is provided by the [Metropolitan Transportation Authority](https://new.mta.info/). This project is licensed under the [MIT License](./LICENSE).
