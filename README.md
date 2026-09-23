# Docket

A team issue tracker built around one idea most trackers miss: not
every ticket needs the same kind of attention. A production outage, a
process bottleneck, and "should we adopt this library" are three
different *kinds* of problem — Docket tags every issue with a
**category** (Technical / Managerial / Decision) alongside the usual
priority, so a Decision-category ticket automatically notifies the
project's Leaders and Managers instead of sitting in a queue waiting
to be noticed.

## What it does

- **Projects, not teams, are the top-level container.** One person can
  own or belong to several independent projects, each with its own
  roster and role hierarchy (Owner / Manager / Leader / Developer).
- **A Kanban board with two views** — status columns, or a 2D
  category-by-status swimlane grid — with drag-and-drop, and the view
  choice remembered per person, per project.
- **Closing a ticket requires a resolution note.** Enforced server-side,
  not just prompted for in the UI — so the **Solved Issues** page (a
  running record of "what worked and how") can never show an empty
  entry.
- **Every edit is logged as a diff**, not a silent overwrite — an
  append-only activity trail powers each ticket's full history,
  reconstructed field-by-field rather than stored as periodic
  snapshots.
- **Invites are two-factor** (a single-use token *and* the invited
  email must both match), expire, and are bound to the accepting
  account's own identity — closing off token-leak scenarios beyond the
  specific one they were designed to prevent.

## Stack

**Backend** — Flask (pure JSON API), SQLAlchemy + Alembic migrations,
session auth (Flask-Login, httpOnly cookies), CSRF via double-submit
cookie, environment-conditional cookie security, rate limiting,
Pytest.

**Frontend** — Vite + React + TypeScript, Tailwind v4 (`@theme`
CSS-first config), TanStack Query, React Router, React Hook Form + Zod,
dnd-kit, Framer Motion. Vitest + React Testing Library for components,
Playwright for end-to-end flows.

**Design** — a from-scratch "Minimal Vintage" system: navy/white/red
palette, Fraunces/Source Sans 3/IBM Plex Mono, zero border-radius,
hairline rules instead of shadows. Mocked across all 21 screens
(desktop + mobile) before a line of frontend code was written.

## Project docs

This project was fully specified — schema, API, security model, test
plan, and every screen — before implementation began. The full
reasoning behind every non-obvious decision lives here, not just in
commit messages:

| Doc | Covers |
|---|---|
| [`Database.md`](./Database.md) | Every table, relationship, and index — and *why* each is shaped the way it is |
| [`Backend.md`](./Backend.md) | Every API endpoint and the business-logic rules the API enforces |
| [`Security.md`](./Security.md) | Auth, CSRF, the project-membership authorization gate, invite-token handling |
| [`Testing.md`](./Testing.md) | The specific test cases mapped to each business rule and security control |
| [`Frontend.md`](./Frontend.md) | Stack, design tokens, routes |
| [`DesignBrief.md`](./DesignBrief.md) | What every one of the 21 screens needs to contain |

## Running it locally

**Backend:**
```bash
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env                          # fill in the values
flask db upgrade
python seed.py
python run.py
```

**Frontend** (separate terminal):
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`. Seeded demo credentials are in
`backend/seed.py`.

## License

See [`LICENSE`](./LICENSE).
