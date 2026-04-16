# CodeBuddy — Complete Setup, Architecture & AI Prompt Guide

---

## PART 1 — FOLDER STRUCTURE (after unzip)

```
codebuddy/
├── backend/
│   ├── db/
│   │   └── database.js          ← SQLite engine (sql.js), schema, seed data
│   ├── routes/
│   │   ├── problems.js          ← GET problems list + single problem
│   │   ├── sessions.js          ← POST/PATCH/GET sessions
│   │   ├── hints.js             ← POST hint → streams Groq API response (SSE)
│   │   ├── execute.js           ← POST code → runs Python sandbox + test runner
│   │   └── analytics.js         ← GET dashboard data
│   ├── server.js                ← Express app, routes, rate limiters
│   ├── package.json             ← Backend dependencies
│   ├── .env.example             ← Template for your API key
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx       ← Navbar + page wrapper
│   │   │   ├── HintPanel.jsx    ← 3-level hint ladder UI + streaming render
│   │   │   ├── TestResults.jsx  ← Test case pass/fail display
│   │   │   └── SolvedModal.jsx  ← Confetti modal on problem solve
│   │   ├── pages/
│   │   │   ├── HomePage.jsx     ← Landing page
│   │   │   ├── ProblemsPage.jsx ← Problem list with filters
│   │   │   ├── ProblemPage.jsx  ← Main coding workspace (Monaco editor)
│   │   │   └── AnalyticsPage.jsx← Dashboard with charts
│   │   ├── utils/
│   │   │   └── api.js           ← All API calls + SSE streaming helper
│   │   ├── App.jsx              ← Routes
│   │   ├── main.jsx             ← React entry point
│   │   └── index.css            ← Tailwind + custom CSS
│   ├── index.html
│   ├── vite.config.js           ← Vite + proxy to backend
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json             ← Frontend dependencies
│   └── .gitignore
│
├── README.md
└── SETUP_AND_ARCHITECTURE.md   ← This file
```

---

## PART 2 — STEP BY STEP SETUP IN VS CODE

### Prerequisites (install these first)

| Tool | How to check | Download |
|------|-------------|---------|
| Node.js v18+ | `node --version` | nodejs.org |
| npm | `npm --version` | comes with Node |
| Python 3 | `python3 --version` | python.org |
| VS Code | open it | code.visualstudio.com |

---

### Step 1 — Open the project in VS Code

1. Unzip the downloaded `codebuddy.zip`
2. Open VS Code
3. Go to **File → Open Folder** → select the `codebuddy` folder
4. You should see `backend/` and `frontend/` in the sidebar

---

### Step 2 — Get your Groq API Key

1. Go to **https://console.groq.com**
2. Sign up or log in
3. Click **API Keys** in the left sidebar
4. Click **+ Create Key**
5. Copy the key — it starts with `gsk_...`
6. Keep this tab open, you'll need it in Step 3

> ⚠️ The key is shown only once. If you lose it, create a new one.

---

### Step 3 — Create the .env file (CRITICAL)

In VS Code, open a **Terminal** (`` Ctrl+` `` or **Terminal → New Terminal**)

```bash
cd backend
cp .env.example .env
```

Now open `backend/.env` in VS Code and paste your key:

```
GROQ_API_KEY=gsk_YOUR-ACTUAL-KEY-HERE
GROQ_MODEL=llama-3.1-8b-instant
PORT=3001
NODE_ENV=development
```

> ⚠️ `.env` must be inside the `backend/` folder, NOT the root folder.
> ⚠️ Never commit `.env` to GitHub — it's already in `.gitignore`.

---

### Step 4 — Install backend dependencies

Still in the terminal (make sure you're in `backend/`):

```bash
# You should see: codebuddy/backend>
npm install
```

This installs: `express`, `sql.js`, `cors`, `dotenv`, `express-rate-limit`, `uuid`, `nodemon`

Wait for it to finish. You'll see `added N packages`.

---

### Step 5 — Start the backend server

```bash
node server.js
```

You should see:
```
✅ Seeded 6 problems
✅ Database ready
🚀 CodeBuddy API → http://localhost:3001
📊 Health check  → http://localhost:3001/health
🔑 Groq key      → ✅ configured
```

If you see `❌ MISSING` next to the key, your `.env` is wrong — re-check Step 3.

**Verify it works:**
Open your browser and go to: `http://localhost:3001/health`
You should see: `{"status":"ok","time":"..."}`

---

### Step 6 — Install frontend dependencies

Open a **second terminal** in VS Code (click the `+` button in terminal panel):

```bash
cd frontend
npm install
```

This installs: `react`, `react-dom`, `@monaco-editor/react`, `framer-motion`, `react-router-dom`, `axios`, `react-hot-toast`, `react-markdown`, `lucide-react`, `tailwindcss`, `vite`

---

### Step 7 — Start the frontend

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in ~300ms
  ➜  Local:   http://localhost:5173/
```

---

### Step 8 — Open the app

Go to **http://localhost:5173** in your browser.

You'll see the CodeBuddy landing page. From here:
- Click **Browse Problems** to see the 6 problems
- Click any problem to open the coding workspace
- Write some code, click **Run Tests**
- Get stuck → click the **Hints** tab → click **Level 1**
- Watch Groq stream a hint in real-time
- Solve the problem → confetti!
- Visit **/analytics** to see your session data

---

### Stopping the app

- In Terminal 1 (backend): press `Ctrl+C`
- In Terminal 2 (frontend): press `Ctrl+C`

---

### Running again later

Every time you come back:
```bash
# Terminal 1
cd backend && node server.js

# Terminal 2
cd frontend && npm run dev
```

---

## PART 3 — WHAT IS sql.js AND WHY WE USE IT

### What is SQLite?
SQLite is a lightweight database stored as a single file (`.db`). No separate database server needed — it runs inside your Node.js process.

### What is sql.js?
`sql.js` is SQLite compiled to pure JavaScript (WebAssembly). It means:
- **No native build required** — works on any OS without compiling C code
- **No installation pain** — just `npm install sql.js`
- We originally used `better-sqlite3` which is faster, but requires native compilation (fails without Python/C build tools on many machines)

### How our database works
The database file is created automatically at `backend/db/codebuddy.db` when you first start the server.

**5 tables:**

| Table | What it stores |
|-------|---------------|
| `problems` | All 6 coding problems (title, description, starter code, test cases) |
| `sessions` | Every time someone opens a problem (tracks time, hints used, solved or not) |
| `hint_requests` | Every AI hint requested (level, the code at the time, AI response, speed) |
| `code_runs` | Every time code is run (passed/failed tests, output, errors) |
| `analytics` | Event log (session_start, problem_solved, hint_requested) |

**The database auto-persists every 10 seconds** and on server shutdown. No manual saves needed.

**To reset the database** (clear all data, re-seed problems fresh):
```bash
# In backend/ folder:
rm db/codebuddy.db
node server.js   # it will re-create and re-seed automatically
```

---

## PART 4 — THE .env FILE EXPLAINED

The `.env` file stores secret values that should never go into your code.

```
GROQ_API_KEY=gsk_...                  # Your Groq API key (REQUIRED)
GROQ_MODEL=llama-3.1-8b-instant       # Optional model override
PORT=3001                             # Backend port (optional, default 3001)
NODE_ENV=development                  # Environment mode (optional)
```

**Why can't I just paste the key in the code?**
- If you push to GitHub, the key becomes public and should be rotated immediately
- `.env` is in `.gitignore` so it never gets committed

**What if I get a 401 error from Groq?**
Your API key is wrong or expired. Get a new one at console.groq.com.

**What if hints are very slow?**
That's normal — model response latency can take 1-3 seconds to start. Streaming makes it feel faster.

---

## PART 5 — THE AI PROMPT (What We Built + Architecture)

*This is a complete prompt you can use to explain the project, continue building it, or share it with another AI.*

---

**CODEBUDDY — PROJECT SUMMARY PROMPT**

```
I am building CodeBuddy, an AI-powered pair programmer for CS students.
It is designed as a resume project targeting the Microsoft Explore Internship
(which rotates between SDE and PM roles). The core differentiator is a
3-level progressive hint ladder powered by the Groq API — students get
conceptual nudges, not full answers.

CORE PRODUCT IDEA:
When a student gets stuck on a coding problem, instead of giving them the
solution, CodeBuddy provides a 3-level hint ladder:
- Level 1 (Conceptual): What mental model or concept to think about — no
  algorithm names, no code, just a real-world analogy + 1 guiding question.
- Level 2 (Pseudocode): Step-by-step logic in plain English — algorithm
  named, structure clear, but no actual code syntax.
- Level 3 (Near-Code): Almost complete Python code with 2-3 strategic
  blanks marked as `# ???` — student fills in the core logic.

SEQUENTIAL UNLOCK LOGIC: Level 2 is greyed out and unclickable until the
student has used Level 1. Level 3 is locked until Level 2 is used. This
preserves the pedagogical intent — you cannot skip to spoilers.

TECH STACK:
- Frontend: React 18 + Vite, Tailwind CSS, Framer Motion
- Editor: @monaco-editor/react (same engine as VS Code)
- Backend: Node.js + Express (ES Modules)
- Database: SQLite via sql.js (pure JS, no native build)
- AI: Groq chat completions API using an OpenAI-compatible streaming endpoint
- Streaming: Server-Sent Events (SSE) — hints stream token by token
- Code execution: Python3 subprocess sandbox with blocked imports

ARCHITECTURE:
The backend is a REST API (Express) with 5 route groups:
1. /api/problems — Returns problem list/detail. Solution code is NEVER sent
   to the client. Test cases are sent as JSON.
2. /api/sessions — Creates a session when a user opens a problem. Tracks
   time spent, hints used, max hint level reached, whether solved.
3. /api/hints — Accepts session_id + hint_level + user_code. Calls Groq
   API with a carefully engineered system prompt per level. Streams the
   response as SSE (Server-Sent Events). Saves hint to DB after streaming.
4. /api/execute — Accepts session_id + code + run_tests boolean. If
   run_tests=true, wraps user code in a test runner that calls each test
   case and returns JSON pass/fail results. Runs Python in a subprocess
   with a 5-second timeout. Blocks dangerous imports (os, sys, eval, exec).
5. /api/analytics — Returns aggregate stats: hint level distribution, solve
   rates per max hint level, recent activity, problem performance table.

DATABASE SCHEMA (sql.js / SQLite):
- problems: id, title, slug, difficulty, language, category, description,
  starter_code, solution_code, test_cases (JSON), tags (JSON)
- sessions: id, problem_id, user_fingerprint, started_at, completed_at,
  solved, hints_used, max_hint_level, time_spent_seconds, final_code
- hint_requests: id, session_id, problem_id, hint_level, user_code,
  hint_response, requested_at, response_time_ms
- code_runs: id, session_id, code, output, error, passed_tests, total_tests
- analytics: id, event, session_id, problem_id, metadata, created_at

USER IDENTITY: Pseudo-anonymous fingerprint stored in localStorage
(format: fp_<random><timestamp>). No login required.

PROBLEMS SEEDED (6 total):
1. Two Sum (beginner, Arrays) — hash map approach
2. FizzBuzz (beginner, Loops) — modulo logic
3. Valid Parentheses (intermediate, Stacks) — stack-based bracket matching
4. Binary Search (beginner, Searching) — two-pointer O(log n)
5. Maximum Subarray (intermediate, Dynamic Programming) — Kadane's algorithm
6. Reverse a String (beginner, Strings) — in-place two-pointer swap

FRONTEND PAGES:
- / (HomePage): Landing with hint ladder explanation, stats, features
- /problems (ProblemsPage): Filterable list by difficulty + category
- /problems/:slug (ProblemPage): 3-panel workspace:
  Left panel (tabs): Description | Hints | Output
  Center: Monaco editor with custom dark theme
  Top toolbar: Problem title, timer, Run button, Run Tests button
- /analytics (AnalyticsPage): Dashboard with bar charts, solve rates,
  hint efficiency table, recent activity

RESUME METRICS THIS PROJECT DEMONSTRATES:
- Built an AI tutoring system that serves 3-level adaptive hints via live
  Groq API streaming, with sequential unlock logic that preserves learning
- Integrated Monaco Editor (VS Code engine) with Python subprocess sandbox
  running student code against real test cases with import blocking
- Designed 5-table SQLite schema tracking sessions, hints, code runs, and
  analytics; key metric: % who solved without reaching Level 3 hints
- Built product artifacts alongside code: hint system design, success metrics,
  analytics dashboard — demonstrating PM + SDE hybrid thinking for
  Microsoft Explore Internship (which rotates between both roles)
```

---

## PART 6 — KNOWN ERRORS AND FIXES

These are all errors you might hit when running the project, and exactly how to fix them.

---

### ERROR 1: "Groq key → ❌ MISSING"
**When:** Backend starts but shows key missing
**Cause:** `.env` file doesn't exist or has wrong format
**Fix:**
```bash
cd backend
cp .env.example .env
# Then open .env and paste your real key
```
Make sure there are NO spaces around the `=`:
```
GROQ_API_KEY=gsk_yourkey   ✅ correct
GROQ_API_KEY = gsk_yourkey  ❌ wrong (spaces)
```

---

### ERROR 2: "Cannot find module 'sql.js'"
**When:** Running `node server.js` fails immediately
**Cause:** `npm install` wasn't run in the backend folder
**Fix:**
```bash
cd backend
npm install
```

---

### ERROR 3: "python3: command not found" or tests never pass
**When:** Clicking "Run Tests" gives an execution error
**Cause:** Python 3 is not installed on your system
**Fix (Windows):**
1. Go to python.org → Downloads → Python 3.x.x
2. Run installer → CHECK "Add Python to PATH"
3. Restart VS Code
4. Test: open terminal → `python3 --version`

**Fix (Mac):**
```bash
brew install python3
# or: xcode-select --install
```

**Fix (Linux):**
```bash
sudo apt install python3
```

---

### ERROR 4: Port 3001 already in use
**When:** `node server.js` says `EADDRINUSE`
**Cause:** Another process is using port 3001
**Fix:**
```bash
# Mac/Linux — kill whatever is on 3001:
lsof -ti:3001 | xargs kill -9

# Or just change the port in .env:
PORT=3002
```

---

### ERROR 5: CORS error in browser console
**When:** Frontend loads but API calls fail with CORS error
**Cause:** Backend isn't running, or frontend is on wrong port
**Fix:**
- Make sure backend is running (`node server.js`)
- Make sure frontend is on port 5173 (`npm run dev`)
- The Vite proxy in `vite.config.js` handles `/api` → `localhost:3001`

---

### ERROR 6: Monaco editor blank / not loading
**When:** The code editor area is white/empty
**Cause:** Monaco uses WebAssembly workers. Some browsers block them.
**Fix:**
- Use Chrome or Firefox (not Safari)
- Wait 3-5 seconds — Monaco loads lazily
- Hard refresh: `Ctrl+Shift+R`

---

### ERROR 7: Hints stream starts then stops / cuts off
**When:** Hint text starts appearing then freezes
**Cause:** Groq API network issue or rate limit
**Fix:**
- Check your Groq account status at console.groq.com
- Try again after 30 seconds (rate limit: 10 hint requests per minute)
- Check your internet connection

---

### ERROR 8: "Session not started yet" toast when requesting hint
**When:** Clicking a hint level shows "Session not started"
**Cause:** Session creation failed on page load (backend was down)
**Fix:**
- Refresh the problem page
- Make sure backend is still running in Terminal 1

---

### ERROR 9: Database not persisting between restarts
**When:** Analytics show 0 after restarting the server
**Cause:** sql.js persists every 10 seconds — if server was force-killed
**Fix:**
- Always stop with `Ctrl+C` (not force-closing the terminal)
- The DB saves on SIGINT/SIGTERM signals
- If data is lost, it means the server crashed — just use it again, data accumulates

---

### ERROR 10: `npm install` fails with "node-gyp" errors
**When:** Installing dependencies fails with native build errors
**Cause:** Some package tries to build C++ bindings (shouldn't happen with sql.js)
**Fix:**
```bash
# Make sure you're in the RIGHT folder (backend or frontend):
pwd
# Should show: .../codebuddy/backend  or  .../codebuddy/frontend

# Clear and retry:
rm -rf node_modules
npm install
```

---

## PART 7 — VS CODE EXTENSIONS RECOMMENDED

Install these in VS Code for the best experience:

| Extension | Why |
|-----------|-----|
| **ES7+ React/Redux/React-Native snippets** | Fast JSX shortcuts |
| **Tailwind CSS IntelliSense** | Autocomplete for Tailwind classes |
| **Prettier** | Auto-format code on save |
| **ESLint** | Catch JS errors as you type |
| **Python** (Microsoft) | Python syntax highlighting |
| **REST Client** | Test API endpoints from VS Code |
| **GitLens** | Better Git history |

To install: press `Ctrl+Shift+X` → search extension name → Install

---

## PART 8 — POTENTIAL ADD-ONS (Future Features)

These are extensions you could build to make the project even stronger for resume:

| Feature | Impact | Effort |
|---------|--------|--------|
| User auth (simple username only) | Persistent history across devices | Medium |
| Add JavaScript problems | More problem variety | Low |
| Leaderboard (solve time, hint level) | Engagement + data | Medium |
| Streak tracking (daily solve goals) | Retention metric | Low |
| Problem difficulty voting | PM feature + data | Low |
| Share solve URL | Viral loop | Low |
| Dark/light mode toggle | Polish | Low |
| Add more problems (15+) | More content | Low |
| Deploy to Vercel + Railway | Real URL for portfolio | Medium |

---

## QUICK REFERENCE COMMANDS

```bash
# Start backend
cd backend && node server.js

# Start frontend
cd frontend && npm run dev

# Reset database (fresh start)
cd backend && rm db/codebuddy.db && node server.js

# Check if backend is alive
curl http://localhost:3001/health

# Check all problems in DB
curl http://localhost:3001/api/problems

# Check analytics
curl http://localhost:3001/api/analytics/dashboard

# Install backend deps
cd backend && npm install

# Install frontend deps
cd frontend && npm install
```
