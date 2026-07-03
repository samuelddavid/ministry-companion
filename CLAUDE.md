# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ministry Companion — a mobile-first React SPA for Jehovah's Witnesses field service tracking: hours logging, territory maps, return visits, and meeting schedules. Single Firebase project (`ministry-companion-7f836`) backs auth, Firestore, and hosting.

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # production build to dist/
npm run lint      # eslint over the whole repo
npm run preview   # preview the production build locally
./deploy.sh       # npm install + build + firebase-tools deploy (hosting only)
```

There is no test suite configured.

## Architecture

**No router.** Despite `react-router-dom` being a dependency, it is unused. `App.jsx` renders a single-page shell (`AppShell`) that swaps page components via a `tab` string in `useState` and a `pageMap` lookup — there are no URL routes. Navigation between "pages" (Home, Hours, Territory, Visits, Meetings, Settings) is done by calling `setTab(id)`, often passed down as a prop (e.g. `HomePage`'s quick-action cards call `setTab('hours')`).

**Auth/profile gating happens in `AppShell`, not per-page.** `App.jsx` checks `currentUser` (Firebase Auth) and `needsProfile` (no Firestore profile doc yet) before rendering the tab shell: no user → `Login`, user but no profile → `SetupProfile`, otherwise the tabbed app. Individual pages assume both are already satisfied and pull `currentUser`/`userProfile` straight from `useAuth()`.

**All state lives in Firestore; there is no backend/API layer.** Every page talks to Firestore directly via the `firebase/firestore` SDK (mostly `onSnapshot` for real-time reads, `setDoc`/`addDoc`/`updateDoc`/`deleteDoc` for writes). `src/firebase.js` exports the initialized `auth`, `db`, `storage` singletons; every page imports `db` directly rather than going through a data-access module.

**Firestore layout** (see `firestore.rules` — every collection is scoped `/{collection}/{userId}/...` and locked to `request.auth.uid == userId`, i.e. strictly per-user, no sharing/collaboration):
- `users/{uid}` — profile doc (`firstName`, `lastName`, `role`, `hourGoal`, `email`)
- `hours/{uid}/months/{yyyy-MM}` — one doc per month; fields are `yyyy-MM-dd` date keys mapping to arrays of `{ id, minutes, label, addedAt }` entries. Aggregation (today/month totals) is done client-side by flattening these arrays — there are no counter docs.
- `reports/{uid}/months/{yyyy-MM}` — generated S-4 field service report snapshots (see `HoursPage.jsx`'s `generateReport`)
- `territories/{uid}/list/{docId}` — territory map cards, optionally populated by parsing an uploaded PDF client-side (`TerritoryPage.jsx` loads pdf.js from a CDN at runtime, not as an npm dependency)
- `returnVisits/{uid}/visits/{docId}` — contact cards with `status` (`interested`/`not-home`/`bible-study`/`do-not-call`/`new`), optional geolocation (`lat`/`lng`), and `reminderDate`
- `meetings/{uid}` — single doc with a `schedule` array of `{ id, day (0-6), time, label, active }`; "next occurrence" is computed client-side (see `getNextOccurrence`, duplicated in both `HomePage.jsx` and `MeetingsPage.jsx`)

**Cross-page derived state is duplicated, not shared.** `HomePage.jsx` re-implements its own `onSnapshot` listeners and helper functions (`getNextOccurrence`, `minutesToHM`) rather than importing from `HoursPage.jsx`/`MeetingsPage.jsx`. When changing date/minutes formatting or "next occurrence" logic, grep for the helper name across `src/pages/` — there is no shared `utils`/`hooks` module yet (those directories exist but are empty).

**Styling is Tailwind utility classes plus a small set of `@apply` components** in `src/index.css` (`.card`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input-field`, `.nav-tab`, `.section-title`). Reuse these classes instead of writing new ad hoc styles for common elements (cards, buttons, inputs). The color palette centers on `teal` (custom shades in `tailwind.config.js`) as the app background/brand color, with `gold` as a secondary accent.

**`BottomNav.jsx` is dead code** — `App.jsx` only renders `TopNav.jsx`. If reviving bottom navigation, note it duplicates the tab list independently of `App.jsx`'s `TABS` array.

## Firebase specifics

- `src/firebase.js` hardcodes the Firebase web config (this is normal for Firebase — the API key is not a secret, access is controlled by `firestore.rules`, not by hiding the config).
- `firebase.json` deploys `dist/` to Hosting only; Firestore rules are deployed separately via `firebase deploy --only firestore:rules` (not wired into `deploy.sh`) if rules change.
- When adding a new Firestore collection, add a matching rule block to `firestore.rules` following the existing `{collection}/{userId}/...` per-user pattern, or reads/writes will be denied by default.
