# Contributing Guide

Thank you for your interest in contributing to NYC Transit Hub! This guide will help you get started.

---

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Set up the development environment** (see [Setup Guide](./setup.md))
4. **Create a branch** for your changes

```bash
git checkout -b feature/your-feature-name
```

---

## Development Workflow

### 1. Before You Start

- Check existing issues and PRs for similar work
- For large changes, open an issue first to discuss
- Read the [Architecture Guide](./architecture.md) to understand the codebase

### 2. Making Changes

```bash
# Make sure you're on the latest main
git checkout main
git pull origin main

# Create your feature branch
git checkout -b feature/your-feature

# Make your changes...

# Run tests
nvm use 20.19.5 && npm run test

# Run linting
nvm use 20.19.5 && npm run lint

# Build to check for errors
nvm use 20.19.5 && npm run build
```

### 3. Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, no logic change)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**

```bash
# Good
git commit -m "feat(dashboard): add crowding card component"
git commit -m "fix(sidebar): correct height calculation on mobile"
git commit -m "docs: update API reference with new endpoints"

# Bad
git commit -m "fixed stuff"
git commit -m "updates"
```

### 4. Pull Requests

1. Push your branch to your fork
2. Open a PR against the `main` branch
3. Fill out the PR template
4. Wait for review

---

## Code Standards

### TypeScript

- **Strict mode** is enabled - no `any` types
- All functions should have explicit return types
- Use interfaces for object shapes
- Document complex types with JSDoc

```typescript
// Good
interface StationData {
  /** Unique station identifier */
  id: string;
  /** Human-readable station name */
  name: string;
  /** Subway lines serving this station */
  lines: string[];
}

function getStation(id: string): StationData | null {
  // ...
}

// Bad
function getStation(id: any): any {
  // ...
}
```

### React Components

- Use functional components with hooks
- Prefer composition over inheritance
- Keep components focused and small
- Use TypeScript for props

```typescript
// Good
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button 
      className={variant === 'primary' ? 'bg-primary' : 'bg-secondary'}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### Styling

- Use Tailwind CSS utilities
- Follow mobile-first responsive design
- Use CSS variables for theme values
- Avoid inline styles

```tsx
// Good
<div className="p-4 md:p-6 lg:p-8 bg-background text-foreground">

// Avoid
<div style={{ padding: '16px', background: '#000' }}>
```

### File Organization

- One component per file
- Co-locate related files (component, test, story)
- Use barrel exports (`index.ts`)

```
components/
└── ui/
    ├── Button.tsx
    ├── Button.test.tsx
    ├── Button.stories.tsx
    └── index.ts  // export { Button } from './Button'
```

---

## Documentation Standards

### Code Comments

- Comment the **why**, not the **what**
- Use JSDoc for public APIs
- Remove commented-out code

```typescript
// Good - explains why
// Use a 30-second cache to reduce API load while keeping data fresh
const CACHE_TTL = 30 * 1000;

// Bad - explains what (obvious from code)
// Set cache TTL to 30000 milliseconds
const CACHE_TTL = 30000;
```

### JSDoc

```typescript
/**
 * Calculates the estimated arrival time for a train.
 * 
 * @param currentPosition - Current position of the train
 * @param targetStation - Target station ID
 * @returns Estimated arrival time in minutes, or null if unavailable
 * 
 * @example
 * const eta = calculateETA({ lat: 40.7, lng: -74.0 }, 'D20');
 * // Returns: 5
 */
function calculateETA(
  currentPosition: Position, 
  targetStation: string
): number | null {
  // ...
}
```

### Markdown

- Use ATX-style headers (`#`, `##`, `###`)
- Include code examples for technical docs
- Use tables for structured data
- Add links to related documentation

---

## Testing Requirements

All PRs should include tests for:

- New features
- Bug fixes
- Edge cases

See the [Testing Guide](./testing.md) for details.

### Minimum Coverage

- New code should have >= 70% coverage
- Critical paths should have >= 90% coverage

---

## Review Process

1. **Automated checks** must pass (lint, tests, build)
2. **Code review** by maintainer
3. **Changes requested** - address feedback
4. **Approval** - ready to merge
5. **Merge** - squash and merge to main

---

## Getting Help

- **Questions?** Open a GitHub Discussion
- **Found a bug?** Open an Issue
- **Feature idea?** Open an Issue to discuss first

---

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

Thank you for contributing!

