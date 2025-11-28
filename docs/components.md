# Component Guide

This document describes the React components available in NYC Transit Hub.

---

## Component Organization

```
components/
├── dashboard/       # Dashboard-specific cards
├── layout/          # App structure components
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

## Dashboard Components

### StationCard

Displays upcoming train departures for user's station.

```tsx
import { StationCard } from "@/components/dashboard";

<StationCard />
```

Currently displays mock data. Will integrate with real-time API.

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

