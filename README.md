# Lead Management CRM

A production-structured full-stack CRM for small businesses to capture, search, qualify, and track leads through a sales pipeline.

## Tech Stack

- Frontend: Next.js, React, TypeScript, TanStack Query
- Backend: Node.js, Express, TypeScript
- Database: MongoDB with Mongoose
- Validation: Zod
- Security: Helmet, CORS, rate limiting

## Features

- Create, view, edit, delete, search, sort, filter, and paginate leads
- Lead statuses: New, Contacted, Qualified, Converted, Lost
- Dashboard KPIs, conversion metrics, and status distribution
- Table and kanban pipeline views
- Inline status updates
- Activity timeline and status history
- Lead health score
- Command palette with keyboard shortcuts
- Responsive warm editorial SaaS UI based on `Lead Management CRM Design.pdf`

## Project Structure

```text
client/   Next.js app, UI components, API client, types
server/   Express API, controllers, services, repositories, models, middleware
docs/     Product, architecture, API, QA, and interview notes
```

Future coding agents should start with [AGENTS.md](AGENTS.md). It contains the handoff context, architecture rules, known limitations, verification commands, and recommended next work.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

3. Set `server/.env`:

```bash
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/lead_management_crm
CLIENT_ORIGIN=http://localhost:3000
```

4. Start MongoDB locally or use MongoDB Atlas.

Optional local MongoDB with Docker:

```bash
docker compose up -d mongo
```

5. Run the application:

```bash
npm run dev
```

- Client: `http://localhost:3000`
- API: `http://localhost:5001/api`

## API Summary

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/leads` | Create lead |
| `GET` | `/api/leads` | Get all leads with pagination, search, filter, sort |
| `GET` | `/api/leads/search` | Search leads by name, email, or company |
| `GET` | `/api/leads/:id` | Get one lead |
| `PATCH` | `/api/leads/:id` | Update lead |
| `DELETE` | `/api/leads/:id` | Delete lead |
| `GET` | `/api/leads/:id/activity` | Get lead timeline |
| `GET` | `/api/leads/stats` | Get dashboard statistics |

## Query Examples

```bash
curl "http://localhost:5001/api/leads?search=acme&status=Qualified&page=1&limit=10&sortBy=createdAt&sortOrder=desc"
```

```bash
curl -X POST "http://localhost:5001/api/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maya Shah",
    "email": "maya@acme.co",
    "phone": "+91 98765 43210",
    "company": "Acme Co",
    "status": "New",
    "notes": "Requested pricing for a 12-seat rollout."
  }'
```

## Tests and Build

```bash
npm test
npm run typecheck
npm run build
```

Dependency audit note: `npm audit --omit=dev` currently reports a moderate PostCSS advisory through Next.js. The latest checked Next package still pins `postcss@8.4.31`, and `npm audit fix --force` recommends an unacceptable downgrade to Next 9. See [docs/dependency-notes.md](docs/dependency-notes.md).

## Deployment

Recommended deployment:

- Frontend: Vercel
- Backend: Render, Railway, Fly.io, or an AWS container service
- Database: MongoDB Atlas

Frontend environment:

```bash
NEXT_PUBLIC_API_URL=https://your-api.example.com/api
```

Backend environment:

```bash
NODE_ENV=production
PORT=5001
MONGO_URI=mongodb+srv://...
CLIENT_ORIGIN=https://your-client.example.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
```

## Submission Notes

This workspace is ready to push to GitHub. Create a repository, push this folder, then deploy the client and API using the environment variables above.
