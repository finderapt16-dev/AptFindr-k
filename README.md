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

## Registration and mobile/PWA checks

- Tenant registration is a single card with username, email, password confirmation, consent, and Google signup.
- Landlord registration progresses through **Account Details → Personal Information → Review**. Business Name is optional. Review edits use a separate floating, validated draft form; Cancel discards changes and Save shows a confirmation without leaving Review.
- New password accounts require at least 8 characters, uppercase/lowercase letters, a number, and a special character. Existing sign-in behavior is unchanged.
- Optional landlord business names are retained in signup metadata and copied into an empty `landlord_profiles.business_name` after authenticated profile setup. This does not overwrite a name subsequently edited in Settings.
- Cards scroll on short screens and use the visual viewport to remain accessible above mobile keyboards. PWA PNG/maskable and Apple icons are generated from the actual logo during `npm run build`. The production service worker precaches the app shell and app chunks for offline navigation; live listings, authentication, and writes still require internet.
- A production PWA needs HTTPS and the real Supabase environment configuration. Installation uses the browser's install/Add to Home Screen controls; registration and live listings still need an internet connection.

## Terms of Service and Privacy Policy popups

- Four documents are published: `tenant-terms`, `tenant-privacy`, `landlord-terms`, and `landlord-privacy`. They live in `src/legal/policyContent.js` as plain data (title, summary, highlights, sections) and are rendered by one shared popup, `src/legal/PolicyDialog.jsx`. Update the text there and, when the wording changes, the `POLICY_UPDATED` constant beside it.
- Clicking **Terms of Service** or **Privacy Policy** opens the document in a floating popup on top of the current screen. Nothing navigates, so the page, scroll position, and any form data stay exactly as they were. Close it with the X, the **Close** button, Escape, or a click on the backdrop.
- The signup screen follows the role selected in the form (tenant or landlord documents); the landing footer opens the tenant documents.
- Links that open the popups: the signup consent checkbox and the landing footer.
- New surfaces can use the hook (`usePolicyDialog` in `src/legal/usePolicyDialog.jsx`).

### Faster loading

- The policy text is code-split: it is only ever fetched through `src/legal/policyLoader.js`, so it is not part of the first page load. The loader caches every document after the first request, and links warm the chunk on hover, focus, or touch-start, so a tap usually opens the popup with no visible wait.
- The landing page no longer bundles the login and signup screens. `src/landing/Landing.jsx` loads them with `React.lazy`, prefetches them once the browser is idle, and warms them again on hover or focus. The landing page's own script payload drops from about 204 kB gzip to 5 kB gzip; the signup code is fetched only when someone actually signs in or registers.

The documents are written for AptFindr's current tenant and landlord flows. The site owner should review their wording - and the contact address - before production use.
