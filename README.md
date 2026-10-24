# Full-Stack Prototype (Authenkixx Capstone)

Prototype only. By Ade Bintang. All data is dummy. No real UMKM data,
no customer data, no passwords, no automatic platform sync.

## What this repo covers

A decoupled Full-Stack prototype for centralized inventory:

- Backend: Express, API routes under `/api/v1/` (products, stock
  movements, insights, AI proxy).
- Frontend: Vite scaffold, Tailwind CSS (CDN in the prototype; install
  it properly for production), Axios networking, responsive layout.
- Mockup-first pages (simple, working pages, not just mockups):
  product list, product detail (with stock history), stock update,
  Gen AI chat panel, and a business summary page.

The main user is the shop owner only (single-user prototype; no
login system yet, listed as tomorrow's work if the team wants it).

## Backend

```bash
cd backend
npm install
npm start          # port 3001
npm run smoke      # smoke tests (verified: 8/8 pass, see below)
```

- Persistent storage (prototype): `backend/data/inventory.json` and
  `backend/data/ai_history.json`. The brief allows SQLite or a JSON
  file for the prototype; production can move to Neon/Postgres later.
- Schema validation: Joi (`backend/src/validation.js`). Invalid input
  returns HTTP 400 with a clear message and writes nothing.
- Success / failure / loading: every API response uses
  `{ status: "success", data }` or `{ status: "error", message }`;
  the frontend shows loading, success, and error states on every page.
- Gen AI access: the backend proxies AI chat
  (`POST /api/v1/ai/chat` -> `GENAI_SERVICE_URL`, default
  http://127.0.0.1:8000/chat). The frontend NEVER calls the Gen AI
  service directly. If Gen AI is down, the backend returns HTTP 502
  with a clear message instead of crashing.
- Gen AI history: every proxied chat is stored in
  `backend/data/ai_history.json` (message, intent, route, answer,
  timestamp only; no customer data).
- Business insights: `GET /api/v1/insights` computes totals and
  low-stock counts from the dummy inventory. Data Science dashboard
  outputs are integrated at this endpoint in the final version.

Smoke test results (verified by running `npm run smoke`):
8/8 pass: health, product list, product detail, unknown product 404,
invalid product 400, stock-below-zero 400, insights, AI chat
200-or-clear-502.

## Frontend

```bash
cd frontend
npm install
npm run dev       # Vite dev server on port 5173, /api proxied to port 3001
npm run build     # production build
```

- Axios is used for all networking (`frontend/src/api.js`).
- Set `VITE_API_BASE_URL` in `.env` if the backend is not on the
  Vite proxy; otherwise `/api` is proxied to `http://localhost:3001`.
- Responsive: product cards stack on phones, 2 columns on tablets,
  3 columns on desktops (see `frontend/src/style.css`).
- Design decisions (not just a generic template): dark header with a
  visible "(Data Contoh)" label on every page, availability badges
  (tersedia / menipis / habis), channel shown explicitly as a label
  (not sync), and a footer stating the prototype and dummy-data limits
  on every page.

## Deploy note (free tier, for the final version)

- Frontend: Netlify or Cloudflare Pages (free tier).
- Backend: Render (free tier).
- Database (production): Neon (free tier, Postgres).
- The prototype runs locally only; nothing in this repo is deployed,
  and no GitHub repo was created by this build (Ade creates repos
  manually, as with CV Lens AI).

## API contract

See `API_CONTRACT.md` in this folder (same contract in gen-ai/ and
data-science/). Endpoints, request/response formats, and error codes
are agreed across the three repos before integration.
