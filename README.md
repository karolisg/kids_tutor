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
5. Solve one problem at a time. A wrong answer says try again, and the correct answer waits until the set is finished.
6. Achievements track stars (one per correct answer) and badges. Each one is locked, in progress, or earned.
7. The parent dashboard lists each play session: when it started, the score, and the total time. Open a session to see every question, whether it was right or wrong, and how long it took.

Easy and medium subtraction stay non-negative. Division comes out evenly.

## Tests

```bash
npm install
npm test
```

## Later deployment

The same Hono routes are what a Cloudflare Worker would serve. D1 can run the SQL files in `migrations/`. The Node entry (`src/index.ts`) and the `node:sqlite` driver (`src/db/sqlite.ts`) stay out of a future Worker bundle. This version does not deploy to Workers.
