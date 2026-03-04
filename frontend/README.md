# CTF Platform Frontend — Next.js

Frontend Next.js connecté à une API Node.js + Express + MongoDB.

## Fonctionnalités

- Login / Register avec JWT
- Dashboard Admin
  - Créer / modifier / supprimer des challenges
  - Upload réel de fichiers de challenge
  - Lister / modifier / supprimer des utilisateurs
- Dashboard Participant
  - Voir les challenges
  - Soumettre une flag
  - Voir son score, ses solves, ses first blood
  - Leaderboard persistant
- UI moderne
  - Glassmorphism
  - Curseur lumineux
  - Loader
  - Toasts
  - Skeletons

## Installation

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

## Variable d'environnement

```bash
NEXT_PUBLIC_API_URL=http://192.168.1.100:5000
```

## Endpoints backend attendus

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Participant
- `GET /api/challenges`
- `POST /api/challenges/:id/submit`
- `GET /api/profile/me`
- `PATCH /api/profile/me`
- `GET /api/leaderboard`

### Admin
- `GET /api/admin/challenges`
- `POST /api/admin/challenges`
- `PATCH /api/admin/challenges/:id`
- `DELETE /api/admin/challenges/:id`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`

## Notes

- Le token JWT est stocké côté navigateur dans `localStorage`.
- Si ton backend renvoie des noms de champs légèrement différents, adapte `lib/api.js`.
- Les uploads utilisent `multipart/form-data` avec le champ `files`.

## Structure

- `app/` : pages Next.js (App Router)
- `components/` : composants UI
- `lib/` : helpers API + auth

