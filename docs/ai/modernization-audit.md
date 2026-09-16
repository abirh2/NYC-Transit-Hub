# NYC Transit Hub modernization audit

**Audit date:** 2026-09-16  
**Status:** Current-state reference for the planned UI/UX and architecture modernization  
**Scope:** Repository and live-application audit. No implementation changes were made as part of the audit.

## A. Executive summary

NYC Transit Hub is already a substantial transit application rather than a visual prototype. It integrates multiple MTA realtime and static feeds, preserves subway trip identities, handles station complexes, supports multiple rail modes, offers routing and personalized commutes, and has a credible PWA foundation.

The strongest foundation is the transit ingestion layer. The largest weaknesses are above and around it:

- The product is organized around features and data categories rather than rider tasks.
- The UI is coherent but resembles a card-heavy dark dashboard more than a focused transit product.
- Mobile navigation and the Realtime page need substantial restructuring.
- The frontend has competing representations of routes, stations, directions, trips, and arrivals.
- Many client components independently fetch and poll overlapping resources.
- Subway markers represent individual trips, but their positions are inferred from stop-time predictions, not reported train coordinates.
- The current “Nearby Buses” experience finds nearby vehicles, not nearby bus stops.
- Offline caching can display old realtime data without clearly identifying it as stale.
- The automated unit baseline is strong, but the production-build and end-to-end baselines are currently broken.

The recommended approach is incremental:

1. Stabilize the build and testing baseline.
2. Introduce tokens, primitives, and a rider-oriented shell without changing transit behavior.
3. Normalize transit concepts at feed boundaries.
4. Add a shared query and freshness layer.
5. Build `/nearby` around stops, directions, ordered departures, and individual trips.
6. Reuse the same normalized data in the advanced `/realtime` visualization.

The application does not need a rewrite.

An audit score based on the inspected implementation and live UI is approximately **12/20 — acceptable foundation, substantial modernization needed**:

| Dimension | Score | Main issue |
| --- | ---: | --- |
| Accessibility | 2/4 | Good intent, but hidden drawer content, clickable non-buttons, and labeling gaps |
| Performance | 2/4 | Duplicate polling, broad client hydration, and expensive all-feed requests |
| Responsive design | 2/4 | Most pages adapt, but Realtime visibly overflows on mobile |
| Theming | 3/4 | Strong MTA identity and dark theme; visualization colors are fragmented |
| Implementation integrity | 3/4 | Real domain depth, but abstractions drift and tests/build are not fully aligned |

## B. Current architecture map

```text
MTA realtime sources
├── Subway GTFS-Realtime: eight protobuf feeds
├── Bus Time SIRI VehicleMonitoring / StopMonitoring
├── LIRR GTFS-Realtime
├── Metro-North GTFS-Realtime
├── Alerts JSON
└── Elevator/escalator JSON
          │
          ▼
Feed-specific clients and parsers
├── lib/mta/gtfs-rt.ts
├── lib/mta/buses.ts
├── lib/mta/rail.ts
├── lib/mta/alerts.ts
└── lib/mta/elevators.ts
          │
          ├──────── Static GTFS and generated metadata
          │         ├── data/gtfs/
          │         └── lib/gtfs/
          │
          ▼
Next.js route handlers
├── /api/trains/realtime
├── /api/buses/realtime
├── /api/lirr/*
├── /api/mnr/*
├── /api/stations
├── /api/routes/*
├── /api/alerts
├── /api/incidents
├── /api/elevators/*
├── /api/status
├── /api/reliability
├── /api/metrics/crowding
└── /api/commute/*
          │
          ├──────── PostgreSQL / Supabase through Prisma
          │         ├── saved commutes
          │         ├── reliability history
          │         └── ingestion results
          │
          ▼
Client hooks and feature components
├── Dashboard cards
├── Station and rail boards
├── Realtime map and line diagram
├── Route Finder
├── Nearby stations / nearby bus vehicles
└── Analytics and incident views
          │
          ▼
Next.js App Router pages + Serwist PWA
```

### Verified stack

| Area | Current implementation |
| --- | --- |
| Framework | Next.js 16.3.5, App Router |
| React | React and React DOM 19.2.0 |
| TypeScript | Declared `^5`; installed 5.9.3, strict mode |
| Styling | Tailwind CSS 4.1.17, CSS variables, HeroUI theme integration |
| Component library | HeroUI 2.8.5 |
| Fonts | Geist Sans and Geist Mono through `next/font/google` |
| Mapping | Leaflet 1.9.4 and React Leaflet 5.0.0 |
| Charts | Recharts 3.5.1 |
| Animation | Tailwind/CSS transitions; Framer Motion is declared but has no direct source import |
| Authentication | Supabase Auth |
| Database | PostgreSQL/Supabase through Prisma 7 |
| PWA | Serwist 9.2.3, custom `app/sw.ts`, public manifest |
| Unit/component testing | Vitest, React Testing Library, jsdom |
| Browser testing | Playwright configuration for desktop and mobile browsers |
| Component documentation | Storybook 10 with accessibility support |
| Deployment | Vercel-oriented Next.js deployment |
| State management | Local React state/effects, one Auth context, localStorage preferences |
| Data fetching | Browser `fetch` in effects plus interval polling; no shared SWR/React Query cache |
| React Compiler | Enabled |
| Build | Webpack production build because of Serwist; Turbopack development |

The dependency and command definitions are in `package.json`.

A notable architectural trait is client-component breadth: the audit found 72 `"use client"` directives across 158 relevant source files. The client-side `AppShell` and provider boundary also cause much of the application shell to hydrate.

### API structure

The API layer covers:

- Subway realtime arrivals.
- Bus routes and realtime vehicles/stop monitoring.
- LIRR and Metro-North stations and realtime data.
- Alerts, incidents, elevators, and service status.
- Static route information, accessible routes, and trip planning.
- Commute settings and summaries.
- Reliability and estimated crowding.
- Historical ingestion for alerts, buses, elevators, reliability, and subway data.
- Authentication callback handling.

This is a good breadth of capability. The modernization should consolidate its contracts, not bypass these routes with new parallel systems.

## C. Page/component inventory

| Route | Current purpose and data | Strengths | Main weaknesses |
| --- | --- | --- | --- |
| `/` | Dashboard composed from station, alert, tracker, commute, incident, reliability, crowding, and status cards | Broad system overview; personalized station and commute support | Too many similarly weighted cards; several cards poll independently; next departure is not visually dominant |
| `/realtime` | Subway, bus, LIRR, and Metro-North visualization using diagram/map modes | Deepest and most portfolio-distinctive feature; trip IDs survive into markers | Nearly 1,000-line client page; inferred subway positions can appear more precise than they are; mobile controls overflow |
| `/board` | Subway, rail, and bus board tabs | Useful modal separation; station-complex support is handled in the subway board | “Nearby Buses” is vehicle-centric; nearby-station selection is not connected to the main board |
| `/routes` | Origin/destination planning through MTA OTP, with client-side Nominatim autocomplete | Accessible-route option and multi-modal trip output | Duplicated inside Accessibility; external geocoding occurs directly from the browser |
| `/reliability` | Historical service reliability summaries, charts, and detailed table | Meaningful portfolio analytics; clear period controls | Hard-coded chart styling and a bespoke presentation model |
| `/crowding` | Formula-based crowding estimates based on service conditions | Transparently useful as an estimate | Not actual vehicle occupancy; direction behavior remains incomplete |
| `/incidents` | Active/upcoming service events with filtering and timeline | Good active/upcoming distinction | Another bespoke filter/card system; overlaps alerts/status concepts |
| `/accessibility` | Elevator/escalator outages, upcoming work, filters, and accessible route planning | Important rider utility; combines present and upcoming conditions | Route Finder is duplicated rather than shared as a capability |
| `/commute` | Authenticated saved commutes with OTP summaries | Real persistence and personalization | Separate from the main rider flow; depends on several client-side states and polling |
| `/about` | Portfolio and implementation overview | Useful project framing | Claims Next.js 15 and implies actual vehicle positions are presented; both are stale or misleading |
| `/offline` | PWA offline fallback | Proper offline destination and user guidance | Cached realtime responses lack strong stale-data semantics |

### Current and recommended information architecture

Observed: the sidebar exposes nine primary destinations plus About. Rider tasks, data exploration, accessibility information, and analytics are presented at the same level.

Recommended conceptual grouping:

```text
Primary rider navigation
├── Home
├── Nearby
├── Realtime
└── Plan

Explore / More
├── Station Board
├── Reliability
├── Crowding
├── Incidents
├── Accessibility
├── Saved Commutes
└── About
```

On mobile, Home, Nearby, Realtime, and Plan are suitable bottom-navigation destinations. More can open a sheet containing secondary tools.

Accessibility should remain reachable as a destination, but elevator status and accessible-routing conditions should also surface contextually in Nearby, station detail, and Plan. Saved commutes can appear prominently on Home once configured rather than requiring permanent primary-navigation status.

## D. UI/design-system findings

### Observed system

- Geist supplies a clean base typeface, but page-title scale and icon/title composition vary.
- HeroUI tokens and components provide a coherent foundation.
- MTA colors and subway bullets give the application recognizable transit identity.
- Spacing generally follows Tailwind's `4`, `6`, and `8` rhythm.
- Surfaces mostly use rounded cards with dark fills and subtle borders.
- Cards are the dominant layout device, including cases where grouping, plain sections, or list hierarchy would be clearer.
- Tabs and segmented controls have several visual implementations.
- Route colors are repeated across type files, components, map marker HTML, and route-planning code.
- Leaflet uses dark Carto tiles even when the application is in light mode.
- Recharts tooltips and series colors are locally hard-coded.
- Loading, error, and empty states exist, but are reimplemented in many features.
- Motion is mostly hover transitions, pulse, and spin, with no evident shared reduced-motion strategy.

The deterministic UI scan produced only three narrow warnings:

- Thick left-border styling in `components/accessibility/OutageList.tsx`.
- Similar incident-timeline side borders in `components/incidents/IncidentTimeline.tsx`.
- An inline Helvetica declaration in `components/realtime/TransitMap.tsx`.

The low warning count does not mean the design system is complete; most problems are systemic consistency and information hierarchy rather than isolated style-rule violations.

### Live responsive findings

Desktop is coherent and readable. The fixed 256px sidebar works at larger widths, although the visual language is closer to a generic dark analytics product than the eventual rider-focused goal.

At a 390×844 viewport:

- Home becomes a long single-column card stream.
- The large “Your Station” area can dominate even when empty.
- Realtime has visible horizontal overflow.
- The legend and Sign In control clip at the right edge.
- Mode tabs clip before Metro-North.
- Controls wrap without a deliberate mobile hierarchy.
- Station Board adapts more successfully.

The closed mobile drawer remains exposed in the accessibility tree, including its navigation items and Close menu control. A transform visually hides it, but it is not sufficiently removed through `inert`, conditional rendering, or equivalent semantics.

Other accessibility risks include clickable `div` or table-row interactions and missing accessible-label warnings in line-performance tests. Many icon buttons are correctly labeled, so this is an incomplete pattern rather than total neglect.

### Recommended visual direction

Use Apple-like qualities for structure, not imitation:

- Clear title, subtitle, and action hierarchy.
- Larger areas of unboxed whitespace.
- Fewer nested surfaces.
- Restraint in dividers and elevation.
- Explicit live, stale, delayed, and unavailable states.
- Smooth but functional transitions.
- Strong keyboard focus and reduced-motion support.

Retain the MTA identity through route bullets, direction and service-status semantics, map geometry, departure rows, and high information density where riders need comparison. Do not replace the current identity with grayscale or generic blue.

The metadata setup can produce duplicated titles such as `Route Finder | NYC Transit Hub | NYC Transit Hub`; route metadata should provide only the page-specific title when the root layout applies a suffix.

## E. Transit data-flow diagram

```text
Subway GTFS-RT protobuf
  -> parseGtfsRt()
  -> extractArrivals()
  -> future stop-time updates
  -> /api/trains/realtime
  -> StationBoard / dashboard / Realtime
  -> deduplicate or group by tripId
  -> inferred train position

Bus Time SIRI
  -> VehicleMonitoring OR StopMonitoring
  -> normalized bus vehicle/arrival objects
  -> /api/buses/realtime
  -> route map / current Nearby Buses

LIRR and Metro-North GTFS-RT
  + static schedule/station metadata
  -> rail adapter
  -> /api/lirr/* and /api/mnr/*
  -> rail boards / Realtime

Alerts and elevator JSON
  -> Zod validation at boundary
  -> application camelCase structures
  -> alerts / incidents / accessibility / status

Static GTFS-derived data
  -> station complexes, platforms, coordinates, route stops, shapes
  -> station search / route metadata / diagrams / maps

Historical ingestion
  -> Prisma / PostgreSQL
  -> reliability and commute APIs
  -> analytics and personalized dashboard
```

### Subway details

The protobuf definition in `lib/mta/gtfs-rt.ts` includes both `TripUpdate` and `VehiclePosition`. The current extraction path iterates `entity.tripUpdate`; `entity.vehicle` is not used to create subway tracker marker data.

For each future stop-time update, the code creates an arrival containing `tripId`, `routeId`, stop/platform ID, direction, arrival/departure time, delay, assigned status, and minutes until arrival.

Trip IDs are preserved. They are not lost or aggregated away by the API. The Realtime page requests a large set of route arrivals and deduplicates them by `tripId`, retaining the earliest relevant upcoming stop for each trip. A subway marker therefore corresponds to an individual scheduled/realtime trip, not an anonymous route-level aggregate.

Realtime data includes trip identity, predicted stop times, delays/assignments, and upcoming-stop context. Geographic position, segment progress, movement between stations, and some destination presentation are inferred.

Direction derives from the NYCT trip descriptor: north/east maps to `N`, with other or missing values falling through toward `S`. That default can misclassify malformed or incomplete records.

Destination extraction attempts to derive a headsign from the trip ID, but internal terminal codes are often rejected. The UI consequently falls back to generic destination language.

`lib/utils/train-positioning.ts` walks backward through ordered stations using an assumed average speed and straight-line distance. `components/realtime/LineDiagram.tsx` uses station index plus ETA-derived segment progress, capped before the next station. This is a reasonable approximation, but not a true vehicle-position system, and should be labeled accordingly until vehicle entities are validated and integrated.

The subway endpoint currently fetches all eight feeds on each request, even when a route filter is supplied. A line-to-feed map exists but is not used to narrow the request.

### Station-complex behavior

The station parser correctly recognizes that station names are not identifiers. It merges complexes while retaining `allIds` and `allPlatforms`. `StationBoard` fetches relevant northbound and southbound platforms and deduplicates arrivals by `tripId`. This is an important invariant to preserve.

### Bus details

`lib/mta/buses.ts` uses SIRI `VehicleMonitoring` for route-level or general vehicle retrieval and SIRI `StopMonitoring` when a stop ID is supplied.

The application can represent vehicle ID, trip ID, route, destination, latitude/longitude, bearing, next stop ID/name, expected arrival, and distance/status fields. Static bus-stop, route-stop, and route-shape data already exists under `data/gtfs/` and `lib/gtfs/`.

The missing piece is orchestration around stops rather than missing raw data.

## F. Realtime tracker architecture

### Current behavior

- Modes: Subway, Bus, LIRR, and Metro-North.
- Views: Line diagram and Leaflet map where applicable.
- Selection: Local route, line, and direction state.
- Refresh: Approximately 30-second browser polling.
- Subway markers: One per deduplicated `tripId`.
- Bus markers: Actual Bus Time vehicle coordinates.
- Rail handling: Realtime rail trips merged with static station/schedule knowledge.
- URL state: Route, direction, selected trip, and view are not encoded.
- Selected state: Local to the page or visualization component.
- Reload/share: Loses the current selection.
- Diagram/map coordination: Selection is not managed by one shared controller.

A live A-line test rendered 40 trip markers: 21 northbound and 19 southbound, with several NOW states. The URL remained `/realtime`, confirming the absence of deep-link state.

### Geometry and branching

Bus routes use static route shapes. Subway and rail maps primarily connect station coordinates in listed order. This is insufficient for branches: a route's trunk and branch stations can be appended to one sequence, producing false direct connectors.

There is partial multi-track/layout work in `lib/gtfs/line-stations.ts`, but the active diagram does not yet use a complete topological route graph.

### Recommended shared visualization engine

Preserve and evolve these responsibilities:

- `TransitMap`: map host, layers, markers, and popups.
- `LineDiagram`: schematic route rendering.
- `train-positioning.ts`: position strategy, later replaceable by actual vehicle data.
- `line-stations.ts`: route/station ordering, eventually topology.
- Existing route badges and transit-mode metadata.
- A new visualization controller for selected route, direction, trip, map/diagram viewport, URL state, and freshness.

```text
TransitSnapshot
├── route topology
├── stops/stations
├── trips
├── vehicles
├── predictions
└── freshness/source metadata
        │
        ▼
Visualization controller
├── selected route/direction/trip
├── map vs diagram
├── URL serialization
└── interaction events
        │
        ├── Advanced Realtime page
        └── Compact Nearby trip detail
```

## G. Nearby/geolocation architecture

`lib/hooks/useGeolocation.ts` provides Permissions API inspection, one-shot `getCurrentPosition`, a ten-second timeout, one-minute cached positions, clear failure states, and automatic acquisition only when permission is already granted. This is a sensible, battery-conscious foundation and does not continuously watch location.

`NearbyStations` calls the station API with latitude and longitude. On the Board page, however, its station-selection callback is effectively a no-op, so choosing a nearby station does not drive the principal Station Board.

The most important finding is in `BusStopBoard`:

> The current Nearby Buses feature finds nearby bus vehicles, not nearby bus stops.

It fetches up to 200 active buses, calculates user-to-vehicle Haversine distance in the browser, and filters vehicles within roughly half a mile. A field named `distanceFromStop` is repurposed to hold distance from the user, further blurring the model.

| Target step | Current readiness |
| --- | --- |
| Acquire location | Implemented |
| Handle permissions/errors | Implemented |
| Discover nearby subway stations | Implemented |
| Discover nearby bus stops | Static data exists; experience not implemented |
| Resolve direction/platform | Partial for subway; not organized as a Nearby interaction |
| Fetch ordered departures | Subway boards and bus StopMonitoring can support it |
| Select individual trip/vehicle | Trip/vehicle identifiers are available |
| Show selected trip in visualization | Not connected |
| Deep-link between Nearby and Realtime | Not implemented |

Recommended flow:

```text
Shared location snapshot
  -> nearby station complexes + bus stops
  -> distance-ranked transit places
  -> direction/platform groups
  -> ordered departure predictions
  -> selected trip or vehicle
  -> compact trip detail
  -> Open in Realtime deep link
```

Use a shared location provider or query so Nearby Stations and Nearby Buses do not separately request and manage location.

## H. Domain-model problems

The primary shared type areas are `types/mta.ts`, `types/gtfs.ts`, and `types/api.ts`, plus feature-local interfaces.

Observed problems:

- `Station` can mean a static GTFS station, merged station complex, search result, board station, or rail station.
- Stop may refer to a GTFS stop, directional subway platform, bus stop, or trip stop-time.
- Routes have separate subway, bus, rail, planner, and visualization forms.
- Directions mix `N`/`S`, cardinal language, Uptown/Downtown labels, numeric indicators, and API-specific values.
- Arrival and departure objects overlap substantially.
- A subway vehicle marker is actually a trip plus inferred position.
- A bus vehicle contains genuine coordinates.
- API-specific objects leak far enough upward that components repeat display conversion.
- Route-color maps and display names are repeated.
- Freshness and source provenance are not consistently part of the data contract.
- `distanceFromStop` can mean distance from the user.
- Alert, incident, and service-status concepts overlap without one normalized relationship.

This is not a recommendation for one giant universal type. Normalize shared semantics while retaining feed-specific boundary schemas.

## I. PWA/performance findings

### PWA behavior

`app/sw.ts` uses precaching, `skipWaiting`, `clientsClaim`, navigation preload, an `/offline` fallback, `NetworkFirst` for application API traffic, separate `NetworkFirst` handling for MTA domains, and Serwist's default caching elsewhere.

`public/manifest.json` supports standalone installation, portrait-primary orientation, standard icons, and a maskable icon.

The main operational risk is stale realtime data. `/api/*` responses can remain cached for up to approximately five minutes, while direct MTA-domain caching has separate two-minute behavior. When the network fails, old predictions may be returned without a clear `asOf`, `source`, or `stale` signal in every consumer.

Realtime information may be cached for resilience only if the response and UI expose acquisition time and stale status.

### Performance risks

- Broad hydration caused by many client components.
- Dashboard cards independently polling related endpoints.
- Realtime subway requests fetching all feeds despite route selection.
- No shared browser request cache or deduplication layer.
- Polling generally continues without visibility-aware or offline-aware pausing.
- Mobile battery cost from timers and repeated parsing/fetching rather than geolocation itself.
- Route Finder calls Nominatim directly from the browser and duplicates this behavior across entry points.
- Leaflet is dynamically loaded, which is good.
- Recharts is limited mainly to analytics pages, also good.
- Large marker counts and inline-generated marker HTML will become more expensive as visualization detail grows.
- Light mode and map tile styling are not coordinated.
- The `portrait-primary` manifest orientation may unnecessarily restrict tablet/desktop installed-app use.

A shared polling/query layer should deduplicate requests, pause when hidden or offline, implement refresh jitter/backoff, and distribute one normalized snapshot to multiple consumers.

## J. Testing baseline

The documented Node version, 20.19.5, was used for Node-based checks.

| Check | Result |
| --- | --- |
| `npm ls --depth=0` | Passed; dependencies are present |
| `npm run lint` | Exit 0, but 471 warnings |
| `npx tsc --noEmit` | Passed |
| `npm run test` | Passed: 34 files, 368 tests |
| `npm run build` | Failed |
| `npm run test:e2e` | Failed before tests started |
| Manual live-app inspection | Completed on desktop and 390×844 mobile viewport |

The audit inspected the installation rather than running `npm install`, because installing could alter the lockfile or dependency tree during a read-only audit.

### Lint

Most warnings come from bundled agent/skill JavaScript under dot-directories such as `.agent`, `.agents`, `.cursor`, `.claude`, and `.kiro`, rather than application source. The lint scope should exclude tooling artifacts so the signal remains useful.

### Unit/component tests

All 368 tests pass. Warnings still surfaced:

- React `act(...)` warnings in geolocation, CommuteCard, and LiveTrackerCard tests.
- HeroUI accessibility-label warnings in LinePerformanceCard tests.

Passing tests therefore do not mean the suite is warning-free.

### Production build

The build encountered two categories of failure:

1. Sandbox DNS could not retrieve Google-font resources.
2. The installed Prisma packages are skewed: Prisma CLI is 7.10 while `@prisma/client` and its adapter are 7.0.1. The generated client references a `query_compiler_fast_bg.postgresql` runtime artifact not supplied by the installed client package.

The build also reports the Next.js middleware deprecation warning. Because no code or dependency files were changed during the audit, these failures appear to be part of the current checkout/environment baseline.

### End-to-end tests

Playwright cannot begin because the configuration imports `@playwright/test`, but the package is not installed. The repository declares `playwright`, which does not satisfy that import.

The Playwright configuration anticipates Chrome, Firefox, WebKit, Mobile Chrome, and Mobile Safari, but the current E2E suite is too narrow and presently non-runnable.

### High-risk testing gaps

- Realtime route/direction/trip selection.
- Subway trip preservation across parsing, API, and visualization.
- Branch topology.
- Nearby station-to-board flow.
- Nearby bus-stop and StopMonitoring flow.
- Service-worker stale-data presentation.
- Authenticated commute ownership.
- Mobile Realtime overflow and navigation.
- API boundary fixtures for current MTA payloads.
- URL/deep-link state.
- Cross-mode visualization behavior.

## K. Technical debt / risk list

| Priority | Risk |
| --- | --- |
| P0 before redesign | Production build is not reproducible with the installed Prisma package set |
| P0 before redesign | Browser tests cannot run because the expected Playwright test package is missing |
| P1 | Subway markers look like live vehicle positions but are ETA-based interpolation |
| P1 | Service-worker fallbacks can present stale realtime predictions without sufficiently prominent provenance |
| P1 | Realtime mobile layout visibly overflows and clips core controls |
| P1 | Nearby bus behavior is vehicle-based, not stop/departure-based |
| P1 | Flat direction fallback can label incomplete subway records southbound |
| P1 | Route branches are modeled as ordered lists rather than topology |
| P1 | Feed/API/domain/display models are insufficiently separated |
| P1 | Closed mobile drawer content remains accessibility-visible |
| P2 | Repeated client polling creates redundant network and battery cost |
| P2 | All subway feeds are fetched for route-specific requests |
| P2 | Large client-component surface limits server-rendering benefits |
| P2 | No URL representation of Realtime state |
| P2 | Route colors, labels, controls, data states, and card headers are duplicated |
| P2 | Nearby-station selection is not connected to Station Board |
| P2 | Route Finder exists in multiple locations without one shared feature boundary |
| P2 | About documentation is stale and overstates vehicle-position behavior |
| P3 | Framer Motion appears to be an unused direct dependency |
| P3 | Storybook has only three story files despite a growing reusable UI |
| P3 | Manifest orientation and theme-specific map behavior need refinement |

## L. Recommended shared components/primitives

### Shell and navigation

- `NavigationItem` and one shared navigation model.
- `DesktopSidebar`.
- `MobileBottomNavigation`.
- `MoreSheet`.
- `PageHeader`, `PageActions`, and `SectionHeader`.

### Surfaces and state

- `Surface` with plain, raised, inset, and interactive variants.
- `MetricCard`.
- `DataState` for loading, empty, error, offline, and unavailable.
- `LiveStatus`, `LastUpdated`, `StaleDataBanner`, and `RefreshControl`.

### Transit UI

- One `RouteBadge` API with subway, bus, LIRR, and Metro-North variants.
- `TransitModeTabs`.
- `DirectionTabs` or `DirectionPager`.
- `DepartureRow` and `DepartureGroup`.
- `StationPicker` and `StopPicker`.
- `ServiceStatusBadge` and `AccessibilityStatus`.
- `FilterBar` and `TransitLegend`.

### Visualization

- `MapFrame`, `MapToolbar`, and `MapLegend`.
- `TransitMarker` and `TripPopover`.
- `RouteGeometryLayer`, `StationLayer`, and `VehicleLayer`.
- `LineSchematic`.
- Shared chart tokens and tooltip components.

These components should encode semantic roles such as live, delayed, stale, and outage rather than merely standardizing colors.

## M. Recommended normalized transit-domain concepts

| Concept | Recommended responsibility |
| --- | --- |
| `TransitMode` | Subway, bus, LIRR, Metro-North |
| `RouteId` / `Route` | Stable ID, mode, names, color, text color, agency |
| `TransitPlace` | Shared searchable place contract |
| `StationComplex` | Parent station, aliases, coordinates, routes, `allIds`, `allPlatforms` |
| `Stop` | Physical or directional boarding point with parent relationship |
| `Direction` | Canonical value plus mode/route-specific rider label |
| `StopTimePrediction` | Stop, predicted time, scheduled time, delay, assignment, source |
| `Departure` | Rider-facing ordered prediction derived from a stop-time prediction |
| `Trip` | Stable trip ID, route, direction, destination, stop sequence |
| `Vehicle` | Actual vehicle identity/location only; do not use for inferred subway markers |
| `TripProgress` | Known/inferred progress with confidence and method |
| `RouteTopology` | Nodes, edges, branches, shapes, stop ordering |
| `ServiceAlert` | Validated source alert with active/upcoming calculation |
| `ServiceStatus` | Derived route/system condition |
| `AccessibilityCondition` | Elevator/escalator state tied to station/stop |
| `FeedFreshness` | Source timestamp, fetched timestamp, age, stale flag, error state |
| `TransitSnapshot` | Coherent routes/stops/trips/vehicles/predictions at one point in time |

Feed-native schemas should remain in `lib/mta` or other boundary modules. They should map once into these concepts before components consume the data.

## N. File-by-file recommendations for the next two phases

### Phase 1: design system and application shell

| File/area | Recommendation |
| --- | --- |
| `app/globals.css` | Define semantic color, spacing, radius, elevation, focus, live/stale/status, and motion tokens |
| `hero.ts` | Align HeroUI theme tokens with the semantic token layer |
| `components/layout/` | Extract one navigation configuration; implement desktop sidebar, mobile bottom navigation, and accessible More sheet |
| `components/layout/Sidebar.tsx` | Ensure closed mobile content is inert or unmounted; separate navigation data from rendering |
| `components/ui/` | Add PageHeader, Surface, DataState, LiveStatus, LastUpdated, DirectionTabs, DepartureRow, and FilterBar |
| Existing route badges | Consolidate SubwayBullet, BusBadge, and RailBadge behind one typed RouteBadge interface |
| `app/page.tsx` | Reorder around immediate rider value: next departure, saved commute, nearby access, disruptions |
| `app/realtime/page.tsx` | Split layout, controls, data coordination, and visualization; fix mobile overflow without changing transport logic |
| `app/board/page.tsx` | Adopt shared mode/direction/departure primitives |
| Route Finder components | Share one planner feature between `/routes` and Accessibility |
| Analytics pages | Apply shared page headers, controls, chart tokens, and data states |
| `components/realtime/TransitMap.tsx` | Move marker HTML/color/style generation into typed visualization primitives |
| Storybook | Add stories for every new primitive, including loading/error/stale and mobile states |
| Playwright | Add shell/navigation/mobile visual tests once the runner baseline is fixed |

This phase should change presentation and composition, not feed semantics.

### Phase 2: shared transit domain and realtime data layer

| File/area | Recommendation |
| --- | --- |
| `types/mta.ts` | Retain source-specific or boundary types; stop using it as a catch-all display domain |
| `types/gtfs.ts` | Clarify static GTFS entities versus normalized station/stop/topology models |
| `types/api.ts` | Standardize API envelopes, freshness, source, partial-feed errors, and pagination/limits |
| New `lib/transit/domain/` | Introduce branded IDs and normalized Route, Stop, StationComplex, Trip, Vehicle, Prediction, and Snapshot concepts |
| `lib/mta/gtfs-rt.ts` | Separate decode, validation, TripUpdate extraction, VehiclePosition extraction, and domain mapping |
| Subway API route | Use route-to-feed selection where safe; return freshness and partial-feed status |
| `lib/mta/buses.ts` | Separate vehicle snapshots from stop predictions; preserve source-native validation at the boundary |
| `lib/mta/rail.ts` | Map rail data to shared Trip/Prediction concepts while retaining rail-specific details |
| `lib/gtfs/` | Build explicit stop-parent and route-topology indexes |
| New shared query layer | Deduplicate fetching, coordinate polling, pause when hidden/offline, and expose freshness |
| New Nearby service/API | Rank station complexes and bus stops, then request departures by stop and direction |
| `components/board/BusStopBoard.tsx` | Replace nearby-vehicle discovery with nearby-stop discovery and StopMonitoring |
| `components/board/NearbyStations.tsx` | Make selection drive a shared place/departure view |
| `lib/utils/train-positioning.ts` | Return an explicit inferred-position result with method/confidence; prefer actual vehicle data when validated |
| `lib/gtfs/line-stations.ts` | Evolve ordered lists into branch-aware topology |
| Realtime state | Introduce one route/direction/trip/view controller and serialize it to the URL |
| `app/sw.ts` | Make caching policy consistent with freshness-aware API contracts |
| `prisma/schema.prisma` | Change only when persistent normalized snapshots are actually needed; avoid prematurely storing visualization state |

## O. DO NOT BREAK DURING THE REDESIGN

- Station complexes must retain every relevant `allId` and `allPlatform`; names are not unique IDs.
- Station arrivals must query all relevant platforms and deduplicate by `tripId`.
- Subway trip IDs must survive parsing, API serialization, UI grouping, and visualization.
- Future-starting alerts must remain upcoming, not active.
- Alerts without starts or ends must retain the current open-boundary semantics.
- Bracketed train references such as `[E]` and `[SIR]` must continue rendering as route bullets.
- One failed MTA feed must not erase healthy data from other feeds.
- Live-data fallbacks must continue working, but must become visibly stale when appropriate.
- SIR and other feed-specific route behavior must remain supported.
- Rail realtime data must continue merging correctly with static station/schedule metadata.
- Bus vehicle IDs, trip IDs, coordinates, bearings, next-stop details, and API-key handling must remain intact.
- Saved commutes must remain scoped to the authenticated user.
- Local station favorites must survive the shell redesign and migration.
- The offline page and installable-PWA behavior must remain operational.
- Directional stop suffixes and platform semantics must not be flattened into station names.
- API date/time serialization must remain consistent.
- Accessible routing must continue respecting elevator/outage conditions.
- Refresh intervals and caching changes must not silently make rider information less current.
- Do not call inferred subway positions GPS or actual vehicle locations.
- Do not replace MTA route colors with a generic neutral palette.
- Do not collapse Nearby and Realtime into one overloaded interface: they should share data, not interaction complexity.

## P. Proposed dependency order

1. **Repair the safety baseline.** Align Prisma packages, restore the production build, install/configure the correct Playwright runner, and remove tooling artifacts from lint scope.
2. **Freeze critical behavior in tests.** Add fixtures and focused tests for station complexes, trip IDs, alert timing, direction mapping, partial-feed failure, and inferred positioning.
3. **Define semantic design tokens.** Establish typography, spacing, surfaces, route colors, status colors, freshness, elevation, focus, and motion.
4. **Build shared UI primitives.** RouteBadge, PageHeader, Surface, DataState, LiveStatus, DirectionTabs, DepartureRow, and visualization chrome.
5. **Modernize the shell and IA.** Desktop sidebar, mobile bottom navigation, More sheet, responsive page structure, and accessible drawer behavior.
6. **Adopt the design system page by page.** Start with Home and Board, then Plan, Realtime, and analytics. Avoid a big-bang visual rewrite.
7. **Introduce normalized transit-domain contracts.** Preserve source schemas at the boundary and map into shared concepts.
8. **Add the shared query/freshness layer.** Deduplicate polling and make stale/offline/source state explicit.
9. **Build stop-oriented Nearby.** Nearby places to direction/platform to ordered departures.
10. **Connect individual departures to trips.** Make a selected trip the shared identity between Nearby and Realtime.
11. **Improve subway snapshots.** Extract and validate VehiclePosition entities where available; clearly distinguish actual and inferred position.
12. **Introduce branch-aware route topology.** Replace simple coordinate chains with nodes, edges, branches, and proper shapes.
13. **Create the shared visualization controller.** Coordinate selection, diagrams, maps, URL state, and compact/advanced presentations.
14. **Harden PWA and performance behavior.** Visibility-aware polling, offline semantics, stale warnings, feed narrowing, and bundle review.
15. **Run cross-mode launch verification.** Mobile browsers, installed PWA, accessibility, live-feed degradation, authenticated commute flows, and Vercel production build.

The central architectural decision should be: **Nearby and Realtime share normalized trips, predictions, topology, and freshness, but remain separate product experiences optimized for different rider intentions.**
