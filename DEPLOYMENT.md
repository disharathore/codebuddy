# CodeBuddy Deployment Guide (Recruiter Safe)

This setup deploys:
- Backend on Render
- Frontend on Vercel

## 1. Backend deploy on Render

1. Push this repo to GitHub.
2. In Render, create a new Web Service from your repo.
3. Render auto-detects configuration from render.yaml at project root.
4. Set these environment variables in Render dashboard:
  - GEMINI_API_KEY = your real key
  - GEMINI_MODEL = gemini-1.5-flash
   - CORS_ORIGINS = https://your-frontend-domain.vercel.app
5. Deploy and wait for green health.
6. Verify backend URLs:
   - /health/live
   - /health/ready
   - /api/problems

## 2. Frontend deploy on Vercel

1. In Vercel, import the same repo.
2. Set Root Directory to frontend.
3. Framework preset: Vite.
4. Build command: npm run build
5. Output directory: dist
6. Add environment variable:
   - VITE_API_BASE_URL = https://your-render-backend.onrender.com/api
7. Deploy.

The frontend has vercel.json rewrite support for React routes.

## 3. Post-deploy verification (must pass before resume)

Run these checks in order:

1. Backend liveness returns alive.
2. Backend readiness returns ready.
3. Frontend loads with no blank screen.
4. Problems list renders.
5. Open one problem and run tests.
6. Request Level 1 hint and confirm text streams.
7. Open analytics page and confirm no crash.

## 4. Recruiter smoke test command (local baseline)

Before each deploy, run:

./run-demo.sh
./recruiter-smoke-test.sh
./stop-demo.sh

All checks should pass.

## 5. Common production failures and fixes

- 403/CORS issue:
  Ensure CORS_ORIGINS exactly matches deployed frontend domain.

- Hints fail:
  Verify GEMINI_API_KEY exists in Render and key is active.

- Frontend loads but API fails:
  Verify VITE_API_BASE_URL points to backend /api URL.

- React route refresh gives 404:
  Ensure frontend/vercel.json exists with rewrite to index.html.
