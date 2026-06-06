# Lead Management CRM Product and Architecture

## 1. Product Discovery

### Product Vision

Small businesses need a fast, calm, and reliable place to manage prospects without the overhead of enterprise CRM software. This CRM is designed as a focused sales operating system: add leads quickly, see pipeline health immediately, and keep every follow-up visible.

### Target Users

- Founder-led small businesses managing early sales manually
- Sales reps qualifying inbound and outbound leads
- Operations managers who need pipeline visibility without complex reporting tools

### Personas

- Founder: wants current pipeline value and conversion health at a glance
- Sales rep: wants fast search, status updates, notes, and follow-up context
- Operations manager: wants clean records, low duplicates, and consistent workflow

### Pain Points

- Leads are scattered across email, spreadsheets, and notes
- Teams lose context after first contact
- Pipeline status is often stale
- Reporting is usually manual and late

### User Stories

- As a sales rep, I can add a lead with required contact details so the team has a reliable record.
- As a sales rep, I can update status from New to Converted or Lost so the pipeline stays current.
- As a founder, I can see status distribution and conversion rate so I understand pipeline quality.
- As an operator, I can search and filter leads so I can cleanly manage follow-ups.

### Jobs To Be Done

- When a prospect appears, capture them quickly with enough context for follow-up.
- When pipeline changes, update status and preserve the activity history.
- When planning sales work, filter by stage, priority, and recency.

### Success Metrics

- Lead creation time under 30 seconds
- Search results returned within 500 ms for typical small-business datasets
- Status update possible from the list view in one interaction
- Responsive usability across desktop and mobile

## 2. Product Strategy

### MVP Scope

- Lead CRUD
- Required field validation
- Search by name, email, company
- Status management
- Dashboard statistics
- Pagination, sorting, filtering
- Responsive table and pipeline views

### Differentiators

- Lead health score based on status, recency, and data completeness
- Activity timeline for reviewer-visible domain thinking
- Command palette for fast workflows
- Architecture split into controllers, services, repositories, models, and middleware

### Roadmap

- Day 1: Data model, API contract, base CRUD
- Day 2: UI dashboard, table, form, validation
- Day 3: Analytics, kanban, activity timeline, command palette
- Day 4: QA, polish, docs, deployment setup

## 3. Information Architecture

```text
Dashboard
  Summary KPIs
  Leads Table
  Pipeline Board
  Lead Detail Drawer
  Lead Create/Edit Drawer
  Command Palette
```

### Navigation

- Overview: KPIs and lead list
- Pipeline: kanban-style stage management
- Search: global search input and command palette
- Lead detail: drawer with contact details, status history, and activity

## 4. Competitive Analysis

- Attio: calm density, quick search, relationship-first records
- Linear: precise spacing, keyboard-first workflows, restrained visual language
- Pipedrive: pipeline board and stage movement
- HubSpot: strong CRM domain model, activity timeline, contact completeness

Adopted patterns: fast command/search, inline updates, stage-focused pipeline, timeline history, and restrained dashboard metrics.

## 5. Design System

### Tokens

- Background: `#F6F4EF`
- Surface: `#FCFBF8`
- Card: `#FFFFFF`
- Primary: `#6E8F7A`
- Primary hover: `#5F7C69`
- Text primary: `#22201D`
- Text secondary: `#68635D`
- Border: `#E7E1D8`
- Success: `#7BA87A`
- Warning: `#D6A55A`
- Danger: `#C97A6B`

### Typography

- Headings: Cabinet Grotesk
- Body: Cabinet Grotesk
- Scale: 12, 13, 14, 16, 20, 24, 32

### Components

- Buttons: primary, secondary, ghost, danger, icon
- Badges: status and priority
- Forms: validated inputs, text area, select menus
- Table: sortable headers, inline actions, empty/loading/error states
- Kanban: status columns, quick status movement
- Drawer: create/edit/detail flows
- Command palette: keyboard-triggered commands

## 6. Motion System

- Duration: 140-220 ms for controls, 260 ms for drawers
- Easing: cubic-bezier(0.2, 0.8, 0.2, 1)
- Principle: motion clarifies state changes, never blocks task completion

## 7. Database Architecture

### Lead

- Required: name, email, phone, company, status, notes, created date
- Optional: source, priority, estimated value, last contacted date
- Status history embedded for quick status audit
- Text and field indexes for search and filtering

### Activity

- References lead
- Stores created, updated, status changed, and note events
- Keeps timeline separate from lead document growth

## 8. API Architecture

REST is used because the assignment is CRUD-oriented and easy to evaluate manually.

- Controllers parse HTTP input and return responses
- Services own business rules
- Repositories own persistence
- Zod validates payloads and query params
- Central error middleware normalizes responses

Pagination response shape:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

## 9. Frontend Architecture

- Next.js app router for the UI shell
- TanStack Query for server state, caching, and mutations
- Component state for view mode, drawers, filters, and command palette
- A typed API client centralizes fetch behavior
- CSS tokens keep the design system explicit and dependency-light

## 10. Analytics Engine

- Total leads
- New leads this month
- Conversion rate
- Qualification rate
- Pipeline value
- Status distribution
- Recent activity

## 11. QA Plan

- Validate required fields and invalid email
- Create, edit, delete, and status update workflows
- Search by name, email, and company
- Pagination boundary states
- Sort by created date, name, company, status
- Filter by every status
- Responsive checks at mobile, tablet, and desktop widths
- Keyboard checks for command palette and escape behavior
- API checks for 400, 404, 409, and 500 error responses

## 12. Interview Preparation

### Why MongoDB?

Lead records are document-shaped, activity history is naturally append-heavy, and MongoDB Atlas is quick to deploy for an internship-grade full-stack project without sacrificing production patterns.

### Why service/repository layers?

They keep HTTP concerns, business rules, and database queries independent. This makes the system testable and easier to evolve if the persistence layer changes.

### Tradeoffs

- MongoDB text search is enough for this scope; a larger CRM could move to Atlas Search or OpenSearch.
- Embedded status history is efficient for lead detail reads; high-volume audit logs would move fully into an events collection.
- A single-page dashboard is efficient for this assignment; a production CRM would split routes by permissions and modules.
