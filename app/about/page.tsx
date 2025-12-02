"use client";

import { Card, CardBody, Chip } from "@heroui/react";
import { 
  Train, 
  Clock, 
  AlertTriangle, 
  Users, 
  Accessibility, 
  Navigation,
  Database,
  Server,
  Code,
  Layers,
  Zap,
  Shield,
  Github,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Train className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold">NYC Transit Hub</h1>
        <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
          A personal, non-commercial web application providing real-time MTA transit information, 
          reliability analytics, and accessibility-aware routing for New York City.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Chip color="primary" variant="flat">Real-Time Data</Chip>
          <Chip color="secondary" variant="flat">Open Source</Chip>
          <Chip color="success" variant="flat">Accessibility-First</Chip>
        </div>
      </section>

      {/* Features Grid */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Clock className="h-6 w-6" />}
            title="Live Arrivals"
            description="Real-time train arrival predictions for any subway station, updated every 30 seconds."
            color="primary"
          />
          <FeatureCard
            icon={<Train className="h-6 w-6" />}
            title="Live Tracker"
            description="Visual train positions on line diagrams showing where every train is right now."
            color="secondary"
          />
          <FeatureCard
            icon={<AlertTriangle className="h-6 w-6" />}
            title="Service Alerts"
            description="Current delays, planned work, and service changes with affected routes highlighted."
            color="warning"
          />
          <FeatureCard
            icon={<Users className="h-6 w-6" />}
            title="Crowding Estimates"
            description="Multi-factor crowding analysis combining headways, demand patterns, delays, and alerts."
            color="danger"
          />
          <FeatureCard
            icon={<Accessibility className="h-6 w-6" />}
            title="Accessibility"
            description="Real-time elevator/escalator status and accessibility-aware trip planning."
            color="success"
          />
          <FeatureCard
            icon={<Navigation className="h-6 w-6" />}
            title="Trip Planner"
            description="Point-to-point routing with real-time delay integration and accessibility options."
            color="primary"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">How It Works</h2>
        <Card className="bg-content2/50">
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">1. Data Ingestion</h3>
                <p className="text-sm text-foreground/70">
                  MTA publishes real-time data via GTFS-Realtime feeds. We fetch subway, bus, LIRR, 
                  and Metro-North data every 30 seconds.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center mx-auto">
                  <Server className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-semibold">2. Processing</h3>
                <p className="text-sm text-foreground/70">
                  Protocol Buffer messages are decoded and parsed into structured data. 
                  Arrivals, alerts, and vehicle positions are extracted and cached.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                  <Zap className="h-6 w-6 text-success" />
                </div>
                <h3 className="font-semibold">3. Presentation</h3>
                <p className="text-sm text-foreground/70">
                  Clean, responsive UI displays the data with smart defaults. 
                  Server-side rendering ensures fast initial loads.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Tech Stack */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Tech Stack</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <Code className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Frontend</h3>
              </div>
              <div className="space-y-2 text-sm">
                <TechItem name="Next.js 15" description="React framework with App Router" />
                <TechItem name="TypeScript" description="Type-safe development (strict mode)" />
                <TechItem name="HeroUI v2" description="Modern React component library" />
                <TechItem name="Tailwind CSS v4" description="Utility-first styling" />
                <TechItem name="Recharts" description="Data visualization" />
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-secondary" />
                <h3 className="font-semibold">Backend</h3>
              </div>
              <div className="space-y-2 text-sm">
                <TechItem name="Next.js API Routes" description="Serverless API endpoints" />
                <TechItem name="Protobuf.js" description="GTFS-Realtime message parsing" />
                <TechItem name="PostgreSQL" description="Supabase-hosted database" />
                <TechItem name="Prisma" description="Type-safe database ORM" />
                <TechItem name="Zod" description="Runtime schema validation" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-success" />
                <h3 className="font-semibold">Data Sources</h3>
              </div>
              <div className="space-y-2 text-sm">
                <TechItem name="MTA GTFS-Realtime" description="Subway, bus, LIRR, Metro-North feeds" />
                <TechItem name="Service Alerts API" description="Delays, planned work, changes" />
                <TechItem name="Elevator/Escalator API" description="Accessibility equipment status" />
                <TechItem name="Static GTFS" description="Station metadata and routes" />
                <TechItem name="OpenTripPlanner" description="Trip planning engine (MTA-hosted)" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-warning" />
                <h3 className="font-semibold">Quality & Testing</h3>
              </div>
              <div className="space-y-2 text-sm">
                <TechItem name="Vitest" description="Unit and component testing" />
                <TechItem name="React Testing Library" description="Component testing utilities" />
                <TechItem name="Playwright" description="End-to-end testing" />
                <TechItem name="ESLint" description="Code quality and style" />
                <TechItem name="TypeScript Strict" description="Maximum type safety" />
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Crowding Algorithm */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Crowding Algorithm</h2>
        <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardBody className="space-y-4">
            <p className="text-sm text-foreground/70">
              Our enhanced crowding system combines multiple real-time factors to estimate train crowding:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-content2 rounded-lg">
                <p className="text-2xl font-bold text-primary">35%</p>
                <p className="text-sm font-medium">Headway</p>
                <p className="text-xs text-foreground/50">Time between trains</p>
              </div>
              <div className="text-center p-4 bg-content2 rounded-lg">
                <p className="text-2xl font-bold text-secondary">35%</p>
                <p className="text-sm font-medium">Demand</p>
                <p className="text-xs text-foreground/50">Time-of-day patterns</p>
              </div>
              <div className="text-center p-4 bg-content2 rounded-lg">
                <p className="text-2xl font-bold text-warning">20%</p>
                <p className="text-sm font-medium">Delays</p>
                <p className="text-xs text-foreground/50">Real-time delays</p>
              </div>
              <div className="text-center p-4 bg-content2 rounded-lg">
                <p className="text-2xl font-bold text-danger">10%</p>
                <p className="text-sm font-medium">Alerts</p>
                <p className="text-xs text-foreground/50">Service disruptions</p>
              </div>
            </div>
            <p className="text-xs text-foreground/50 text-center">
              Crowding is estimated, not measured. MTA does not provide real-time passenger counts.
            </p>
          </CardBody>
        </Card>
      </section>

      {/* Architecture Diagram */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Architecture</h2>
        <Card>
          <CardBody>
            <div className="font-mono text-xs md:text-sm overflow-x-auto">
              <pre className="text-foreground/80">{`
┌─────────────────────────────────────────────────────────────────┐
│                         NYC Transit Hub                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│   │   Browser   │◄───│  Next.js    │◄───│   Vercel    │         │
│   │   (React)   │    │  App Router │    │   Edge      │         │
│   └─────────────┘    └──────┬──────┘    └─────────────┘         │
│                             │                                     │
│                             ▼                                     │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    API Routes                            │   │
│   │  /api/trains  /api/alerts  /api/stations  /api/crowding │   │
│   └─────────────────────────┬───────────────────────────────┘   │
│                             │                                     │
│         ┌───────────────────┼───────────────────┐               │
│         ▼                   ▼                   ▼               │
│   ┌───────────┐       ┌───────────┐       ┌───────────┐         │
│   │   MTA     │       │  Supabase │       │   OTP     │         │
│   │ GTFS-RT   │       │ PostgreSQL│       │  (Trips)  │         │
│   └───────────┘       └───────────┘       └───────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
              `}</pre>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Privacy & Open Source */}
      <section className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-success" />
                <h3 className="font-semibold">Privacy</h3>
              </div>
              <ul className="text-sm text-foreground/70 space-y-1">
                <li>• No personal data collected or stored</li>
                <li>• No account required for basic features</li>
                <li>• Favorites saved locally in browser</li>
                <li>• Location used only for nearby stations</li>
                <li>• No tracking or analytics</li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <Github className="h-5 w-5" />
                <h3 className="font-semibold">Open Source</h3>
              </div>
              <p className="text-sm text-foreground/70">
                This is a personal, non-commercial project. The source code is available on GitHub.
              </p>
              <Link 
                href="https://github.com/abirh2/NYC-Transit-Hub" 
                target="_blank"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                View on GitHub <ExternalLink className="h-3 w-3" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Credits */}
      <section className="space-y-4 text-center pb-8">
        <h2 className="text-2xl font-bold">Credits</h2>
        <div className="text-sm text-foreground/70 space-y-1">
          <p>Data provided by <Link href="https://new.mta.info/" target="_blank" className="text-primary hover:underline">Metropolitan Transportation Authority (MTA)</Link></p>
          <p>Subway icons from <Link href="https://github.com/louh/mta-subway-bullets" target="_blank" className="text-primary hover:underline">mta-subway-bullets</Link></p>
          <p>Built with <Link href="https://nextjs.org/" target="_blank" className="text-primary hover:underline">Next.js</Link> and <Link href="https://heroui.com/" target="_blank" className="text-primary hover:underline">HeroUI</Link></p>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  color: "primary" | "secondary" | "success" | "warning" | "danger";
}) {
  const bgColors = {
    primary: "bg-primary/10",
    secondary: "bg-secondary/10",
    success: "bg-success/10",
    warning: "bg-warning/10",
    danger: "bg-danger/10",
  };

  const textColors = {
    primary: "text-primary",
    secondary: "text-secondary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };

  return (
    <Card className="h-full">
      <CardBody className="space-y-3">
        <div className={`h-10 w-10 rounded-lg ${bgColors[color]} ${textColors[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-foreground/70">{description}</p>
      </CardBody>
    </Card>
  );
}

function TechItem({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex items-start gap-2">
      <Layers className="h-4 w-4 text-foreground/50 mt-0.5 flex-shrink-0" />
      <div>
        <span className="font-medium">{name}</span>
        <span className="text-foreground/50"> – {description}</span>
      </div>
    </div>
  );
}

