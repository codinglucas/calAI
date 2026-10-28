# calAI

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
- **Days and time zones.** `eaten_at` is stored in UTC. Meals are grouped into days using the time zone saved in the user's profile, not UTC.
- **Secrets.** The Anthropic API key is only read by server code. Only the Supabase URL and anon key are public, which is safe because RLS protects the data.

## Project structure

```
app/
  (auth)/            login, signup, and the auth server actions
  (app)/             signed-in area (Today, and later History and Settings)
  auth/callback/     OAuth and email-confirmation code exchange
components/          UI building blocks (ui/) and feature components (auth/, …)
lib/
  supabase/          browser, server and proxy Supabase clients
  validation/        Zod schemas shared by forms and server actions
  ai/                Claude prompt, Zod output schema and call (Phase 3)
  auth.ts            getCurrentUser / requireUser
  env.ts             validated environment variables
types/database.ts    typed Supabase schema
supabase/migrations/ SQL migrations (tables, RLS, triggers)
eval/                reserved for a future Python accuracy evaluation
proxy.ts             session refresh and route protection
```

## Getting started

### 1. Prerequisites

- Node.js 20 or later
- A free [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com) (needed from Phase 3)

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

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Start the dev server                            |
| `npm run build`     | Production build                                |
| `npm run lint`      | ESLint                                          |
| `npm run typecheck` | TypeScript, no emit                             |
| `npm run format`    | Prettier (with Tailwind class sorting)          |
| `npm run db:push`   | Apply migrations to the linked Supabase project |
| `npm run db:types`  | Regenerate `types/database.ts`                  |

## Roadmap

- [x] **Phase 1:** project setup, Supabase clients, auth (email/password, Google, log out, protected routes), migrations with RLS
- [ ] **Phase 2:** manual food entry and the Today dashboard (meals by type, daily total vs. goal, edit and delete)
- [ ] **Phase 3:** photo upload → Claude analysis → confirm screen → save (no photo storage)
- [ ] **Phase 4:** 30-day history, settings (calorie goal, time zone), installable PWA

**Later:** USDA nutrition database lookup, nutrition-label reading mode, macro goals, tests and CI, and a Python accuracy evaluation in `/eval`.
