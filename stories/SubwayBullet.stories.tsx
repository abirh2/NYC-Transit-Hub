import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SubwayBullet } from '../components/ui/SubwayBullet';

const meta: Meta<typeof SubwayBullet> = {
  title: 'UI/SubwayBullet',
  component: SubwayBullet,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    line: {
      control: 'select',
      options: ['1', '2', '3', '4', '5', '6', '7', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'J', 'L', 'M', 'N', 'Q', 'R', 'S', 'W', 'Z'],
      description: 'Subway line identifier',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the bullet icon',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    line: 'F',
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    line: 'A',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    line: '7',
    size: 'lg',
  },
};

export const AllLines: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {['1', '2', '3', '4', '5', '6', '7', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'J', 'L', 'M', 'N', 'Q', 'R', 'S', 'W', 'Z'].map((line) => (
        <SubwayBullet key={line} line={line} size="md" />
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <SubwayBullet line="F" size="sm" />
      <SubwayBullet line="F" size="md" />
      <SubwayBullet line="F" size="lg" />
    </div>
  ),
};

export const InlineWithText: Story = {
  render: () => (
    <p className="flex items-center gap-2 text-white">
      Take the <SubwayBullet line="F" size="sm" /> train to <SubwayBullet line="A" size="sm" /> <SubwayBullet line="C" size="sm" /> <SubwayBullet line="E" size="sm" /> at West 4th St
    </p>
  ),
};

