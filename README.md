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
- **Export** — PDF (via html2canvas + jsPDF), CSV, and Excel (.xlsx, via SheetJS) —
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
   `README.md`, and the `icons` folder (`icon-192.png`, `icon-512.png`,
   `apple-touch-icon.png`) — keeping the same folder structure (the `icons` folder
   stays a subfolder; everything else sits at the repo root).
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

Once installed, a small service worker (`sw.js`) caches the app's own files so it
keeps working without a connection — useful for logging cards with patchy set wifi.
Only your own reports/photos/CSV exports need a live connection for exporting or
WhatsApp sharing, not for using the log itself.

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

## WhatsApp sharing note

WhatsApp's `wa.me` links can only pre-fill a **text message**, not attach a file.
The "Share" button sends a text summary of the report to the number you pick or
type in. To send the full log, export the PDF or CSV first and attach it manually
in WhatsApp. Photos are different — the Photos tab's Share button uses your
phone's native share sheet, which *can* send the actual image file straight to
WhatsApp, Gmail, or anywhere else, on browsers that support the Web Share API
(most mobile browsers; not desktop Safari/Firefox).

## If the PDF export comes out blank

This can happen on browsers with strict anti-fingerprinting protection — Brave's
Shields and Firefox's strict tracking protection are the most common causes, since
they can intentionally blank out the canvas data the PDF is built from. The app
detects this and shows an explanation instead of a silently broken file; if you see
that message, try again or switch to Chrome/Edge/Safari with default privacy
settings for that export.

## Tech

Plain HTML, CSS, and JavaScript — no build step, no framework, no dependencies to
install. The only external resources are Google Fonts (Inter), html2canvas and
jsPDF (used together to generate the PDF report), and SheetJS (for the Excel
export). `manifest.json` and `sw.js` are what make it installable
and give it basic offline support.
