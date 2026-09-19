# Phase 1 manual checklist

- [x] `.gitignore` ignores `.env` / `uploads/`
- [x] Prisma schema pushed; seed lead `BB-SAMPLE-001`
- [x] Unit tests: redact, normalize, fixture (`npm test` — 9 passed)
- [x] Integration: transcript ingest + card redaction
- [ ] Open http://localhost:3000/leads — see seeded lead
- [ ] Open lead → **Ingest CIMET sample fixture** → status `TRANSCRIBED`
- [ ] Transcript shows agent/customer turns with timestamps
- [ ] (Optional) Option A audio upload — uses Deepgram credits

## Commands

```bash
docker start cimet-postgres
npm run db:setup
npm run dev
# with server up:
npm run ingest:sample
```
