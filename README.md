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
```

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
