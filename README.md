# LeadFlow CRM

A production-structured full-stack lead management CRM for small businesses to capture, search, qualify, and track leads through a sales pipeline.

## Screenshots

![Dashboard Overview](https://res.cloudinary.com/dptgeuamd/image/upload/v1780766098/248bbe1b-405d-44c4-bd53-509e27df6321.png)

![Lead Details and Activity Timeline](https://res.cloudinary.com/dptgeuamd/image/upload/v1780766161/4ec986fe-e153-496e-a999-f4e2403ac8be.png)

![Kanban Pipeline View](https://res.cloudinary.com/dptgeuamd/image/upload/v1780766217/c65f8317-1ad5-4d5e-a3a1-ea4eb095d171.png)

![Command Palette](https://res.cloudinary.com/dptgeuamd/image/upload/v1780766246/5a1abe02-0999-4853-82bd-1fa216f493b6.png)

![Dark Mode](https://res.cloudinary.com/dptgeuamd/image/upload/v1780766540/3dcb37b4-1541-4bf5-9169-d6d9938482ed.png)


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

## USP Feature

- Designed and implemented a scalable CSV import feature for bulk lead management, incorporating validation rules and pre-import verification to maintain data quality.

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
cp .env.example .env
cp client/.env.example client/.env.local
```

3. Set root `.env`:

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

Recommended deployment for this repo:

- Frontend: Vercel project with Root Directory set to `client`
- Backend: separate Vercel Express project with Root Directory set to `server`, or another Node host such as Render, Railway, Fly.io, or AWS
- Database: MongoDB Atlas

Do not rely on local `.env` files in hosted deployments. Set environment variables in the hosting provider dashboard. If the Vercel frontend project uses Root Directory `client`, it does not deploy the Express API in `server`.

For an all-Vercel deployment, create two Vercel projects from the same repository:

1. `leadflow-client`: Root Directory `client`, Framework `Next.js`.
2. `leadflow-api`: Root Directory `server`, Framework `Express.js`.

Frontend Vercel environment:

```bash
NEXT_PUBLIC_API_URL=https://your-leadflow-api.vercel.app/api
```

After adding or changing `NEXT_PUBLIC_API_URL`, redeploy the Vercel project because public Next.js variables are baked into the client build.

Backend service environment:

```bash
NODE_ENV=production
MONGO_URI=mongodb+srv://leadflow_user:YOUR_URL_ENCODED_PASSWORD@your-cluster.xxxxx.mongodb.net/leadflow?retryWrites=true&w=majority
CLIENT_ORIGIN=https://your-leadflow-client.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
```

Use the full MongoDB Atlas connection string from Atlas > Connect > Drivers. Replace the username, password, cluster hostname, and database name; do not paste `mongodb+srv://...` or leave placeholders such as `<password>`. If the password contains symbols such as `@`, `/`, `?`, `#`, or `&`, URL-encode it before saving the Vercel variable.

Set `PORT` only if your backend host requires a fixed value. Many platforms provide `PORT` automatically.

For Vercel preview deployments, `CLIENT_ORIGIN` supports comma-separated values and wildcard subdomains:

```bash
CLIENT_ORIGIN=https://lead-flow-crm-five.vercel.app,https://*.vercel.app
```

Use the exact production client URL whenever possible. Add `https://*.vercel.app` only if you need preview deployments to call the same backend.
