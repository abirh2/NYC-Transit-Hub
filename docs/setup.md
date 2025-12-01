# Development Setup

This guide will help you set up the NYC Transit Hub development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >= 20.9.0 | Use nvm for version management |
| npm | >= 10.0.0 | Comes with Node.js |
| Git | Latest | For version control |

### Node.js Version Management

This project requires Node.js 20.9.0 or higher. We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage Node versions.

```bash
# Install nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use the correct Node version
nvm install 20.19.5
nvm use 20.19.5

# Verify installation
node --version  # Should output v20.19.5
```

> **Important:** The terminal may reset to an older Node version between commands. Always prefix Node.js commands with `nvm use 20.19.5 &&` to ensure the correct version is used.

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/ahossain/NYC-Transit-Hub.git
cd NYC-Transit-Hub

# Install dependencies
nvm use 20.19.5 && npm install

# Start the development server
nvm use 20.19.5 && npm run dev

# Open http://localhost:3000 in your browser
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit and component tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run storybook` | Start Storybook component explorer |

---

## Environment Variables

Create a `.env` file in the project root:

```bash
touch .env
```

### Required Variables

```env
# Database (Supabase) - Required for data ingestion/analytics
# Get from: Supabase Dashboard > Project Settings > Database > Connection string
# Use the "Session pooler" connection (not direct connection)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

### Optional Variables

```env
# MTA Bus API Key - Required for bus arrival data
# Get from: https://api.mta.info/#/signup
MTA_BUS_API_KEY="your-api-key-here"
```

> **Note:** Subway feeds, alerts, and elevator status do NOT require an API key.

### Supabase Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Project Settings** > **Database**
4. Copy the **Session pooler** connection string
5. Add to `.env` as `DATABASE_URL`
6. Run `npx prisma db push` to create tables

### Supabase Authentication Setup

The Commute Assistant feature requires Supabase Auth for user accounts.

1. In your Supabase project, go to **Project Settings** > **API**
2. Copy the **Project URL** and **anon public** key
3. Add to `.env.local` (not `.env` - this file should be gitignored):

```env
# Supabase Auth (required for commute feature)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

4. Enable Email Auth:
   - Go to **Authentication** > **Providers**
   - Ensure **Email** provider is enabled
   - Under **Email Templates**, customize the magic link email (optional)

5. Configure Site URL:
   - Go to **Authentication** > **URL Configuration**
   - Set **Site URL** to `http://localhost:3000` for development
   - Add `http://localhost:3000/auth/callback` to **Redirect URLs**

6. For production, update:
   - **Site URL** to your production domain
   - Add production callback URL to **Redirect URLs**

### Verifying Setup

```bash
# Test all APIs
nvm use 20.19.5 && npm run dev &
sleep 10 && node scripts/test-all-apis.mjs
```

---

## Project Structure

```
NYC-Transit-Hub/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home dashboard
│   └── [feature]/         # Feature pages
├── components/            # React components
│   ├── dashboard/         # Dashboard-specific components
│   ├── layout/            # Layout components (Navbar, Sidebar)
│   └── ui/                # Reusable UI components
├── docs/                  # Documentation
├── lib/                   # Utilities and helpers
├── public/                # Static assets
│   └── icons/subway/      # MTA subway bullet icons
├── types/                 # TypeScript type definitions
└── tests/                 # Test files
    ├── unit/              # Unit tests
    ├── components/        # Component tests
    └── e2e/               # End-to-end tests
```

---

## IDE Setup

### VS Code (Recommended)

Install the following extensions:

- **ESLint** - Linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **TypeScript** - TypeScript support

### Recommended Settings

Add to your `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## Troubleshooting

### Common Issues

#### Node version mismatch
```
Error: The engine "node" is incompatible with this module
```
**Solution:** Run `nvm use 20.19.5` before npm commands.

#### Port already in use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:** Kill the process using the port:
```bash
lsof -ti:3000 | xargs kill -9
```

#### Module not found
```
Error: Cannot find module '...'
```
**Solution:** Delete `node_modules` and reinstall:
```bash
rm -rf node_modules .next
nvm use 20.19.5 && npm install
```

---

## Next Steps

- Read the [Architecture Guide](./architecture.md) to understand the system design
- Check the [Component Guide](./components.md) to learn about UI components
- See [Contributing](./contributing.md) to start making changes

