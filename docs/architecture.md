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
│  │   - /api/trains/realtime                                │    │
│  │   - /api/alerts                                         │    │
│  │   - /api/elevators                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   MTA GTFS   │  │   Database   │  │    Cache     │          │
│  │    Feeds     │  │  (Supabase)  │  │   (Redis?)   │          │
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
│   ├── hero.ts                # HeroUI theme configuration
│   ├── accessibility/
│   │   └── page.tsx           # Accessibility status page
│   ├── board/
│   │   └── page.tsx           # Station board page
│   ├── commute/
│   │   └── page.tsx           # Commute assistant page
│   ├── crowding/
│   │   └── page.tsx           # Crowding estimates page
│   ├── incidents/
│   │   └── page.tsx           # Incident explorer page
│   ├── realtime/
│   │   └── page.tsx           # Live tracker page
│   └── reliability/
│       └── page.tsx           # Reliability metrics page
│
├── components/                 # React components
│   ├── dashboard/             # Dashboard card components
│   │   ├── AlertsCard.tsx
│   │   ├── CommuteCard.tsx
│   │   ├── CrowdingCard.tsx
│   │   ├── IncidentsCard.tsx
│   │   ├── LiveTrackerCard.tsx
│   │   ├── ReliabilityCard.tsx
│   │   ├── StationCard.tsx
│   │   ├── SystemStatusCard.tsx
│   │   └── index.ts
│   ├── layout/                # Layout components
│   │   ├── AppShell.tsx       # Main app shell
│   │   ├── Navbar.tsx         # Top navigation
│   │   ├── Sidebar.tsx        # Side navigation
│   │   ├── ThemeToggle.tsx    # Dark/light toggle
│   │   └── index.ts
│   ├── ui/                    # Reusable UI components
│   │   ├── DashboardCard.tsx
│   │   ├── PlaceholderCard.tsx
│   │   ├── StatusCard.tsx
│   │   ├── SubwayBullet.tsx   # MTA line icons
│   │   └── index.ts
│   └── Providers.tsx          # Context providers
│
├── lib/                       # Utilities and helpers
│   ├── api/                   # API client functions
│   ├── hooks/                 # Custom React hooks
│   └── utils/                 # Utility functions
│
├── types/                     # TypeScript definitions
│   ├── gtfs.ts               # GTFS data types
│   ├── station.ts            # Station types
│   └── index.ts
│
├── public/                    # Static assets
│   ├── icons/subway/         # MTA bullet SVGs
│   └── manifest.json         # PWA manifest
│
├── docs/                      # Documentation
├── tests/                     # Test files
└── stories/                   # Storybook stories
```

---

## Key Design Decisions

### 1. Next.js App Router

We use the App Router (not Pages Router) for:
- **Server Components** - Reduce client-side JavaScript
- **Streaming** - Progressive page loading
- **Nested Layouts** - Shared UI across routes
- **Built-in SEO** - Metadata API

### 2. Server Components by Default

Components are Server Components unless they need:
- Browser APIs (window, localStorage)
- Event handlers (onClick, onChange)
- React hooks (useState, useEffect)
- Third-party client libraries

Mark Client Components with `"use client"` directive.

### 3. HeroUI + Tailwind CSS

- **HeroUI** - Accessible, customizable component library
- **Tailwind CSS v4** - CSS-first configuration
- **MTA Theme** - Custom colors matching official MTA palette

### 4. Data Fetching Strategy

| Data Type | Strategy | Caching |
|-----------|----------|---------|
| Static GTFS | Build-time | Long (days) |
| Real-time feeds | Server fetch | Short (30s) |
| User preferences | Client-side | localStorage |
| Historical data | Database | Medium (hours) |

---

## Component Architecture

### Component Categories

```
Components
├── Layout Components     # App structure (Navbar, Sidebar)
├── Dashboard Cards       # Feature preview cards
├── UI Primitives        # Reusable atoms (SubwayBullet, StatusCard)
└── Feature Components   # Page-specific components
```

### Component Guidelines

1. **Single Responsibility** - Each component does one thing well
2. **Composition** - Build complex UIs from simple components
3. **Props Interface** - All props are explicitly typed
4. **Colocation** - Keep related files together

---

## State Management

### Client State

- **React useState** - Local component state
- **React Context** - Theme, user preferences
- **URL State** - Filters, selected items

### Server State

- **Server Components** - Initial data
- **TanStack Query** - Client-side caching and refetching (future)

---

## Data Flow

### Real-time Train Data

```
MTA GTFS-RT Feed
       │
       ▼
┌──────────────┐
│  API Route   │  /api/trains/realtime
│  (Server)    │
└──────┬───────┘
       │ Parse protobuf
       │ Transform to JSON
       ▼
┌──────────────┐
│   Database   │  Store for analytics
│  (Optional)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Client     │  Display in UI
│  Component   │
└──────────────┘
```

### User Preferences

```
User Action (select station)
       │
       ▼
┌──────────────┐
│ localStorage │  Persist preference
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Context    │  Share across app
│   Provider   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Components  │  React to changes
└──────────────┘
```

---

## Performance Considerations

### Optimization Strategies

1. **Code Splitting** - Dynamic imports for heavy components
2. **Image Optimization** - next/image for automatic optimization
3. **Caching** - Appropriate cache headers on API routes
4. **Streaming** - Suspense boundaries for progressive loading

### Monitoring

- Core Web Vitals tracking
- Error boundary logging
- API response time monitoring

---

## Security

### Best Practices

1. **Environment Variables** - Secrets never in client code
2. **Input Validation** - Zod schemas for external data
3. **CORS** - Restricted API access
4. **CSP** - Content Security Policy headers

---

## Future Considerations

### Planned Improvements

- [ ] PWA support with offline caching
- [ ] WebSocket for real-time updates
- [ ] Background sync for commute notifications
- [ ] Database for user accounts and preferences

