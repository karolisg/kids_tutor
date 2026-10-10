# Kids Tutor

A parent makes arithmetic sets. A child solves them one at a time. The server writes the problems and checks the answers.

## Run

```bash
docker compose up --build
```

Open http://localhost:3000.

Compose starts the app with a local SQLite file on a Docker volume. No other service is required. Copy `.env.example` to `.env` if you want your own `SESSION_SECRET`. If that file is absent, Compose uses a dev default.

## Flow

1. Create a parent account with an email and password.
2. Add a child: a display name and a 4 to 6 digit PIN.
3. Generate a set: operation (add, subtract, multiply, divide, or mixed), difficulty, and how many problems.
4. Open Practice, enter the child's name and PIN, and start the set.
5. Solve one problem at a time. The score appears at the end.
6. The parent dashboard lists each child's scores.

Easy and medium subtraction stay non-negative. Division comes out evenly.

## Tests

```bash
npm install
npm test
```

## Later deployment

The same Hono routes are what a Cloudflare Worker would serve. D1 can run the SQL files in `migrations/`. The Node entry (`src/index.ts`) and the `node:sqlite` driver (`src/db/sqlite.ts`) stay out of a future Worker bundle. This version does not deploy to Workers.
