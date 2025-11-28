import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StationCard } from '../components/dashboard/StationCard';
import { AlertsCard } from '../components/dashboard/AlertsCard';
import { LiveTrackerCard } from '../components/dashboard/LiveTrackerCard';
import { CommuteCard } from '../components/dashboard/CommuteCard';
import { IncidentsCard } from '../components/dashboard/IncidentsCard';
import { ReliabilityCard } from '../components/dashboard/ReliabilityCard';
import { CrowdingCard } from '../components/dashboard/CrowdingCard';
import { SystemStatusCard } from '../components/dashboard/SystemStatusCard';

const meta: Meta = {
  title: 'Dashboard/Cards',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

export const Station: StoryObj = {
  render: () => (
    <div className="max-w-md">
      <StationCard />
    </div>
  ),
};

export const Alerts: StoryObj = {
  render: () => (
    <div className="max-w-md">
      <AlertsCard />
    </div>
  ),
};

export const LiveTracker: StoryObj = {
  render: () => (
    <div className="max-w-sm">
      <LiveTrackerCard />
    </div>
  ),
};

export const Commute: StoryObj = {
  render: () => (
    <div className="max-w-sm">
      <CommuteCard />
    </div>
  ),
};

export const Incidents: StoryObj = {
  render: () => (
    <div className="max-w-sm">
      <IncidentsCard />
    </div>
  ),
};

export const Reliability: StoryObj = {
  render: () => (
    <div className="max-w-sm">
      <ReliabilityCard />
    </div>
  ),
};

export const Crowding: StoryObj = {
  render: () => (
    <div className="max-w-sm">
      <CrowdingCard />
    </div>
  ),
};

export const SystemStatus: StoryObj = {
  render: () => (
    <div className="max-w-2xl">
      <SystemStatusCard />
    </div>
  ),
};

export const AllCards: StoryObj = {
  render: () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Primary Cards</h2>
      <div className="grid grid-cols-2 gap-4">
        <StationCard />
        <AlertsCard />
      </div>

      <h2 className="text-xl font-bold text-white">Secondary Cards</h2>
      <div className="grid grid-cols-3 gap-4">
        <LiveTrackerCard />
        <CommuteCard />
        <IncidentsCard />
      </div>

      <h2 className="text-xl font-bold text-white">Tertiary Cards</h2>
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <ReliabilityCard />
        <CrowdingCard />
      </div>

      <h2 className="text-xl font-bold text-white">Status</h2>
      <SystemStatusCard />
    </div>
  ),
};

