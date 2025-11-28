import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemeToggle } from '../components/layout/ThemeToggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'Layout/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InNavbar: Story = {
  render: () => (
    <div className="flex items-center gap-4 p-4 bg-background border border-divider rounded-lg">
      <span className="text-foreground">NYC Transit Hub</span>
      <ThemeToggle />
    </div>
  ),
};

