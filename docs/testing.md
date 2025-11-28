# Testing Guide

This document describes the testing strategy and tools for NYC Transit Hub.

---

## Testing Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit and component tests |
| **React Testing Library** | Component testing utilities |
| **Playwright** | End-to-end testing |
| **MSW** | API mocking (future) |

---

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   └── utils/              # Utility function tests
├── components/              # Component tests
│   ├── ui/                 # UI component tests
│   └── dashboard/          # Dashboard component tests
├── e2e/                     # End-to-end tests
│   ├── home.spec.ts        # Home page tests
│   └── navigation.spec.ts  # Navigation tests
└── setup/                   # Test configuration
    ├── vitest.setup.ts     # Vitest setup
    └── playwright.setup.ts # Playwright setup
```

---

## Running Tests

### All Tests

```bash
# Run all unit and component tests
nvm use 20.19.5 && npm run test

# Run tests in watch mode
nvm use 20.19.5 && npm run test:watch

# Run tests with coverage
nvm use 20.19.5 && npm run test:coverage
```

### E2E Tests

```bash
# Run end-to-end tests
nvm use 20.19.5 && npm run test:e2e

# Run E2E tests with UI
nvm use 20.19.5 && npm run test:e2e:ui

# Run specific test file
nvm use 20.19.5 && npx playwright test tests/e2e/home.spec.ts
```

---

## Writing Tests

### Unit Tests

Test pure functions and utilities.

```typescript
// tests/unit/utils/formatTime.test.ts
import { describe, it, expect } from 'vitest';
import { formatTime } from '@/lib/utils/formatTime';

describe('formatTime', () => {
  it('formats minutes correctly', () => {
    expect(formatTime(3)).toBe('3 min');
  });

  it('handles zero minutes', () => {
    expect(formatTime(0)).toBe('Now');
  });

  it('formats hours when >= 60 minutes', () => {
    expect(formatTime(65)).toBe('1h 5min');
  });
});
```

### Component Tests

Test component rendering and behavior.

```typescript
// tests/components/ui/SubwayBullet.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubwayBullet } from '@/components/ui';

describe('SubwayBullet', () => {
  it('renders the line letter', () => {
    render(<SubwayBullet line="F" />);
    expect(screen.getByAltText('F train')).toBeInTheDocument();
  });

  it('applies correct size class', () => {
    const { container } = render(<SubwayBullet line="A" size="lg" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ width: '32px', height: '32px' });
  });

  it('falls back to colored circle on image error', async () => {
    render(<SubwayBullet line="INVALID" />);
    // Image will fail, fallback should show
    // ... test fallback behavior
  });
});
```

### E2E Tests

Test user flows and page interactions.

```typescript
// tests/e2e/home.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays dashboard cards', async ({ page }) => {
    await expect(page.getByText('Your Station')).toBeVisible();
    await expect(page.getByText('Service Alerts')).toBeVisible();
  });

  test('navigates to station board', async ({ page }) => {
    await page.getByText('Your Station').click();
    await expect(page).toHaveURL('/board');
  });

  test('toggles theme', async ({ page }) => {
    const html = page.locator('html');
    
    // Default is dark
    await expect(html).toHaveClass(/dark/);
    
    // Click toggle
    await page.getByLabel(/switch to light mode/i).click();
    
    // Now light
    await expect(html).toHaveClass(/light/);
  });
});
```

---

## Testing Patterns

### Testing Async Components

```typescript
import { render, screen, waitFor } from '@testing-library/react';

it('loads data asynchronously', async () => {
  render(<AsyncComponent />);
  
  // Wait for loading to complete
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
  
  // Check loaded content
  expect(screen.getByText('Data loaded')).toBeInTheDocument();
});
```

### Testing User Interactions

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('handles click events', async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();
  
  render(<Button onClick={handleClick}>Click me</Button>);
  
  await user.click(screen.getByRole('button'));
  
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Mocking

```typescript
import { vi } from 'vitest';

// Mock a module
vi.mock('@/lib/api', () => ({
  fetchTrains: vi.fn().mockResolvedValue([
    { line: 'F', time: '3 min' }
  ])
}));

// Mock a function
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');
```

---

## Coverage

### Running Coverage

```bash
nvm use 20.19.5 && npm run test:coverage
```

### Coverage Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
});
```

---

## Best Practices

### Do

- Test behavior, not implementation
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern
- Test edge cases and error states
- Keep tests isolated and independent

### Don't

- Test implementation details
- Mock everything
- Write tests that are too broad
- Ignore flaky tests
- Skip tests without good reason

---

## Debugging Tests

### Vitest

```bash
# Run specific test file
nvm use 20.19.5 && npx vitest tests/unit/utils/formatTime.test.ts

# Run tests matching pattern
nvm use 20.19.5 && npx vitest -t "formats minutes"

# Debug mode
nvm use 20.19.5 && npx vitest --inspect-brk
```

### Playwright

```bash
# Debug mode with inspector
nvm use 20.19.5 && npx playwright test --debug

# Generate test from actions
nvm use 20.19.5 && npx playwright codegen http://localhost:3000

# View trace on failure
nvm use 20.19.5 && npx playwright show-trace
```

---

## Continuous Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch

See `.github/workflows/test.yml` for CI configuration (when added).

