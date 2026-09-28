# DIT Report — Media Log App

A mobile-first, installable web app for logging camera media on set: card-to-storage
transfers, RAW/offline status, crew and project details, and day-to-day records on a
calendar — built for DITs, 1st ACs, and production teams.

## Features

- **Home** — today's date strip, quick actions, and recent reports at a glance
- **Calendar** — browse every logged day by month, filter by project, add a report for any date
- **Photos** — tap "Add photo" to take a picture (opens the camera on mobile) or choose
  one from your gallery; add an optional caption, star ones worth keeping, filter to
  favorites, and share a photo straight to WhatsApp or any app via your phone's native
  share sheet
- **Reports** — searchable list of every report across all projects, with a
  favorites filter and a star on each card
- **Editor** — full media log per day: card no, clip range, storage, remarks, RAW/OFFLINE
  toggle (with format + codec fields for offline), signatures
- **Crew & Projects** — reachable from Home or Profile — create projects (movie/production),
  star the ones you're actively on, attach crew (camera man, focus puller, gaffer, etc.)
  with name and phone
- **Profile** — your own DIT details (name, role, WhatsApp number, email, studio)
- **Export** — PDF (drawn with jsPDF), CSV, and Excel (.xlsx, via SheetJS) —
  each for a single report or, from Profile, every report at once
- **WhatsApp share** — sends a pre-filled report summary to any number. On Android
  Chrome/Edge, tapping "Pick from contacts" (next to any phone field, and on the
  share button itself) opens your phone's native contact picker instead of typing
  a number by hand — the browser shows its own one-time picker UI, so the app never
  gets standing access to your address book. Safari and desktop browsers don't
  support this yet and fall back to typing the number in.

The interface is deliberately plain: a white/light-gray palette, one accent color,
simple line icons, and no decoration beyond what's needed to read and enter data
quickly on set — with a few small touches (a highlighted active tab, light press
and transition animations) so it feels responsive without being flashy.

## Uploading to GitHub

1. Create a new repository on GitHub (e.g. `dit-report-app`).
2. Upload everything — `index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`,
   `README.md`, plus the `icons` folder and the `vendor` folder (which holds the
   PDF and Excel libraries so they work offline) — keeping the same folder
   structure (`icons` and `vendor` stay subfolders; everything else sits at the
   repo root).
3. Go to **Settings → Pages**, set the source to the `main` branch and `/ (root)`,
   and save. GitHub will give you a live HTTPS URL like
   `https://<your-username>.github.io/dit-report-app/`.

## Installing it as an app

The site is a installable Progressive Web App (PWA) once it's served over HTTPS
(GitHub Pages works; opening `index.html` directly from disk does not, since
browsers require a secure origin for installability):

- **Android (Chrome/Edge)** — visit the site, then either tap the "Install app"
  button under Profile → Install, or use the browser menu → "Install app" /
  "Add to Home screen". It launches full-screen with its own icon, no address bar.
- **iPhone/iPad (Safari)** — Safari doesn't support the install prompt, so tap the
  Share icon and choose **Add to Home Screen**. The app will show the same
  instructions under Profile if it detects Safari on iOS.
- **Desktop (Chrome/Edge)** — an install icon appears in the address bar, or use
  Profile → Install app.

## Works fully offline

After the first visit, the whole app runs with **no internet at all**. The service
worker (`sw.js`) saves every file the app needs — including the PDF and Excel
libraries in `vendor/` — and the app makes no external requests (no CDNs, no web
fonts; it uses your device's own system font). That means logging cards, browsing
the calendar, taking photos, and exporting **PDF, Excel and CSV** all work in
airplane mode, and they're fast because nothing is fetched over the network.
Reports, photos and crew are stored on the device itself.

Only two things genuinely need a connection: opening WhatsApp (the fallback
`wa.me` link) and receiving app updates. Open the app once while online so it can
save itself; after that you can forget about signal.

**Getting updates after install:** because the app is cached for offline use, anyone
who already opened it before you push a fix or new feature won't see it automatically
— they'll keep getting the cached version until the cache is invalidated. This app
handles that itself: whenever you deploy new files, it detects the change in the
background and shows a small "A new version is ready — Reload" banner at the bottom
of the screen. If you ever change `sw.js` or `app.js` yourself, bump the
`CACHE_NAME` value at the top of `sw.js` (e.g. `v2` → `v3`) so the update banner
fires correctly.

## How data is stored

All reports, projects, crew, and your profile are saved in the browser's local
storage on the device you're using — nothing is sent to a server. This means:

- Data stays on the phone/computer you filled it in on. It won't sync between
  devices unless you export a CSV and move it yourself.
- Clearing your browser's site data/cache will erase saved reports, so export a CSV
  backup of anything important.
- Photos are compressed and stored the same way as everything else. Browsers cap
  local storage at a few megabytes per site, so a large photo log can eventually hit
  that limit — if a photo fails to save, delete a few older ones first.

## Sharing a report

Both the Photos tab and the report editor's Share button now work the same way:
they open your phone or browser's **native share sheet** first — the same picker
you'd get from any app — so you choose WhatsApp, SMS, email, or anything else
installed, then pick the person inside that app. Photos share the actual image
file; reports share a text summary (WhatsApp links can only pre-fill text, not
attach a file, so for the full log, export the PDF or CSV first and attach it
manually). On browsers without share-sheet support (desktop Safari/Firefox, most
desktop browsers generally), the report Share button falls back to picking a
number — via "Pick from contacts" on Android Chrome/Edge, or by typing it in
elsewhere — and opens WhatsApp directly with the text ready to send.

## About the PDF export

The PDF is built with **pure vector drawing** (jsPDF's own text/table/line APIs) —
it does not take a screenshot of anything, and no canvas rendering or image capture
is involved at any point. This was a deliberate rewrite: an earlier screenshot-based
approach (`html2canvas`) could come out blank on browsers with strict
anti-fingerprinting protection (Brave Shields, Firefox strict mode) or extensions
that block canvas-reading APIs, since those are exactly the APIs such tools are
designed to interfere with. Drawing the report directly avoids that entire failure
class, and as a bonus produces a smaller file with real, selectable text instead of
a flattened image. If the PDF still doesn't generate, it's almost always one of:
- **The app hasn't finished saving itself for offline use** — open it once while
  online, reload, and try again (the app shows an alert naming this).
- **A stale cached copy of the app** — see "Getting updates after install" above.

## Tech

Plain HTML, CSS, and JavaScript — no build step, no framework, no CDN. The only
third-party code is bundled in `vendor/`: jsPDF (PDF, drawn as vector text/tables —
no canvas or screenshot step) and SheetJS (Excel). They load on first use and are
pre-warmed shortly after start-up. `manifest.json` and `sw.js` make the app
installable and offline-capable.
