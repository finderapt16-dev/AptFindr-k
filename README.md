# AptFindr

AptFindr is a Progressive Web Application for discovering and managing apartment listings in La Paz, Iloilo City. It provides separate Tenant, Landlord, and Admin workflows backed by Supabase.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and provide the project-specific public Supabase values.
3. Start development with `npm run dev`.

Never commit `.env`, service-role keys, passwords, or other secrets.

## Commands

- `npm run dev` — start the Vite development server
- `npm run typecheck` — run TypeScript checks
- `npm run lint` — run strict TypeScript unused-code checks
- `npm run build` — create the production build
- `npm run migrate:supabase -- <folder>` — import supported local JSON data using the database utility script

## Project map

- `src/App.jsx` — public, authentication, tenant, landlord, and admin routes
- `src/landing` and `src/auth` — public pages and shared authentication
- `src/tenant`, `src/landlord`, `src/admin` — flat role folders containing pages and their components
- `src/components` — shared controls, layouts, and account settings; `ui` contains the common UI primitives
- `src/services` — Supabase client and existing data-access services
- `src/contexts`, `src/hooks`, `src/data`, `src/utils` — shared state, data types, and helpers
- `src/assets` — images; `src/tools` — the existing design-guide and flowchart pages
- `src/styles` — global variables, base styles, shared sidebar styles, and the ordered stylesheet imports

Page-specific CSS lives beside its page or section. Landing and authentication now use semantic classes and plain CSS. Authentication shares one `AuthField` and common styles in `src/auth/auth.css`; its larger pages have adjacent stylesheets. The role pages and shared controls still need their Tailwind-to-CSS pass.

See [the tenant source guide](docs/TENANT_STRUCTURE.md) for tenant page locations, shared dependencies, cleanup details, and verification commands.

## Supabase

The local `supabase-master-migration.sql` is intentionally ignored and must not be committed. Run the current migration manually in the Supabase SQL Editor when required. Configure production Site URL, allowed `/auth/callback` and `/reset-password` redirects, and custom SMTP in Supabase.

### Signup fails, or the confirmation email never arrives

Three symptoms, one cause (plus one separate email setting):

| What you see | What it means |
| --- | --- |
| "Account registration could not be completed because profile setup failed. No retry is needed until the database configuration is corrected." | The app's wording for `Database error saving new user` returned by `supabase.auth.signUp` |
| `Database error saving new user` (Google or email signup) | The `auth.users` profile trigger raised *inside the signup transaction* |
| **No confirmation email is sent** | Supabase queues the mail only after the `auth.users` row commits — a raising trigger rolls the transaction back, so nothing is sent |

**1. Fix the trigger.** Run `scripts/database/hardenAuthUserTrigger.sql` in the Supabase SQL Editor. It is idempotent and:

- replaces `public.handle_new_auth_user` with a version that casts every enum value explicitly (the previous version inserted a `text` variable into `app_users.role`, which raises `42804 column "role" is of type app_user_role but expression is of type text` and cancels the whole signup),
- sanitises and de-duplicates usernames, and always produces a non-null name,
- only accepts `tenant`/`landlord` from public signup metadata, so nobody can self-register as an admin,
- **never lets a profile problem cancel the auth user**, so the confirmation email is always queued; failures are recorded in `public.signup_trigger_failures` with the real SQLSTATE/message,
- repairs existing auth users that have no profile row, and prints a self-check (`select * from public.fn_signup_trigger_selfcheck();` — expect `PASS`).

**2. Fix email delivery.** Without custom SMTP, Supabase's shared sender only delivers to addresses that belong to your Supabase organization; every other address fails with *"Email address not authorized"* and the user never receives anything. Configure **Authentication → Emails → SMTP Settings** (Gmail app password, Resend, Brevo, …) and a verified `From` address, keep *Confirm email* on if you rely on verification, and raise the rate limit after the sender warms up. Also set the production **Site URL** and allow the `https://<domain>/auth/callback` and `/reset-password` redirects.

Diagnostics: `select * from public.signup_trigger_failures order by created_at desc;`, the trigger list from the script's final query, and **Dashboard → Logs → Auth / Postgres** for the server-side error.

## Registration and mobile/PWA checks

- Tenant registration is a single card with username, email, password confirmation, consent, and Google signup.
- Landlord registration progresses through **Account Details → Personal Information → Review**. Business Name is optional. Review edits use a separate floating, validated draft form; Cancel discards changes and Save shows a confirmation without leaving Review.
- New password accounts require at least 8 characters, uppercase/lowercase letters, a number, and a special character. Existing sign-in behavior is unchanged.
- Optional landlord business names are retained in signup metadata and copied into an empty `landlord_profiles.business_name` after authenticated profile setup. This does not overwrite a name subsequently edited in Settings.
- Cards scroll on short screens and use the visual viewport to remain accessible above mobile keyboards. PWA PNG/maskable and Apple icons are generated from the actual logo during `npm run build`. The production service worker precaches the app shell and app chunks for offline navigation; live listings, authentication, and writes still require internet.
- A production PWA needs HTTPS and the real Supabase environment configuration. Installation uses the browser's install/Add to Home Screen controls; registration and live listings still need an internet connection.

## Terms of Service and Privacy Policy

- Four documents are published: `tenant-terms`, `tenant-privacy`, `landlord-terms`, and `landlord-privacy`. They live in `src/legal/policyContent.js` as plain data (title, summary, highlights, sections) and are rendered by one shared body component, `src/legal/PolicyDocument.jsx`, so the popup and the public page can never disagree. Update the text there and, when the wording changes, bump `POLICY_UPDATED` in `src/legal/policyMeta.js`.
- Each document has **two** surfaces, because they serve different purposes:

  | Surface | Entry point | Behaviour |
  | --- | --- | --- |
  | Popup - `src/legal/PolicyDialog.jsx` | Signup consent checkbox | Opens over the current screen. Nothing navigates, so the page, scroll position, and any half-filled form stay exactly as they were. Close with the X, Escape, or a click on the backdrop. |
  | Public page - `src/legal/PolicyPage.jsx` | Landing footer, and any shared URL | Navigates to a real, bookmarkable route that works with no account. |

- The public routes are **`/privacy-policy`** and **`/terms-of-service`**. The landing footer links to them, so the URLs are discoverable from the site itself.
- Tenant and landlord wording differs, but only one URL can be submitted to a third party, so the public page switches audience with a segmented control. The choice lives in the query string (`/privacy-policy?audience=landlord`) and each button is a real anchor, so a shared link always opens the version you meant.
- New surfaces can use the hook (`usePolicyDialog` in `src/legal/usePolicyDialog.jsx`).

### Supabase URL Configuration

Supabase's Authentication settings ask for two public URLs. Set them after the first deploy:

| Supabase field | Value |
| --- | --- |
| **Application privacy policy link** | `https://<your-domain>/privacy-policy` |
| **Application terms of service link** | `https://<your-domain>/terms-of-service` |

Both routes are public, need no session, and are served by the SPA rewrite in `vercel.json`, so they resolve on a direct visit, a refresh, and a shared link. The review screen only checks that the URL is reachable and publicly readable, not that it requires a login.

### Faster loading

- The policy text is code-split: it is only ever fetched through `src/legal/policyLoader.js`, so it is not part of the first page load. The loader caches every document after the first request, and links warm the chunk on hover, focus, or touch-start, so a tap usually opens the popup with no visible wait.
- The landing page no longer bundles the login and signup screens. `src/landing/Landing.jsx` loads them with `React.lazy`, prefetches them once the browser is idle, and warms them again on hover or focus. The landing page's own script payload drops from about 204 kB gzip to 5 kB gzip; the signup code is fetched only when someone actually signs in or registers.

The documents are written for AptFindr's current tenant and landlord flows. The site owner should review their wording - and the contact address - before production use.
