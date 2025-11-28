# NYC Transit Hub

A personal web application providing real-time MTA transit information, reliability analytics, and accessibility-aware routing for New York City's subway, bus, LIRR, and Metro-North systems.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Station Board** | Real-time departures for your saved stations | Phase 2 |
| **Live Tracker** | Visual train positions on line diagrams | Phase 2 |
| **Service Alerts** | Current delays and service changes | Phase 1 |
| **Reliability** | Historical on-time performance metrics | Phase 3 |
| **Accessibility** | Elevator/escalator status and routing | Phase 4 |
| **Commute Assistant** | Personalized departure recommendations | Phase 4 |
| **Crowding** | Estimated train crowding levels | Phase 5 |

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **UI Library:** HeroUI v2
- **Styling:** Tailwind CSS v4
- **Testing:** Vitest, React Testing Library, Playwright
- **Database:** PostgreSQL (Supabase) - *Phase 1+*

## Quick Start

### Prerequisites

- Node.js >= 20.9.0 (use [nvm](https://github.com/nvm-sh/nvm) for version management)
- npm >= 10.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/abirh2/NYC-Transit-Hub.git
cd NYC-Transit-Hub

# Install dependencies
nvm use 20.19.5 && npm install

# Start development server
nvm use 20.19.5 && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit/component tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run storybook` | Start Storybook component explorer |

> **Note:** Always prefix commands with `nvm use 20.19.5 &&` to ensure correct Node.js version.

## Project Structure

```
NYC-Transit-Hub/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── dashboard/         # Dashboard card components
│   ├── layout/            # Layout components (Navbar, Sidebar)
│   └── ui/                # Reusable UI primitives
├── docs/                   # Documentation
├── lib/                    # Utilities and helpers
├── public/                 # Static assets
│   └── icons/subway/      # MTA subway bullet icons
├── stories/                # Storybook stories
├── tests/                  # Test files
│   ├── components/        # Component tests
│   └── e2e/               # End-to-end tests
└── types/                  # TypeScript definitions
```

## Documentation

Comprehensive documentation is available in the [`/docs`](./docs) folder:

- [Setup Guide](./docs/setup.md) - Development environment setup
- [Architecture](./docs/architecture.md) - System design and folder structure
- [Components](./docs/components.md) - Component usage guide
- [Testing](./docs/testing.md) - Testing guide and best practices
- [Contributing](./docs/contributing.md) - Contribution guidelines

## Data Sources

- [MTA GTFS-Realtime feeds](https://api.mta.info/) - Subway, bus, LIRR, Metro-North
- Service alerts (JSON/GTFS)
- Elevator/escalator status feeds
- Static GTFS for station metadata

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Data provided by [MTA](https://new.mta.info/)
- Subway icons from [mta-subway-bullets](https://github.com/louh/mta-subway-bullets)
- Built with [Next.js](https://nextjs.org/) and [HeroUI](https://heroui.com/)
