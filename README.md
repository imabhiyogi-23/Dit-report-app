# DIT Report — Media Log App

A mobile-first, installable web app for logging camera media on set: card-to-storage
transfers, RAW/offline status, crew and project details, and day-to-day records on a
calendar — built for DITs, 1st ACs, and production teams.

## Features

- **Home** — today's date strip, quick actions, and recent reports at a glance
- **Calendar** — browse every logged day by month, filter by project, add a report for any date
- **Photos** — tap "Add photo" to take a picture (opens the camera on mobile) or choose
  one from your gallery; add an optional caption, browse a grid of everything you've
  shot, and tap any thumbnail to view it full-size or delete it
- **Reports** — searchable list of every report across all projects
- **Editor** — full media log per day: card no, clip range, storage, remarks, RAW/OFFLINE
  toggle (with format + codec fields for offline), signatures
- **Crew & Projects** — reachable from Home or Profile — create projects (movie/production),
  attach crew (camera man, focus puller, gaffer, etc.) with name and phone
- **Profile** — your own DIT details (name, role, WhatsApp number, email, studio)
- **Export** — PDF (via html2pdf.js), CSV (single report or all reports), and a
  WhatsApp share shortcut that opens a pre-filled message to any number

The interface is deliberately plain: a white/light-gray palette, one accent color,
simple line icons, and no decoration beyond what's needed to read and enter data
quickly on set.

## Uploading to GitHub

1. Create a new repository on GitHub (e.g. `dit-report-app`).
2. Upload all four files — `index.html`, `style.css`, `app.js`, `README.md` — keeping
   them in the same folder (no subfolders needed).
3. To make it a live, installable site: go to **Settings → Pages**, set the source to
   the `main` branch and `/ (root)`, and save. GitHub will give you a URL like
   `https://<your-username>.github.io/dit-report-app/`.
4. Open that link on your phone and add it to your home screen (Share → Add to Home
   Screen on iOS, or the browser menu → Install app on Android) for an app-like icon
   and full-screen view.

You can also just double-click `index.html` to run it locally with no server —
everything works offline except the Google Fonts and the PDF library, which load
from the internet the first time.

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
The "Share" button sends a text summary of the report to the number you enter
(defaulting to your own profile number). To send the full log, export the PDF or
CSV first and attach it manually in WhatsApp.

## Tech

Plain HTML, CSS, and JavaScript — no build step, no framework, no dependencies to
install. The only external resources are Google Fonts (Poppins/Inter) and
html2pdf.js, both loaded from CDNs.
