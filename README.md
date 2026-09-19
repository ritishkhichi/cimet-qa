# CIMET QA — Phase 1 (Ingestion)

Recording & transcript ingestion for the CIMET QA Automation brief.

## Prerequisites

- Docker Postgres: `docker start cimet-postgres`
- `.env` with `DATABASE_URL` (and optional `DEEPGRAM_API_KEY` for Option A only)

## Setup

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000/leads

## Ingest paths

- **Option B (default / no STT credits):** Lead detail → Upload transcript, or **Ingest CIMET sample fixture**
- **Option A:** Upload audio (calls Deepgram)

```bash
# with dev server running
npm run ingest:sample
```

## Tests

```bash
npm test
```

## Phase 1 scope

Leads list, lead detail, dual ingest, redaction, timestamp-shaped transcripts. Scoring / gate = Phase 2.
