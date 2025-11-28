# NYC Transit Hub Documentation

Welcome to the NYC Transit Hub documentation. This guide will help you understand, set up, and contribute to the project.

## Table of Contents

### Getting Started
- [Project Overview](#project-overview)
- [Quick Start](./setup.md#quick-start)
- [Development Setup](./setup.md)

### Architecture
- [System Architecture](./architecture.md)
- [Folder Structure](./architecture.md#folder-structure)
- [Data Flow](./architecture.md#data-flow)

### Development
- [Component Guide](./components.md)
- [API Reference](./api.md)
- [Testing Guide](./testing.md)
- [Contributing](./contributing.md)

### User Guide
- [Using the App](./user-guide.md)
- [Features Overview](./user-guide.md#features)

---

## Project Overview

NYC Transit Hub is a personal, non-commercial web application that provides real-time MTA transit information, reliability analytics, and accessibility-aware routing for New York City's subway, bus, LIRR, and Metro-North systems.

### Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| Station Board | Real-time departures for your stations | Phase 2 |
| Live Tracker | Visual train positions on line diagrams | Phase 2 |
| Service Alerts | Current delays and service changes | Phase 1 |
| Reliability | Historical on-time performance | Phase 3 |
| Accessibility | Elevator/escalator status and routing | Phase 4 |
| Commute Assistant | Personalized departure suggestions | Phase 4 |
| Crowding | Estimated train crowding levels | Phase 5 |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| UI Library | HeroUI v2 |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma or Drizzle |
| Charts | Recharts |
| Testing | Vitest, React Testing Library, Playwright |

### Data Sources

- MTA GTFS-Realtime feeds (subway, bus, LIRR, Metro-North)
- Service alerts (JSON/GTFS)
- Elevator/escalator status feeds
- Static GTFS for station metadata

---

## Quick Links

- [GitHub Repository](https://github.com/ahossain/NYC-Transit-Hub)
- [MTA Developer Resources](https://api.mta.info/)
- [GTFS Realtime Reference](https://gtfs.org/realtime/)

---

## Documentation Standards

This project follows these documentation conventions:

1. **Markdown** - All documentation is written in GitHub-flavored Markdown
2. **JSDoc** - TypeScript interfaces and complex functions include JSDoc comments
3. **Storybook** - UI components are documented with interactive stories
4. **Code Comments** - Focus on "why" not "what"

See [Contributing](./contributing.md) for more details on documentation standards.

