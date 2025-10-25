# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/792767f7-e54b-4a6b-8934-b33ae165f977

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/792767f7-e54b-4a6b-8934-b33ae165f977) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev

# The app will be available at http://localhost:8080
# Check health status at http://localhost:8080/health.html
```

## Local Dev Troubleshooting

### Default Port
- **Default dev port**: 8080 (configured in `vite.config.ts`)
- **Change port**: Set `PORT` environment variable or use `npm run dev:port PORT=3000`

### Starting the App

**Option 1: Standard dev server**
```bash
npm run dev
# Opens at http://localhost:8080
```

**Option 2: Custom port**
```bash
PORT=3000 npm run dev:port
# Opens at http://localhost:3000
```

**Option 3: With Redis backend**
```bash
npm run dev:stack
# Starts Redis Docker container + dev server
```

### Health Check
Visit http://localhost:8080/health.html to verify:
- ✓ Server is running
- ✓ Data endpoints are accessible
- ✓ All JSON mock data files are loaded

### Common Issues

**Port already in use (8080)**
```bash
# Find what's using port 8080
lsof -i :8080

# Kill the process if needed
kill <PID>

# Or use a different port
PORT=3000 npm run dev:port
```

**Blank page in browser**
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Check Console tab for JavaScript errors
3. Check Network tab for failed requests
4. Try hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

**Build errors**
```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Available Scripts
- `npm run dev` - Start dev server (port 8080)
- `npm run dev:port` - Start with custom port via PORT env var
- `npm run dev:stack` - Start with Redis Docker backend
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking
- `npm run health` - Quick health check

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Redis Stack (JSON + Search + TimeSeries)
- ioredis (Redis client)

## Phase 2: Redis Backend Integration

Phase 2 replaces the mock JSON data with a Redis backend while maintaining the same API contracts.

### Redis Setup

1. **Start Redis Stack:**
   ```bash
   # Start Redis with Docker Compose (includes Redis Insight UI)
   pnpm dev:stack

   # Or start only Redis:
   docker-compose up -d redis
   ```

2. **Access Redis Insight:**
   - Web UI: http://localhost:8001
   - Redis Server: localhost:6379

3. **Seed Data:**
   ```bash
   # Load mock data into Redis
   pnpm seed:redis
   ```

### Available Scripts

- `pnpm dev` - Start development server (JSON mock mode)
- `pnpm dev:stack` - Start with Redis backend (recommended for Phase 2)
- `pnpm seed:redis` - Load mock data into Redis
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build

### Redis Data Structure

The application uses these Redis keys:
- `sec:incident:*` - Individual incidents (JSON)
- `sec:asset:*` - Individual assets (JSON)
- `sec:rules` - Security rules (JSON array)
- `sec:topology` - Network topology (JSON)
- `idx:incidents` - RediSearch index for incidents
- `idx:assets` - RediSearch index for assets

### Phase 3: Composio Integration (TODO)

Phase 3 will add real integrations using Composio. See `src/lib/composio.ts` for detailed TODOs including:
- Slack notifications
- Email alerts
- Rule engine actions
- Error handling and monitoring

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/792767f7-e54b-4a6b-8934-b33ae165f977) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
