# Ministry Companion

A mobile-first web app for Jehovah's Witnesses field service: log hours, keep territory maps, track return visits, and see the next meeting at a glance.

**Live:** https://ministry-companion-7f836.web.app

## Features

- **Hours** — log minutes against a date, see today and month-to-date totals against a personal goal, and generate an S-4 field service report snapshot per month
- **Territories** — territory cards, optionally populated by parsing an uploaded PDF in the browser
- **Return visits** — contact cards with status (interested, not home, Bible study, do not call, new), optional location, and a reminder date
- **Meetings** — a weekly schedule, with the next occurrence computed on the fly
- **Export** — client-side PDF generation via jsPDF and html2canvas

## Tech

React 19 + Vite, Tailwind CSS, Firebase (Auth, Firestore, Hosting). No backend or API layer: pages talk to Firestore directly, mostly through `onSnapshot` for real-time reads.

```bash
npm install
npm run dev       # dev server
npm run build     # production build to dist/
npm run lint
./deploy.sh       # install + build + deploy to Firebase Hosting
```

## Privacy

Every collection is scoped per user (`/{collection}/{userId}/...`) and locked in `firestore.rules` to `request.auth.uid == userId`. There is no sharing between accounts: your data is visible only to you.

The Firebase web config in `src/firebase.js` is committed, which is normal for Firebase — the API key identifies the project rather than granting access. Access is controlled by the security rules, not by keeping the config secret.

## Notes

- Navigation is a `tab` string in `useState`, not a router — there are no URL routes, so the back button does not move between tabs. `react-router-dom` is a leftover dependency and is unused.
- `BottomNav.jsx` is not rendered; `TopNav.jsx` is the live navigation.
- Firestore rules deploy separately: `firebase deploy --only firestore:rules`.
- No test suite.
