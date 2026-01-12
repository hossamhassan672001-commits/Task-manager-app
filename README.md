# Task Harbor

Simple task management app with a NodeJS + MySQL backend and a Vue 3 + Quasar (CDN) frontend.

## Features
- Add, edit, and delete tasks.
- Task status tracking (open, in progress, done).
- Loading states and error banners.
- Clean, responsive UI.

## Project structure
- `backend/` NodeJS API (Express + MySQL)
- `frontend/` Vue 3 + Quasar app (single-page `index.html`)
- `db/schema.sql` MySQL schema

## Setup

### 1) Database
```bash
mysql -u root -p < db/schema.sql
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
cd frontend
python3 -m http.server 5173
```
Then open `http://localhost:5173` in a browser.

## API
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

## Notes
- If you serve the frontend from a different port, update `CORS_ORIGIN` in `backend/.env`.
- The frontend points to `http://localhost:4000/api` by default. Update it in `frontend/index.html` if needed.
