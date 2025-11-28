# Component Guide

This document describes the React components available in NYC Transit Hub.

---

## Component Organization

```
components/
├── board/           # Station board components
├── dashboard/       # Dashboard-specific cards
├── layout/          # App structure components
├── realtime/        # Live train tracker components
├── ui/              # Reusable UI primitives
└── Providers.tsx    # Context providers
```

---

## UI Components

### SubwayBullet

Displays an official MTA subway line bullet icon with fallback support.

```tsx
import { SubwayBullet } from "@/components/ui";

// Basic usage
<SubwayBullet line="F" />

// With size
<SubwayBullet line="A" size="sm" />  // 20px
<SubwayBullet line="A" size="md" />  // 24px (default)
<SubwayBullet line="A" size="lg" />  // 32px

// With custom className
<SubwayBullet line="7" className="mr-2" />
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `line` | string | required | Subway line identifier (e.g., "F", "A", "7") |
| `size` | "sm" \| "md" \| "lg" | "md" | Icon size |
| `className` | string | "" | Additional CSS classes |

**Supported Lines:**
- Numbers: 1, 2, 3, 4, 5, 6, 7
- Letters: A, B, C, D, E, F, G, J, L, M, N, Q, R, S, W, Z
- Special: SIR, T (future)

---

### DashboardCard

A pressable card component for dashboard feature links.

```tsx
import { DashboardCard } from "@/components/ui";

<DashboardCard
  href="/board"
  title="Your Station"
  description="View upcoming trains"
  icon={<TrainFront className="h-5 w-5" />}
  status="Configure stations"
/>
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `href` | string | Yes | Link destination |
| `title` | string | Yes | Card title |
| `description` | string | Yes | Card description |
| `icon` | ReactNode | Yes | Icon element |
| `status` | string | No | Optional status text |

---

### PlaceholderCard

A card for features that are not yet implemented.

```tsx
import { PlaceholderCard } from "@/components/ui";

<PlaceholderCard
  icon={<Radio className="h-5 w-5" />}
  title="Coming Soon"
  phase="Phase 2"
  description="This feature is under development."
>
  <div>Optional children content</div>
</PlaceholderCard>
```

---

### StatusCard

A simple card for displaying status information.

```tsx
import { StatusCard } from "@/components/ui";

<StatusCard
  label="System Status"
  status="All systems operational"
/>
```

---

## Layout Components

### AppShell

The main application shell that provides the layout structure.

```tsx
import { AppShell } from "@/components/layout";

<AppShell>
  {children}
</AppShell>
```

Includes:
- Responsive sidebar (drawer on mobile)
- Top navbar
- Main content area

---

### Sidebar

Navigation sidebar with responsive behavior.

```tsx
import { Sidebar } from "@/components/layout";

<Sidebar isOpen={true} onClose={() => {}} />
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | boolean | Whether sidebar is open (mobile) |
| `onClose` | function | Callback when sidebar closes |

---

### Navbar

Top navigation bar with theme toggle.

```tsx
import { Navbar } from "@/components/layout";

<Navbar onMenuClick={() => {}} />
```

---

### ThemeToggle

Toggle button for dark/light theme.

```tsx
import { ThemeToggle } from "@/components/layout";

<ThemeToggle />
```

---

## Realtime Components

Components for the live train tracker page (`/realtime`).

### LineSelector

Single-select line picker for the live train tracker, organized by color family.

```tsx
import { LineSelector } from "@/components/realtime";

const [selectedLine, setSelectedLine] = useState<LineId | null>(null);

<LineSelector
  selectedLine={selectedLine}
  onSelectionChange={setSelectedLine}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedLine` | LineId \| null | required | Currently selected line ID |
| `onSelectionChange` | (line: LineId \| null) => void | required | Callback when selection changes |
| `compact` | boolean | false | Use smaller button size |

**Features:**
- Lines grouped by color family (Broadway-7th Ave, 8th Ave, etc.)
- Visual subway bullet icons for selection
- Shows selected line with clear button
- Popover picker with all available lines

**Note:** Multi-line selection is planned for a future update with branching track visualization.

---

### LineDiagram

Displays a vertical line diagram with stations and live train positions for a single line.

```tsx
import { LineDiagram } from "@/components/realtime";

<LineDiagram
  selectedLine="A"
  trains={trainArrivals}
  isLoading={false}
  error={null}
  height={600}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedLine` | LineId \| null | required | The line to display |
| `trains` | TrainArrival[] | required | Array of train arrivals from API |
| `isLoading` | boolean | false | Whether data is loading |
| `error` | string \| null | null | Error message to display |
| `height` | number | 600 | Height of the diagram container in pixels |

**Features:**
- Vertical scrollable track with all stations
- Train markers positioned based on next stop and ETA
- Station dots differentiated by type (terminal, express, local)
- Transfer line indicators at each station
- Click train markers to see detailed popover
- Train count summary in footer
- Gradient fade at bottom for visual polish

**Station Types:**
- **Terminal** (large dot): End of line stations
- **Express** (medium dot): Express stops
- **Local** (small dot): Local-only stops

---

### TrainMarker

Interactive train position indicator on the line diagram.

```tsx
import { TrainMarker } from "@/components/realtime";

<TrainMarker
  train={trainArrival}
  isSelected={false}
  onClick={(train) => setSelectedTrain(train)}
  size="md"
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `train` | TrainArrival | required | Train arrival data |
| `isSelected` | boolean | false | Whether this train is selected |
| `onClick` | (train: TrainArrival) => void | - | Click handler |
| `size` | "sm" \| "md" | "md" | Size variant |

**Features:**
- Subway bullet icon showing line
- Direction arrow (green ↑ for northbound, red ↓ for southbound)
- "NOW" indicator when train is arriving within 1 minute
- Ring highlight when selected
- Hover tooltip with destination

---

### TrainDetailPopover

Modal/popover showing detailed train information when a marker is clicked.

```tsx
import { TrainDetailPopover } from "@/components/realtime";

<TrainDetailPopover 
  train={selectedTrain} 
  onClose={() => setSelectedTrain(null)}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `train` | TrainArrival | Train to display details for |
| `onClose` | () => void | Callback when popover should close |

**Displays:**
- Destination as heading (from headsign)
- Next stop with station name
- Arrival time (prominent display)
- Delay status (on time, minor delay, significant delay)
- Trip ID for debugging/tracking

**Mobile Behavior:**
- Renders as bottom sheet modal on mobile
- Centered modal on desktop

---

## Board Components

### StationBoard

The main station board component for viewing train arrivals.

```tsx
import { StationBoard } from "@/components/board";

// Basic usage - loads from user's saved station
<StationBoard />

// With initial station
<StationBoard initialStationId="127" />

// Custom refresh settings
<StationBoard 
  autoRefresh={true} 
  refreshInterval={30} 
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialStationId` | string | undefined | Pre-select a station by ID |
| `autoRefresh` | boolean | true | Enable auto-refresh |
| `refreshInterval` | number | 30 | Refresh interval in seconds |

**Features:**
- Station search with autocomplete
- Direction tabs (Uptown/Downtown)
- Favorite station support (saved to localStorage)
- Auto-refresh with manual refresh option
- Handles multi-complex stations (e.g., Times Sq has 4 station complexes)

---

### StationSearch

Autocomplete search input for finding stations.

```tsx
import { StationSearch } from "@/components/board";

<StationSearch
  onSelect={(id, name) => console.log(`Selected: ${name}`)}
  selectedId="127"
  placeholder="Search stations..."
  favoriteIds={["127", "A27"]}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSelect` | function | required | Callback when station selected |
| `selectedId` | string | undefined | Currently selected station ID |
| `placeholder` | string | "Search for a station..." | Input placeholder |
| `compact` | boolean | false | Use compact styling |
| `favoriteIds` | string[] | [] | Station IDs to mark with star icon |

---

### ArrivalsList

Displays train arrivals for a single direction.

```tsx
import { ArrivalsList } from "@/components/board";

<ArrivalsList
  arrivals={northboundArrivals}
  isLoading={false}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `arrivals` | TrainArrival[] | Array of train arrivals |
| `isLoading` | boolean | Show loading skeleton |

**Displays:**
- Subway line bullet
- Destination (headsign)
- Minutes until arrival
- Delay indicators

---

### NearbyStations

Shows stations near the user's location.

```tsx
import { NearbyStations } from "@/components/board";

<NearbyStations 
  radiusMiles={1}
  limit={5}
  onStationSelect={(id, name) => {}}
  onFavorite={(id, name) => {}}
  favoriteIds={["127"]}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `radiusMiles` | number | 1 | Search radius |
| `limit` | number | 5 | Max stations to show |
| `onStationSelect` | function | undefined | Callback when station clicked |
| `onFavorite` | function | undefined | Callback to toggle favorite |
| `favoriteIds` | string[] | [] | Currently favorited station IDs |

**Features:**
- Requests geolocation permission
- Shows distance from user
- Graceful handling of permission denied

---

## Dashboard Components

### StationCard

Displays upcoming train departures for user's saved station.

```tsx
import { StationCard } from "@/components/dashboard";

<StationCard />
```

**Features:**
- Reads primary station from `useStationPreferences` hook
- Fetches real-time arrivals from `/api/trains/realtime`
- Handles multi-complex stations (fetches all platforms)
- Auto-refreshes every 30 seconds
- Shows "Set My Station" prompt if no favorite set
- Links to `/board` for full station board view

---

### AlertsCard

Shows active service alerts.

```tsx
import { AlertsCard } from "@/components/dashboard";

<AlertsCard />
```

---

### LiveTrackerCard

Preview of live train tracker feature.

```tsx
import { LiveTrackerCard } from "@/components/dashboard";

<LiveTrackerCard />
```

---

### CommuteCard

Commute assistant with departure recommendations.

```tsx
import { CommuteCard } from "@/components/dashboard";

<CommuteCard />
```

---

### IncidentsCard

Summary of active incidents.

```tsx
import { IncidentsCard } from "@/components/dashboard";

<IncidentsCard />
```

---

### ReliabilityCard

Line reliability metrics preview.

```tsx
import { ReliabilityCard } from "@/components/dashboard";

<ReliabilityCard />
```

---

### CrowdingCard

Crowding estimates preview.

```tsx
import { CrowdingCard } from "@/components/dashboard";

<CrowdingCard />
```

---

### SystemStatusCard

System connection status indicator.

```tsx
import { SystemStatusCard } from "@/components/dashboard";

<SystemStatusCard />
```

---

## React Hooks

### useStationPreferences

Manages favorite stations with localStorage persistence.

```tsx
import { useStationPreferences } from "@/lib/hooks/useStationPreferences";

function MyComponent() {
  const {
    favorites,        // StationPreference[]
    primaryStation,   // StationPreference | null (first favorite)
    isLoaded,         // boolean - true after localStorage loaded
    addFavorite,      // (stationId, stationName) => void
    removeFavorite,   // (stationId) => void
    isFavorite,       // (stationId) => boolean
    setPrimary,       // (stationId) => void
    clearFavorites,   // () => void
  } = useStationPreferences();

  return (
    <button onClick={() => addFavorite("127", "Times Sq-42 St")}>
      Add Favorite
    </button>
  );
}
```

**Storage:** Data stored in `localStorage` under key `nyc-transit-favorites`.

---

### useGeolocation

Accesses browser geolocation with permission handling.

```tsx
import { useGeolocation } from "@/lib/hooks/useGeolocation";

function MyComponent() {
  const {
    location,         // { latitude, longitude, accuracy, timestamp } | null
    error,            // { code, message } | null
    isLoading,        // boolean
    permissionState,  // "granted" | "denied" | "prompt" | "unsupported"
    requestLocation,  // () => void
    clearLocation,    // () => void
    isSupported,      // boolean
  } = useGeolocation({ autoRequest: false });

  return (
    <button 
      onClick={requestLocation}
      disabled={permissionState === "denied"}
    >
      {permissionState === "denied" ? "Location Denied" : "Enable Location"}
    </button>
  );
}
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableHighAccuracy` | boolean | false | Request high accuracy |
| `maximumAge` | number | 60000 | Cache duration in ms |
| `timeout` | number | 10000 | Request timeout in ms |
| `autoRequest` | boolean | false | Auto-request on mount |

---

## Utility Functions

### Distance Utilities

```tsx
import { 
  haversineDistance, 
  findNearbyStations,
  formatDistance,
  formatWalkingTime 
} from "@/lib/utils/distance";

// Calculate distance between two points (in miles)
const distance = haversineDistance(40.758, -73.985, 40.751, -73.977);

// Find stations within radius
const nearby = findNearbyStations(allStations, userLat, userLon, 1.0);

// Format for display
formatDistance(0.5);      // "0.5 mi"
formatDistance(0.08);     // "422 ft"
formatWalkingTime(0.25);  // "5 min walk"
```

---

## Creating New Components

### File Structure

```
components/
└── feature/
    ├── MyComponent.tsx      # Component implementation
    ├── MyComponent.test.tsx # Component tests
    ├── MyComponent.stories.tsx # Storybook stories
    └── index.ts             # Export barrel
```

### Component Template

```tsx
"use client"; // Only if needed

import { ComponentProps } from "react";

interface MyComponentProps {
  /** Description of prop */
  title: string;
  /** Optional prop with default */
  variant?: "primary" | "secondary";
}

/**
 * MyComponent - Brief description
 * 
 * @example
 * <MyComponent title="Hello" />
 */
export function MyComponent({ 
  title, 
  variant = "primary" 
}: MyComponentProps) {
  return (
    <div className={variant === "primary" ? "bg-primary" : "bg-secondary"}>
      {title}
    </div>
  );
}
```

### Guidelines

1. **Use TypeScript** - All components must be typed
2. **Document props** - Use JSDoc comments for props
3. **Write tests** - Include unit tests for logic
4. **Add stories** - Create Storybook stories for visual testing
5. **Export properly** - Add to index.ts barrel file

