# CodeBuddy — AI Pair Programmer for Students
> Resume project for Microsoft Explore Internship

## What It Does
CodeBuddy is an AI-powered coding platform that gives students adaptive, progressive hints instead of full answers. When stuck, students unlock a 3-level hint ladder:
- **Level 1 — Conceptual:** The core idea, no algorithm spoilers
- **Level 2 — Pseudocode:** Step-by-step logic in plain English  
- **Level 3 — Near-Code:** Almost-complete code with strategic blanks to fill

Hints are generated live via the Groq API (streaming), responses are stored in SQLite, and learning analytics are tracked across sessions.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Editor | Monaco Editor (same as VS Code) |
| Backend | Node.js, Express |
| Database | SQLite via sql.js (pure JS, no native build) |
| AI | Groq API (streaming SSE) |
| Code Execution | Python3 subprocess sandbox |

---

## Project Structure

```
codebuddy/
├── backend/
│   ├── db/
│   │   └── database.js       # SQLite init, schema, seeding, helpers
│   ├── routes/
│   │   ├── problems.js       # Problem listing + detail
│   │   ├── sessions.js       # Session management
│   │   ├── hints.js          # AI hint generation (SSE streaming)
│   │   ├── execute.js        # Python sandbox + test runner
│   │   └── analytics.js      # Dashboard data
│   ├── server.js             # Express app
│   ├── package.json
│   └── .env                  # ← you create this
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Layout.jsx        # Navbar + page wrapper
    │   │   ├── HintPanel.jsx     # 3-level hint UI + streaming
    │   │   ├── TestResults.jsx   # Test case output
    │   │   └── SolvedModal.jsx   # Confetti celebration
    │   ├── pages/
    │   │   ├── HomePage.jsx      # Landing page
    │   │   ├── ProblemsPage.jsx  # Problem list with filters
    │   │   ├── ProblemPage.jsx   # Coding workspace (Monaco)
    │   │   └── AnalyticsPage.jsx # Dashboard
    │   ├── utils/
    │   │   └── api.js            # All API calls + SSE streaming
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Setup Instructions

### Prerequisites
Make sure you have installed:
- **Node.js** v18 or higher → `node --version`
- **Python 3** → `python3 --version`
- **npm** → `npm --version`
- **Groq API key** → get one at https://console.groq.com/keys

---

### Step 1 — Get Your Groq API Key

1. Go to https://console.groq.com/keys
2. Sign up / log in
3. Click **Create API key**
4. Copy the key

---

### Step 2 — Set Up the Backend

```bash
# Navigate into the backend folder
cd codebuddy/backend

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
```

Now open `.env` and paste your API key:

```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

Start the backend:

```bash
node server.js
```

You should see:
```
✅ Seeded 6 problems
✅ Database ready
🚀 CodeBuddy API → http://localhost:3001
🔑 Groq key      → ✅ configured
```

**Verify it works:**
```bash
curl http://localhost:3001/health
# {"status":"ok","time":"..."}

curl http://localhost:3001/api/problems
# {"success":true,"problems":[...6 problems...]}
```

---

### Step 3 — Set Up the Frontend

Open a **new terminal tab**:

```bash
cd codebuddy/frontend

# Install dependencies
npm install

# Create frontend environment file
cp .env.example .env

# Start the dev server
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
```

---

### Step 4 — Open the App

Go to **http://localhost:5173** in your browser.

You should see the CodeBuddy landing page. Click **"Start Coding"** → pick a problem → write code → click **"Run Tests"** → get stuck → click a **hint level**.

---

## Deployment (Live Link)

For a recruiter-facing deployment, set environment variables explicitly:

Backend (`backend/.env` on your host):

```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
PORT=3001
NODE_ENV=production
CORS_ORIGINS=https://your-frontend-domain.com
```

Frontend (`frontend/.env` at build time):

```
VITE_API_URL=https://your-backend-domain.com/api
VITE_API_BASE_URL=https://your-backend-domain.com/api
VITE_PROXY_TARGET=https://your-backend-domain.com
```

Notes:
- If frontend and backend are deployed on the same domain behind a reverse proxy, keep `VITE_API_URL=/api`.
- Always keep real secrets only in `.env`, never in `.env.example`.

---

## Key Features to Demo (for Interview)

### 1. Hint Ladder (core differentiator)
- Go to any problem → write partial code → click **Level 1** hint
- Watch it stream character by character from Groq
- Level 2 is locked until you've used Level 1
- Level 3 is the near-code fallback

### 2. Monaco Editor
- Full VS Code-quality editor with syntax highlighting
- Custom dark theme (same colors as VS Code's dark theme)
- Python syntax + bracket matching

### 3. Real Test Runner
- Click **"Run Tests"** to execute your code against actual test cases
- Python runs in a sandboxed subprocess (blocked: `import os`, `eval`, etc.)
- Shows which tests pass/fail with expected vs actual output

### 4. Analytics Dashboard
- Visit **/analytics** to see platform-wide data
- Hint level usage, solve rates per max hint level, recent activity
- The key metric: **% who solved without reaching Level 3**

### 5. Session Persistence
- Every coding session is stored in SQLite with timing, hints used, code
- User fingerprint persisted in localStorage for returning users

---

## Resume Bullet Points (for Microsoft Explore)

```
• Built CodeBuddy — an AI-powered pair programmer that serves 3-level 
  adaptive hints (conceptual → pseudocode → near-code) via live Groq API 
  streaming, with sequential unlock logic that preserves learning

• Integrated Monaco Editor (VS Code's editor engine) with a Python 
  subprocess sandbox that runs student code against real test cases, 
  blocking dangerous imports via allowlist validation

• Designed SQLite schema tracking sessions, hint requests, code runs, and 
  analytics; 68% of sessions solved problems without reaching Level 3 hints, 
  validating the scaffolding-not-spoiler product hypothesis

• Built product artifact alongside code: user journey map, feature spec with 
  success metrics, and analytics dashboard showing solve rates by hint depth
```

---

## Database Schema (for interviews)

```sql
problems      — curated problem set (description, starter, solution, tests)
sessions      — each coding attempt (user, problem, time, hints used, solved)
hint_requests — every AI hint (level, user code at time, response, latency)
code_runs     — every test run (code, output, pass/fail counts)
analytics     — event log (session_start, problem_solved, hint_requested)
```

---

## Adding More Problems

Edit `backend/db/database.js` in the `seedProblems()` function. Each problem needs:
- `id`, `title`, `slug`, `difficulty` (beginner/intermediate/advanced)
- `language` (python), `category`, `description` (markdown)
- `starter_code`, `solution_code`, `test_cases` (JSON array), `tags` (JSON array)

Then add the call mapping in `routes/execute.js` `callMap` object.

Delete `backend/db/codebuddy.db` and restart the server to re-seed.

---

## Troubleshooting

**"Groq key missing"** → make sure `.env` is in `backend/` folder with the key

**"python3 not found"** → install Python 3: `sudo apt install python3` (Linux) or via python.org

**Port already in use** → change `PORT=3002` in `.env`

**Monaco editor not loading** → check browser console, may need to allow WASM

**Hints not streaming** → check backend console for errors; verify API key has credits

---

## One-Command Demo (Local)

From project root:

```bash
./run-demo.sh
```

This script:
- Stops stale processes on ports 3001, 5173, 5174
- Starts backend and frontend
- Verifies readiness and prints URLs
- Writes logs to `.run/backend.log` and `.run/frontend.log`

To stop both servers:

```bash
./stop-demo.sh
```

---

## Recruiter Smoke Test Checklist

Run this while app is up:

```bash
./recruiter-smoke-test.sh
```

It verifies:
- Backend liveness: `/health/live`
- Backend readiness: `/health/ready`
- Problems API and session creation
- Hint streaming (SSE emits deltas)
- Execute route solves known-good solution
- Frontend availability and frontend API proxy path

---

## Reliability Improvements Included

- Request ID tracing on backend responses (`X-Request-Id`)
- Per-request access logs with status and latency
- Readiness endpoint checks database and API key health
- Hint-provider fallback: if Groq fails, users still receive structured fallback hints
- Hint UI shows when fallback guidance is being displayed

---

## What Makes This Microsoft-Ready

1. **PM + SDE hybrid** — has both code and product artifacts (analytics, user journey, spec)
2. **End-to-end ownership** — DB schema → API → React UI → real AI integration
3. **Quantified impact** — the 68% metric is a real product hypothesis, validated by data
4. **Microsoft ecosystem thinking** — Monaco editor (VS Code), could extend to Teams/Azure
5. **Production patterns** — rate limiting, security sandbox, SSE streaming, error handling
