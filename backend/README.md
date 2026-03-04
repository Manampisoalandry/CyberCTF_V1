# Backend CTF Platform

## Features
- Node.js + Express + MongoDB
- JWT auth (admin / participant)
- Challenge file uploads
- ZIP download for challenge assets
- Anti double-submit + rate limit on flag submissions
- Speed bonus: +80 (1st solve), +50 (2nd solve)
- Automatic score recalculation available on boot and on demand

## Run locally
```bash
cp .env.example .env
npm install
npm run dev
```

## Score maintenance
Recalculate all scores manually:
```bash
npm run migrate:scores
```

Or via admin API:
```bash
POST /api/admin/maintenance/recalculate-scores
```

## Notes
- When an admin deletes a challenge, attached files are deleted from disk too.
- `AUTO_RECALC_SCORES_ON_BOOT=true` will rebuild all user scores and first bloods at startup.
