# Agent Handoff README

This file is for Codex and other coding agents continuing work on this Lead Management CRM. Read this before changing code.

## Project Context

The assignment is to build a full-stack Lead Management CRM for a small business. The source brief is `Lead Management CRM Design.pdf`, which asks for a startup-quality SaaS CRM rather than a basic CRUD demo.

Core stack:

- Frontend: Next.js, React, TypeScript, TanStack Query
- Backend: Node.js, Express, TypeScript
- Database: MongoDB with Mongoose
- Validation: Zod
- Security: Helmet, CORS, rate limiting

Design direction:

- Warm editorial SaaS, inspired by Attio, Linear, Notion, Mercury
- Avoid Bootstrap/admin-template look
- Use restrained colors from `docs/product-architecture.md`
- Keep the first screen as the actual CRM workflow, not a landing page

## Current Implementation Status

Implemented:

- Lead create, read, update, delete API
- Search by name, email, or company
- Pagination, sorting, filtering
- Lead status workflow: New, Contacted, Qualified, Converted, Lost
- Dashboard stats endpoint
- Activity timeline endpoint
- Status history
- Lead health score
- Next.js dashboard UI
- Table view
- Kanban pipeline view
- Create/edit drawer
- Lead detail drawer
- Command palette with keyboard shortcut
- Responsive CSS
- Docker Compose helper for MongoDB
- Product and architecture documentation

Important files:

- `client/components/LeadDashboard.tsx`: main frontend orchestration
- `client/components/LeadTable.tsx`: lead table and inline status changes
- `client/components/PipelineBoard.tsx`: kanban pipeline
- `client/components/LeadForm.tsx`: create/edit form
- `client/components/LeadDetailDrawer.tsx`: details, history, activity
- `client/lib/api.ts`: typed API client
- `client/types/lead.ts`: frontend API/data types
- `server/src/app.ts`: Express app setup
- `server/src/routes/lead.routes.ts`: lead routes
- `server/src/controllers/lead.controller.ts`: HTTP controllers
- `server/src/services/lead.service.ts`: business logic
- `server/src/services/lead.schemas.ts`: Zod request/query validation
- `server/src/repositories/lead.repository.ts`: lead persistence queries
- `server/src/models/lead.model.ts`: MongoDB lead schema and indexes
- `server/src/models/activity.model.ts`: activity schema
- `docs/product-architecture.md`: product, UX, API, architecture, QA notes
- `docs/dependency-notes.md`: current Next/PostCSS audit caveat

## Setup

Install dependencies:

```bash
npm install
```

If npm has user-cache permission issues, use the workspace-local cache:

```bash
npm install --cache .npm-cache
```

Create environment files:

```bash
cp .env.example .env
cp client/.env.example client/.env.local
```

Start MongoDB:

```bash
docker compose up -d mongo
```

Run the full app:

```bash
npm run dev
```

Run only the client:

```bash
npm run dev --workspace client -- --hostname 127.0.0.1 --port 3000
```

Run only the API:

```bash
npm run dev --workspace server
```

Seed sample data after MongoDB is running:

```bash
npm run seed --workspace server
```

## Verification Commands

Use these before handing work back:

```bash
npm test
npm run typecheck
npm run build
```

Known environment limitation from the original build session:

- MongoDB was not installed locally.
- Docker was not available locally.
- The frontend build and dev server were verified.
- API behavior was typechecked and built, but not fully exercised against a live MongoDB instance in that environment.

## Architecture Rules For Future Agents

Keep backend responsibilities separated:

- Routes should only declare URL mappings.
- Controllers should parse HTTP-level input and return responses.
- Services should contain business rules.
- Repositories should contain persistence queries.
- Models should contain schema, indexes, and serialization behavior.
- Zod schemas should remain the source of request validation.

Keep frontend responsibilities separated:

- `LeadDashboard` owns workflow state, query state, and mutations.
- Components should remain focused and reusable.
- API calls should go through `client/lib/api.ts`.
- Shared data contracts should live in `client/types/lead.ts`.
- Avoid adding a global state library unless there is a real cross-page state problem.

Do not:

- Revert unrelated user changes.
- Commit `node_modules`, `.next`, `dist`, `.npm-cache`, or `*.tsbuildinfo`.
- Replace the current warm editorial UI with a generic dashboard theme.
- Use `npm audit fix --force` without reviewing the downgrade plan. It currently recommends an unacceptable Next.js downgrade.

## Recommended Next Work

High-value continuation tasks:

1. Add integration tests for the Express API using an in-memory MongoDB or a test Mongo container.
2. Add optimistic UI updates for status changes in table and pipeline views.
3. Add duplicate-email handling in the UI with field-level error display.
4. Add a dedicated lead detail route, such as `/leads/[id]`, if the assignment reviewer prefers routable screens.
5. Add CSV export/import for small-business CRM workflows.
6. Add authentication if deployment will be public.
7. Add Vercel and Render/Railway deployment configuration.
8. Seed richer demo data for screenshots and live demo evaluation.

## Suggested Agent Prompt

Use this when asking Codex or another agent to continue:

```text
You are continuing work on this Lead Management CRM. First read AGENTS.md, README.md, docs/product-architecture.md, and docs/dependency-notes.md. Preserve the current architecture: Next.js client in client/, Express/MongoDB API in server/, service/repository backend layers, typed API client, and warm editorial SaaS UI. Before changing files, inspect git status and relevant source files. After changes, run npm test, npm run typecheck, and npm run build. Do not run npm audit fix --force unless you explain and approve the dependency impact.
```

## Current Submission State

The repository is initialized locally but has no commit and no remote configured. To submit:

```bash
git add .
git commit -m "Build lead management CRM"
git remote add origin <your-github-repo-url>
git push -u origin main
```

Deploy with:

- Frontend: Vercel
- Backend: Render, Railway, Fly.io, or an AWS container service
- Database: MongoDB Atlas
