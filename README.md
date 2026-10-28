# calAI

[![CI](https://github.com/codinglucas/calAI/actions/workflows/ci.yml/badge.svg)](https://github.com/codinglucas/calAI/actions/workflows/ci.yml)

A mobile-first calorie tracker. Take a photo of a meal, a vision LLM (Claude) identifies the foods and estimates portions, calories and macros, you review and edit the result, and it's logged to your day.

**Photos are never stored.** The image is resized in the browser, sent to a server route, forwarded to Claude in memory, and discarded. Only the meal and its items (name, grams, kcal, protein, carbs, fat) are saved.

## Tech stack

| Layer      | Choice                                                                      |
| ---------- | --------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Cache Components) + TypeScript (strict)             |
| Styling    | Tailwind CSS v4                                                             |
| Auth + DB  | Supabase Auth (email/password, Google) and Postgres with row-level security |
| AI         | Anthropic Claude API (vision) via the official TypeScript SDK, server-only  |
| Validation | Zod, for form input and the model's JSON output                             |
| Hosting    | Vercel                                                                      |

## Architecture

```
Phone browser                       Next.js on Vercel                     External
─────────────                       ─────────────────                     ────────
 photo ─► resize to ≤1024px JPEG
          (canvas, in browser) ───► POST /api/analyze-meal ─────────────► Claude API
                                     image held in memory only,            (vision)
                                     never logged or written anywhere
 confirm screen ◄── items JSON ◄──── Zod-validated JSON ◄──────────────────┘
 (local photo preview,
  editable items)
        │ "Log meal"
        └─────────────────────────► Server Action ─────────────────────► Supabase Postgres
                                     validates with Zod                    meals + meal_items
                                                                           (RLS: own rows only)
```

- **Auth.** `@supabase/ssr` keeps the session in cookies. `proxy.ts` (Next 16's replacement for `middleware.ts`) refreshes the session on every request and redirects signed-out visitors to `/login`. Pages and actions also check the user themselves, so data access never relies on the proxy alone.
- **Data isolation.** Every table has row-level security. Users can only read and write their own `meals`. `meal_items` are authorized through their parent meal's `user_id`.
- **Days and time zones.** `eaten_at` is stored in UTC. Meals are grouped into days using the time zone saved in the user's profile, not UTC: `lib/dates.ts` turns "today in America/New_York" into a UTC range (DST-aware, using `Intl`), and the meal form's time is read as wall-clock time in that zone.
- **Atomic saves.** A meal and its items are written by the `create_meal` / `update_meal` Postgres functions in one transaction, so a failed item insert can't leave an empty meal. They run as the calling user, so RLS still applies.
- **Photo analysis.** `lib/ai/analyzeMeal.ts` holds the prompt, the Zod schema and the retry logic in one place. The schema is sent to the model as its structured-output format, so the reply is JSON in exactly that shape (`items` with name, grams, kcal, macros and a confidence level, plus `notes`). A second, stricter Zod pass rejects out-of-range values. If either check fails the call is retried once, and then the user gets a friendly error and a link to manual entry.
- **Swappable vision provider.** `AI_PROVIDER` chooses the model behind that prompt and schema. Each adapter in `lib/ai/providers/` turns the same request into one API call:
  - `anthropic` (default): Claude via the official SDK, model from `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`). If Claude declines a request, the API's server-side fallback retries it on another model within the same call.
  - `gemini`: Google Gemini's Interactions API over plain `fetch` (no extra package), model from `GEMINI_MODEL` (default `gemini-3.5-flash-lite`, which has free-tier quota on new AI Studio projects). Requests are sent with `store: false` so Google doesn't keep the interaction. On AI Studio's free tier, Google may use the content you send to improve its products; a billing-enabled key opts out.
- **Photo privacy.** The browser scales the photo to at most 1024px and re-encodes it as JPEG before upload. `/api/analyze-meal` checks the session, reads the file into memory, sends it to the vision model as base64 and returns the estimate. Nothing writes the image to disk, the database or storage, and it is never logged. The confirm screen shows a local preview from a blob URL that is released when you leave. Only the items you confirm with "Log meal" are saved, each marked `source: ai` with its confidence.
- **History.** `/history` loads the last 30 days of meals in one query (bounded by the user's day boundaries in UTC) and groups them by day in the profile's time zone (`lib/history.ts`), the same way Today does. Days with no meals still appear. Past days are compared with the _current_ goal, since goal changes aren't stored over time.
- **Settings.** The calorie goal and time zone are validated with Zod on the server (and by the database's check constraints). Changing the time zone regroups past meals by the new zone, since `eaten_at` is stored in UTC.
- **Installable.** `app/manifest.ts` and the icons in `public/icons/` let browsers install calAI to the home screen; it opens full screen on `/today`. The manifest is excluded from the auth proxy because browsers fetch it without cookies. There's no service worker: the app needs the network anyway, and install doesn't require one.
- **Secrets.** The Anthropic API key is only read by server code. Only the Supabase URL and anon key are public, which is safe because RLS protects the data.

## Project structure

```
app/
  (auth)/            login, signup, and the auth server actions
  (app)/             signed-in area: Today, photo (log/photo), manual entry (log/manual),
                     edit (meals/[id]/edit), history (history, history/[day]), settings
  api/analyze-meal/  photo → AI route (auth-checked, in-memory only)
  manifest.ts        web app manifest (installable PWA)
  auth/callback/     OAuth and email-confirmation code exchange
components/          UI building blocks (ui/) and feature components (auth/, meals/, settings/)
lib/
  supabase/          browser, server and proxy Supabase clients
  db/                typed queries for profiles and meals (server only)
  validation/        Zod schemas shared by forms and server actions
  ai/                prompt, Zod output schema, retry logic; providers/ holds the Claude and Gemini adapters
  image/             in-browser photo resize
  history.ts         per-day totals and the 30-day summary
  auth.ts            getCurrentUser / requireUser
  dates.ts           time zone helpers (user's day ↔ UTC)
  nutrition.ts       totals, meal type labels
  env.ts             validated environment variables
types/database.ts    typed Supabase schema
supabase/migrations/ SQL migrations (tables, RLS, triggers)
eval/                reserved for a future Python accuracy evaluation
public/icons/        app icons (regenerate with npm run icons)
scripts/             generate-icons.mjs
proxy.ts             session refresh and route protection
```

## Getting started

### 1. Prerequisites

- Node.js 20 or later
- A free [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com) for photo analysis, or a [Gemini API key](https://aistudio.google.com/apikey) with `AI_PROVIDER=gemini`

### 2. Install

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`. In the Supabase dashboard, open **Project Settings → API** and copy the project URL and the anon key (or the newer publishable key).

### 3. Run the database migrations

Use the Supabase CLI, which is included as a dev dependency:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run db:push
```

If you'd rather not use the CLI, paste each file in `supabase/migrations/` into the dashboard's **SQL Editor** and run them in order.

After changing the schema, regenerate the TypeScript types with `npm run db:types`.

### 4. Configure auth URLs

In **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` (change it to your Vercel URL when you deploy)
- **Redirect URLs:** `http://localhost:3000/**`, and later `https://<your-app>.vercel.app/**`

Email confirmation is on by default, so new users must click the link in their inbox before logging in. You can turn it off for local testing under **Authentication → Sign In / Providers → Email**.

### 5. Enable Google sign-in (optional)

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type _Web application_.
2. Under **Authorized redirect URIs**, add `https://<your-project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase, go to **Authentication → Sign In / Providers → Google**, enable it, and paste the client ID and secret.

### 6. Run

```bash
npm run dev
```

Open http://localhost:3000. Use your phone on the same network to try the mobile layout.

### Scripts

| Command             | What it does                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `npm run dev`       | Start the dev server                                                                     |
| `npm run dev:lan`   | Dev server reachable from a phone on the same Wi-Fi (`http://<your-computer's-IP>:3000`) |
| `npm run build`     | Production build                                                                         |
| `npm run lint`      | ESLint                                                                                   |
| `npm run typecheck` | TypeScript, no emit                                                                      |
| `npm run format`    | Prettier (with Tailwind class sorting)                                                   |
| `npm run db:push`   | Apply migrations to the linked Supabase project                                          |
| `npm run db:types`  | Regenerate `types/database.ts`                                                           |
| `npm run icons`     | Regenerate the app icons in `public/icons/`                                              |

## Roadmap

- [x] **Phase 1:** project setup, Supabase clients, auth (email/password, Google, log out, protected routes), migrations with RLS
- [x] **Phase 2:** manual food entry and the Today dashboard (meals by type, daily total vs. goal, edit and delete)
- [x] **Phase 3:** photo upload → Claude analysis → confirm screen → save (no photo storage)
- [x] **Phase 4:** 30-day history, settings (calorie goal, time zone), installable PWA

**Next:** deploy to Vercel.

**Later:** USDA nutrition database lookup, nutrition-label reading mode, macro goals, automated tests, and a Python accuracy evaluation in `/eval`.
