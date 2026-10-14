# Task Manager — Beginner Full-Stack Project

This project follows the uploaded **Full-Stack Development — Technology Learning Scope & Mini Project** guide.

## Included
- Next.js App Router + React + TypeScript + Tailwind CSS
- Registration form (name, email, password)
- Login and logout
- Frontend validation with React Hook Form + Zod
- Fastify + TypeScript REST API
- Password hashing with bcrypt
- JWT stored in an HttpOnly cookie
- PostgreSQL + Prisma ORM
- Protected `/dashboard` page
- Basic task create, list, update status, and delete API/UI
- `.env.example`, `.gitignore`, and setup instructions

> This is a learning project, not a production-hardened deployment. For local development, the cookie is configured for HTTP. Set `COOKIE_SECURE=true` when serving the API over HTTPS in production.

## Requirements
1. Node.js 22 LTS (or a compatible recent Node.js release)
2. npm
3. PostgreSQL installed and running
4. Git (recommended, required by your learning guide)
5. VS Code

Check Node and npm:
```bash
node -v
npm -v
```

## Folder structure
```text
task-manager-auth-project/
  frontend/    # Next.js website
  backend/     # Fastify API + Prisma + PostgreSQL
```

## Step 1 — Create the database
Open PostgreSQL (pgAdmin or psql) and create a database named:
```sql
CREATE DATABASE task_manager;
```
If it already exists, do not create it again.

## Step 2 — Configure backend environment
Open a terminal in the `backend` folder:
```bash
cd backend
```
Copy `.env.example` to `.env` on Windows Command Prompt:
```cmd
copy .env.example .env
```
Edit `backend/.env` and set your PostgreSQL username/password. Example:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/task_manager?schema=public"
JWT_SECRET="replace-this-with-a-long-random-secret-at-least-32-characters"
PORT=4000
FRONTEND_ORIGIN="http://localhost:3000"
COOKIE_SECURE=false
```
Replace `YOUR_PASSWORD` with your actual PostgreSQL password. Do not share or commit `.env`.

Install and initialize:
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```
Keep this terminal running. The API health endpoint is:
`http://localhost:4000/health`

Expected response:
```json
{"status":"ok"}
```

If Prisma asks to create a migration, allow it. If `prisma migrate dev` reports a database connection error, check that PostgreSQL is running, the database exists, and `DATABASE_URL` has the correct credentials.

## Step 3 — Configure frontend
Open a **second terminal** in the `frontend` folder:
```bash
cd frontend
```
Install dependencies and start Next.js:
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Step 4 — Try it
1. Select **Create account**.
2. Register with your name, email, and password (minimum 8 characters).
3. You should be taken to the dashboard.
4. Add a task, mark it done/undone, or delete it.
5. Click **Logout**. The dashboard should redirect to login.
6. Log in again with the same email/password.

## How the authentication works
1. The browser sends registration/login data to Fastify.
2. Zod validates the input.
3. The server hashes passwords before saving them.
4. Login checks the password hash and creates a JWT.
5. The JWT is placed in an HttpOnly cookie; frontend JavaScript cannot read it.
6. Protected API routes verify the cookie and only return tasks owned by that user.

## Common problems
- **ENOENT / package.json not found:** You are in the wrong directory. Run `dir` and ensure you are inside `frontend` or `backend` before `npm install`.
- **EADDRINUSE:** Port 3000 or 4000 is already in use. Stop the old server with `Ctrl+C`, or change the relevant port.
- **Database authentication failed:** Update `DATABASE_URL` in `backend/.env`.
- **CORS/network error:** Start the backend on port 4000 and frontend on port 3000. Keep `FRONTEND_ORIGIN=http://localhost:3000`.
- **Prisma client missing:** Run `npx prisma generate` inside `backend`.
- **Login does not persist:** Ensure frontend fetch calls use `credentials: "include"` and do not open the site using a different hostname (use `localhost` consistently).

## GitHub (required by your guide)
Create an empty repository on GitHub. From this project root:
```bash
git init
git add .
git commit -m "Initial Task Manager auth project"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/task-manager.git
git push -u origin main
```
Do not commit `.env` or secrets. `.gitignore` excludes them.

## API endpoints
- `POST /api/auth/register` — create user
- `POST /api/auth/login` — login and set cookie
- `POST /api/auth/logout` — clear cookie
- `GET /api/auth/me` — current user
- `GET /api/tasks` — list current user's tasks
- `GET /api/tasks/:id` — get one owned task
- `POST /api/tasks` — create task
- `PATCH /api/tasks/:id` — update task
- `DELETE /api/tasks/:id` — delete task

All task endpoints require a valid login.
