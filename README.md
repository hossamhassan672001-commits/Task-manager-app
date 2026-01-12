# Task Harbor

Simple task management app with a NodeJS + MySQL backend and a Vue 3 + Quasar (Vite) frontend.

## Features
- Add, edit, and delete tasks.
- Task status tracking (open, in progress, done).
- Loading states and error banners.
- Authentication (register/login) with JWT.
- Clean, responsive UI.

## Project structure
- `backend/` NodeJS API (Express + MySQL)
- `frontend/` Vue 3 + Quasar app (Vite)
- `db/schema.sql` MySQL schema

## Setup (step by step)

### 1) Database
```bash
mysql -u root -p < db/schema.sql
```
This will create the `users` and `tasks` tables. If you already had data, back it up before re-running.

### 2) Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Update `backend/.env`:
```
DB_HOST=localhost
DB_USER=taskapp
DB_PASSWORD=your_password
DB_NAME=task_manager
DB_PORT=3306
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=change_this_secret
```

If MariaDB uses socket auth for root, create a user:
```
sudo mysql
CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'taskapp123';
GRANT ALL PRIVILEGES ON task_manager.* TO 'taskapp'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Restart backend after editing `.env`.

### 3) Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Then open `http://localhost:5173` in a browser.

Update `frontend/.env` if your API URL changes:
```
VITE_API_BASE=http://localhost:4000/api
```

## Git setup (local only)
```bash
git init
git add .
git commit -m "Task manager app"
```

## API
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

## Notes
- If you serve the frontend from a different port, update `CORS_ORIGIN` in `backend/.env`.
- The frontend points to `http://localhost:4000/api` by default. Update it in `frontend/.env`.
- Set a strong `JWT_SECRET` in `backend/.env` for production use.
