# Plan for NYC Transit Hub

---

## 1. Purpose

**Working name:** NYC Transit Hub

**Goal:**
Build a personal, non-commercial web app that:

* Uses **MTA realtime feeds** to give *practical* transit info (ETAs, delays, accessibility).
* Provides **analytics + visualizations** (reliability, incidents, crowding).
* Acts as a **portfolio piece** showing:

  * Full-stack skills (data ingestion → DB → APIs → UI).
  * Working with real-time streams & background jobs.
  * Clean, modern UX.

**High-level features:**

* Real-time subway/LIRR/MNR board & tracker
* Accessibility-aware routing (elevator/escalator status)
* Personalized commute assistant
* Reliability & disruption analytics
* Crowding/density estimation
* Incident explorer

---

## 2. Tech Stack

### Frontend

* **Framework:** Next.js (App Router, TypeScript)
* **UI library:** HeroUI
* **Styling:** Tailwind CSS
* **Maps (choose one):**
  * Simple: an SVG-based custom map + positioned overlays
  * Or: React Leaflet / Mapbox GL JS later if you want real geography
* **Charts/visualizations:**
  * Recharts *or* Chart.js (pick one and stick with it)

### Backend (inside Next.js)

* **Runtime:** Node via Next.js API routes / Route Handlers
* **DB:**
  * Postgres (Supabase)
* **ORM:** Prisma or Drizzle
* **Background jobs / scheduling:**
  * Cron via hosting provider (Vercel Cron, GitHub Actions, or a tiny worker) that hits a `/api/ingest/*` endpoint

### State & data fetching

* **Server-side:**
  * Next.js server components for initial load
* **Client-side querying:**
  * TanStack Query *or* a light custom hook setup using `fetch` for polling

### Auth (for commute personalization later)

* **Auth:** NextAuth.js or Clerk 

---

## 3. Libraries to Include

You can refine, but here’s a solid starting set:

* **UI / layout**

  * `@heroui/react`
  * `tailwindcss` + `postcss` + `autoprefixer`
* **Icons**

  * HeroUI’s built-ins
  * MTA line icons from `mta-subway-bullets`-style set (https://github.com/louh/mta-subway-bullets)
    * Install using `npm install mta-subway-bullets`
* **Charts**

  * `recharts`
* **Maps (optional at first)**

  * `react-simple-maps` or `react-leaflet`
* **Data / utilities**

  * `zod` (schema validation for MTA feeds)
  * `date-fns` or `dayjs` (time handling)
* **Backend**

  * `@prisma/client` + `prisma` (or `drizzle-orm`)
  * `node-cron` (if you end up doing scheduling yourself on a non-Vercel host)
* **GTFS / protobuf**

  * `protobufjs` to parse GTFS-RT if needed
  * Or hit MTA’s JSON proxy if you build one

---

## 4. APIs & Data Sources

**Core: MTA Realtime GTFS**

We will use:
* Subway GTFS-Realtime feed (trip updates & vehicle positions)
    * For A, C, E, and S_R trains: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace
    * For B, D, F, M, and S_F trains: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm
    * For G train: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g
    * For J and Z train: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz
    * For N, Q, R, and W trains: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw
    * For L train: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l
    * For 1, 2, 3, 4, 5, 6, 7, and S trains: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs
    * For SIR train: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si
* Busses GTFS-Realtime feed:
    * TripUpdates, VehiclePositions, and Alerts are available at the following URLs
        * Trip updates: https://gtfsrt.prod.obanyc.com/tripUpdates?key=<YOUR_KEY>
        * Vehicle position: https://gtfsrt.prod.obanyc.com/vehiclePositions?key=<YOUR_KEY>
        * Alerts: https://gtfsrt.prod.obanyc.com/alerts?key=<YOUR_KEY>
* LIRR & Metro-North GTFS-Realtime feeds
    * For LIRR: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr
    * For Metro North: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr
* Service alerts feed
    * GTFS Feeds:
        * All service feeds: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fall-alerts
        * Subway alerts: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts
        * Bus Alerts: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fbus-alerts
        * LIRR alerts: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Flirr-alerts
        * Metro North alerts: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fmnr-alerts
    * JSON Feeds:
        * All service feeds: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fall-alerts.json
        * Subway alerts: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts.json
        * Bus Alerts: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fbus-alerts.json
        * LIRR alerts: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Flirr-alerts.json
        * Metro North alerts: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fmnr-alerts.json
* Elevator/escalator status feed
    * XML Feeds:
        * Current outages: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene.xml
        * Upcoming outages: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene_upcoming.xml
        * Equipments: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene_equipments.xml
    * JSON Feeds:
        * Current outages: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene.json
        * Upcoming outages: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene_upcoming.json
        * Equipments: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene_equipments.json
* Static GTFS (stops, routes, shapes) for:
  * Station metadata
  * Line-to-station relationships
  * Optional: coordinates for map overlays

**Optional helpers:**

* Geocoding API (e.g. Mapbox, Geoapify) for:

  * “Home/work address → nearest station”
* Your own static JSON:

  * Station lookup tables
  * Friendly names, borough grouping, etc.

---

## 5. Phase Plan (With Pages)

### Phase 0 – Project Setup & Skeleton

**Goals:**

* Create the Next.js app with TypeScript.
* Integrate HeroUI + Tailwind.
* Set up basic layout and navigation.

**Tasks:**

* `npx create-next-app@latest` with TypeScript.
* Configure Tailwind.
* Install HeroUI and create:

  * A simple top nav
  * Left sidebar with links:

    * Realtime
    * Station Board
    * Reliability
    * Accessibility
    * Commute
    * Crowding
    * Incidents
* Create empty pages:

  * `/`
  * `/realtime`
  * `/board`
  * `/reliability`
  * `/accessibility`
  * `/commute`
  * `/crowding`
  * `/incidents`

---

### Phase 1 – Data Ingestion & Core API Layer

**Goal:**
Build the internal pipeline so *all* pages can consume a consistent API.

**Backend tasks:**

1. **Set up DB + ORM**

   * Define initial tables:

     * `stations` (id, name, lines, coordinates, accessibility metadata)
     * `realtime_trips` (trip_id, route_id, current_stop, arrival_time, direction, updated_at)
     * `alerts` (id, affected_routes, summary, severity, starts_at, ends_at, raw_json)
     * `elevator_status` (station_id, device_id, status, updated_at)
2. **Ingestion endpoints**

   * `/api/ingest/subway`
   * `/api/ingest/alerts`
   * `/api/ingest/elevators`
     Each:
   * Fetches GTFS-RT
   * Parses & normalizes
   * Upserts into DB
3. **Public read APIs**

   * `/api/trains/realtime?route=A&station_id=...`
   * `/api/stations`
   * `/api/alerts?route=...`
   * `/api/elevators?station_id=...`

**Infra:**

* Add a cron job (daily/minutely as needed) to hit the ingest endpoints.

**Frontend tasks:**

* Build a simple **home dashboard** that fetches from `/api/alerts` and `/api/trains/realtime` and shows:

  * “Major issues right now”
  * Next trains for your favorite station (hardcode one for now)

---
### Phase 1.5 Landing Page/Global Dashboard

#### 🏠 Landing Page = Global Dashboard

##### What it shows (modules/cards)

Each card =

1. summarizes a feature, and
2. links to the full page.

**1. “Your Station” Card (Next Trains – Board Preview)**

* Title: `Next trains at [Your Station]`
* Shows for each direction:

  * Line icon + destination (e.g. `F → Coney Island`)
  * ETA (e.g. `3 min`, `8 min`, `14 min`)
* Small footer: “View full station board →” → links to `/board`.

**Data:** `/api/trains/realtime?station_id=...`

---

**2. Service Alerts Summary Card**

* Title: `Current Service Alerts`
* Show:

  * Number of active major alerts (e.g. “4 major disruptions”)
  * Badges for affected lines: A, C, E, 4, 5…
* Short list of 2–3 worst alerts, truncated.

Tap/click → `/incidents` or `/reliability` (depends how you frame it).

**Data:** `/api/alerts?severity=major&limit=3`

---

**3. Reliability Snapshot Card**

* Title: `Line Reliability (Today)`
* Simple mini chart or list:

  * A: 72% on-time
  * F: 61% on-time
  * 7: 89% on-time
* Optionally color-coded (green/yellow/red).

Click → `/reliability` to see full dashboard.

**Data:** `/api/metrics/reliability?period=today&limit=5`

---

**4. Accessibility Status Card**

* Title: `Accessibility Near You`
* Shows:

  * `X elevators out of service` within some radius / for your favorite stations.
  * `Top 2–3 impacted stations` with warning icons.

Click → `/accessibility`.

**Data:** `/api/elevators?near_station=...` or `/api/elevators?status=out`

---

**5. Commute Assistant Card** (if user configured it)

* Title: `Your Commute`
* Shows:

  * “If you leave now: ~34 min via F → A”
  * “Suggested departure: in 6 min to arrive by 9:00 AM”
* Small indication if conditions are worse/better than usual.

Click → `/commute`.

**Data:** `/api/commute/summary`

---

**6. Crowding Snapshot Card**

* Title: `Crowding Right Now`
* Minimal:

  * “Most crowded: F, 4, L”
  * “Least crowded: R, G”
* Maybe a simple bar-meter.

Click → `/crowding`.

**Data:** `/api/metrics/crowding?top=5`

---

#### 🔗 UX Flow

* User opens **`/`** → instantly sees “what’s going on *right now*” in one glance.
* Every card has:

  * Clickable header or “View details →” footer.
  * That routes to the full-feature pages you already planned:
    `/board`, `/realtime`, `/reliability`, `/accessibility`, `/commute`, `/crowding`, `/incidents`.

This is exactly how mature products work (e.g. analytics tools, dev dashboards) and feels much more cohesive than a text marketing landing.

---

#### 🧱 Implementation Sketch (Next.js + HeroUI)

On `/` (server component):

* Fetch all the “summary” endpoints in parallel:
  * `getStationBoardSummary()`
  * `getAlertsSummary()`
  * `getReliabilitySummary()`
  * `getAccessibilitySummary()`
  * `getCommuteSummary()`
  * `getCrowdingSummary()`
* Render a responsive grid of HeroUI `Card` components.
* Wrap each card in `<Link href="/...">`.

You can even have a **“first-time setup” mode**:

* If user hasn’t picked a station yet:

  * The “Your Station” card shows a setup state:
    “Choose your home station to see next trains here.”


---

### Phase 2 – Real-time Tracker & Station Board

#### Page: `/board` – Personal Station Board

**Purpose:**
Fast, practical view of upcoming trains for 1–3 favorite stations.

**Data needed:**

* `/api/trains/realtime?station_id=...`
* `/api/alerts?station_id=...`

**UI:**

* HeroUI `Card`s for each station:

  * Station name + line bullets
  * Table of upcoming departures (route, destination, ETA, status)
* Simple settings section (for now: hardcode station list in code, later load from DB/user profile).

**Stretch:**

* Add refresh toggle (auto-refresh every X seconds).
* Add line filtering.

---

#### Page: `/realtime` – Live Line/Map View

**Purpose:**
Visual “Where’s my train?” style view by line.

**Data:**

* `/api/trains/realtime?route=A` etc.
* Station + line metadata.

**UI:**

* Line selector (multi-select for A/C/E etc.).
* Either:

  * **Simple:** vertical line diagram: stations with dots, trains as moving markers between.
  * **Later:** overlay trains on a subway SVG map.
* Clicking a train shows:

  * Destination
  * Next stops
  * Delays

**Stretch:**

* WebSocket or long-polling for smoother updates.
* Animations when train positions update.

**Future Enhancement – Multi-Line View:**

* Currently: Single-line view with transfer info shown at stations
* Planned: Multi-line view with branching/merging track visualization
  * Each selected line gets its own vertical column
  * Lines converge at shared stations (junctions)
  * Visual should resemble a tree/graph structure (like official MTA maps)
  * Adaptive coloring: same-color lines = single track; different colors = multi-track
* This requires more complex station graph algorithms to determine trunk/branch segments

---

### Phase 3 – Reliability & Incidents

#### Page: `/reliability` – Line Performance Dashboard

**Purpose:**
Quantify “how bad is the MTA actually” with data.

**Data / backend:**

* Extend ingestion to **store historical** trip & alert snapshots:

  * `trip_history` table / aggregated metrics table.
* Precompute daily stats per line:

  * On-time rate
  * Avg delay
  * Number of incidents

**API:**

* `/api/metrics/reliability?period=7d`
* `/api/metrics/reliability/:route_id`

**UI:**

* Summary cards per line: On-time %, avg delay, grade (A–F)
* Recharts:

  * Line chart: reliability over last 7/30 days
  * Bar chart: comparison of lines

---

#### Page: `/incidents` – Incident Explorer

**Purpose:**
Timeline + breakdown of disruptions.

**Data:**

* `alerts` table with type, routes, timestamps.

**API:**

* `/api/incidents?route=...&from=...&to=...`

**UI:**

* Filter controls:

  * Route, date range, incident type.
* Timeline/list of incidents:

  * Time, affected services, short description.
* Stats at top:

  * Most affected lines
  * Most common incident types

**Stretch:**

* Generate short human-readable summaries (“This week, the F line had 5 major incidents”).

---

### Phase 4 – Accessibility & Commute Assistant

#### Page: `/accessibility` – Elevator-Aware Routing

**Purpose:**
Show paths that avoid broken elevators/escalators.

**Data:**

* `stations` (with accessibility metadata)
* `elevator_status`
* Line topology (routes between stations from static GTFS)

**Backend:**

* Build a simple graph of stations (nodes) and connections (edges).
* Add weights/constraints: block routes through “out-of-service” elevators where necessary.

**API:**

* `/api/routes/accessible?from_station=...&to_station=...`

**UI:**

* Form: “From station” / “To station” dropdowns.
* Results:

  * List of steps (line changes, stations).
  * Flag segments where accessibility is borderline.
  * Show “No accessible route available right now” when necessary.

---

#### Page: `/commute` – Personal Commute Assistant

**Purpose:**
Smart view for your home↔work route.

**Data:**

* Same as above + reliability metrics.

**Backend:**

* `users` (later) and `saved_commutes` tables:

  * `home_station`, `work_station`, usual times.
* API endpoints:

  * `/api/commute/summary`
  * `/api/commute/departure-suggestions`

**Features:**

* Current recommended route (“Leave in X minutes to arrive by Y”).
* Simple “commute history” graph (avg time this week, worst day, etc.).

**UI:**

* HeroUI Cards with:

  * Next best departure
  * Backup option (alternative line/route)
* Chart for weekly commute stats.

---

### Phase 5 – Crowding + Polish

#### Page: `/crowding` – Density / Crowding Estimates

**Purpose:**
Approximate how packed lines are right now.

**Idea:**

* Use **headways** (time between trains) + delays:

  * Short headways → more capacity → less crowding.
  * Big gaps + delays → likely crowding.

**Backend:**

* For each route & direction:

  * Compute recent headways from trip data.
  * Define a “crowding index” (Low/Med/High).

**API:**

* `/api/metrics/crowding?route=...`

**UI:**

* Heatmap or colored route list:

  * Red = High, Yellow = Medium, Green = Low.
* Tooltip explaining logic (so it doesn’t feel random).

---

### Final Polish & Extras

* Add **landing page** (`/`) explaining:

  * What the app does
  * Tech stack
  * Screenshots/gifs
* Add a **“Tech / About” page**:

  * High-level architecture diagram
  * Bullet points about Next.js, HeroUI, GTFS, etc.
* Add basic **error/empty states**:

  * If data is stale
  * If feeds are down

---

