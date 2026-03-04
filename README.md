# CyberCTF fullstack v14 — WebSocket + notifications

Cette version inclut Socket.IO pour le temps réel (feed live, centre de notifications, tickets et toasts en direct), ainsi qu'un `docker-compose.yml` sans exposition du port MongoDB pour éviter les conflits locaux sur `27017`.

# CTF Platform Fullstack Final

Stack:
- `backend/` — Node.js + Express + MongoDB + JWT + uploads + ZIP download
- `frontend/` — Next.js (App Router)
- `docker-compose.yml` — launches MongoDB + backend + frontend together

## Included in this final package
- Category tabs (Web / Crypto / Reverse / Forensics / OSINT / Pwn / Misc)
- Dedicated challenge page with full description + file downloads
- Download all attached challenge files as a ZIP
- Anti double-submit + rate limiting on flag submissions
- Speed bonus: **+80** for the first solve, **+50** for the second
- Automatic score recalculation (boot + script + admin endpoint)
- Automatic file cleanup when a challenge is deleted
- More visible skeleton loaders in the UI

## Quick start with Docker Compose
```bash
docker compose up --build
```

Open:
- Frontend: `http://192.168.1.100:3000`
- Backend health: `http://192.168.1.100:5000/api/health`

Default admin:
- `admin@ctf.com`
- `admin123`

## Manual local run
### 1) MongoDB
```bash
docker run -d --name ctf-mongo -p 27017:27017 -v ctf_mongo_data:/data/db mongo:7
```

### 2) Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 3) Frontend
```bash
cd ../frontend
cp .env.local.example .env.local
npm install
npm run dev
```

## Recalculate scores manually
```bash
cd backend
npm run migrate:scores
```

Or from the admin UI / API:
- `POST /api/admin/maintenance/recalculate-scores`


## Notes sur cette version
- L'admin peut maintenant modifier son propre email, son nom et son mot de passe depuis **Mon compte** dans le dashboard admin.
- Les challenges sont dans MongoDB. Pour éviter une base vide quand tu changes de dossier/version, le `docker-compose.yml` utilise maintenant un volume Docker paramétrable, fixé par défaut à `cyberctf_mongo_data` via `MONGO_VOLUME_NAME`.
- Les fichiers des challenges restent dans `backend/uploads/`.

## Si tes anciens challenges n'apparaissent pas
Cela veut dire que ton ancienne instance utilisait probablement **un autre volume MongoDB** ou **une autre base**. Les données n'étaient pas dans le zip, parce que Mongo garde ça dans son volume. Dans ce cas :

1. Liste les volumes Docker existants :
```bash
docker volume ls
```
2. Repère l'ancien volume Mongo lié à ton ancienne version.
3. Réutilise ce volume en mettant son nom dans `MONGO_VOLUME_NAME`, ou copie son contenu vers `cyberctf_mongo_data`.

Exemple rapide pour réutiliser directement l'ancien volume dans `.env` :
```env
MONGO_VOLUME_NAME=nom_de_ton_ancien_volume
```

Exemple de copie entre deux volumes Docker :
```bash
docker run --rm   -v ancien_volume_mongo:/from   -v cyberctf_mongo_data:/to   alpine sh -c "cd /from && cp -av . /to/"
```

Ensuite relance :
```bash
docker compose down
docker compose up --build -d
```
