# CIMET QA — Phase 1 + Phase 2

Recording/transcript ingestion, user authentication, Groq scoring, gate & held queue.

## Prerequisites

- Docker Postgres: `docker start cimet-postgres`
- `.env` with `DATABASE_URL`, `GROQ_API_KEY`, `AUTH_SECRET` (optional `DEEPGRAM_API_KEY`)

## Setup

```bash
npm install
npm run fixtures:generate
npm run db:setup
npm run dev
```

Open http://localhost:3000/login

### Demo logins (seeded)

| Email | Password | Role |
|-------|----------|------|
| admin@cimet.local | Demo123! | ADMIN |
| tl@cimet.local | Demo123! | TL |
| qa@cimet.local | Demo123! | QA |

Admin can create more users at **/admin/users**. There is no public sign-up.

### Demo leads (seeded with transcripts)

From the CIMET redacted broadband PDF, five constrained variants:

| Lead ID | Scenario | Likely gate |
|---------|----------|-------------|
| BB-CLEAN-001 | All critical facts match CRM | SUBMITTED |
| BB-MODEM-FAIL-001 | Agent says PS forty vs CRM CF40 | HELD |
| BB-PRICE-FAIL-001 | Promo quoted $39.90 vs CRM $42.90 | HELD |
| BB-NO-DISCLAIMER-001 | Recording disclaimer missing | HELD |
| BB-DELIVERY-NOTE-001 | Facts OK + delivery confusion | SUBMITTED + NOTE |

## Flow

1. Login as TL (or admin)
2. Optional: **Ingest** page → pick lead → upload audio / JSON / PDF (sample WAV at `/fixtures/sample-call.wav`)
3. Open a demo lead → **Score** (calls Groq)
4. Review scorecard; if **HELD**, Override (reason optional) → **Approve submit** (TL force-approve) or Cancel
5. Critical holds email POC at `ALERT_TO_EMAIL` (default ritish143khichi@gmail.com)

## Tests

```bash
npm test
```

## Git branches

- `phase-1-ingestion` / `main` — ingestion
- `phase-2-scoring` — auth + scoring (merge via PR)
