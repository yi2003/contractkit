# ContractKit (合同小刀)

A tiny, **browser-only** PDF knife for contracts. It does just three jobs — and your files never leave your device.

1. **Merge** — combine scanned / chapter PDFs into one book for bidding & archiving.
2. **Watermark** — stamp “仅供投标 / FOR BID ONLY” or any custom text diagonally, so the file can't be passed off as the official copy.
3. **Extract** — pull out just the seal / appendix pages (e.g. pages 3–7) into a small file.

The UI is bilingual (**中文 / English**, switch in the top-right corner; the choice is remembered in `localStorage` — locally, never sent anywhere).

> **Why it exists.** Contract & ID scans are too sensitive to upload to sites like ilovepdf. This page has **no server and makes zero network requests** — the whole program (PDF engine included) loads into your browser the moment you open it, and every PDF is read, processed and downloaded entirely in your computer's memory.
> Deliberately out of scope: no OCR, no e-signature, no cloud storage. Powered by [pdf-lib](https://github.com/Hopding/pdf-lib) — a plain static site, no build step.

## Run it

Pure static files — any of these works:

```bash
npx serve .            # or: python3 -m http.server 8080  → http://localhost:8080
# Or simply double-click index.html (modern browser, no server needed)
# Or save the folder and use it fully offline
```

There is not a single line of runtime code that makes a network request — verify it yourself in DevTools → Network.

## Try it quickly

Generate demo PDFs (the red circles simulate seal pages):

```bash
npm run samples
```

| To try | Drop in | Then |
| --- | --- | --- |
| Merge | `samples/商务标_第一部分.pdf` + `商务标_第二部分.pdf` + `资格证明_扫描件.pdf` | reorder → Merge & download |
| Watermark | `samples/合同_技术协议.pdf` | pick a stamp text → Watermark & download |
| Extract | `samples/投标文件_完整版_15页.pdf` | enter `5-7` (seal pages) or `13-15` (appendix) → Extract & download |

(File names are Chinese on purpose — they mirror real bid documents; drag-and-drop works regardless of language.)

## How it works

- **Merge / Extract** use pdf-lib's `copyPages` — the source file is read-only and never modified.
- **Watermark** renders your text onto a canvas as a transparent PNG tile → `embedPng` once → tiles it across pages with `drawImage`. One shared image resource is reused by every page, so the output doesn't bloat with page count — and Chinese text needs no multi-MB embedded CJK font.
- **Page ranges** accept `3-7`, `3,7`, `3-` (to the last page), `-3` (to page 3), Chinese punctuation and `all`/`全部`.
- Sensible default output names, auto-suggested and overridable.

## Repository layout

```
index.html         single-page app (text via data-i18n)
style.css          styles
helpers.js         pure functions: page-range parsing / filename cleaning (unit-tested)
i18n.js            zh / EN copy dictionary & switcher (localStorage)
app.js             UI logic + pdf-lib pipelines
vendor/            vendored pdf-lib.min.js (offline-capable)
scripts/           demo-PDF generator (npm run samples)
samples/           generated demo files (git-ignored)
test/              smoke tests (npm test)
vercel.json        static-site config for Vercel (no build, output = repo root)
```

## Deploy to Vercel

Zero-config static deploy — `vercel.json` already declares *no framework, no build, output = repo root*, and `.vercelignore` keeps `node_modules` / `test` / `scripts` / `samples` off the site.

```bash
# CLI
npm i -g vercel && vercel login
npm run deploy          # = npx vercel --prod

# or GitHub → dashboard: vercel.com → New Project → Import this repo → Deploy
# (Framework Preset: Other — nothing to configure)
```

The deployed HTTPS site behaves exactly like the local copy: Vercel only serves static files; the app still makes no network requests and PDFs still never leave the visitor's browser.

## Privacy

- No server, no `<script src="http…">`, no fetch / XHR — auditable source.
- Files live only in an `ArrayBuffer` / pdf-lib document in memory; closing the tab erases everything.
- The download is always a brand-new file; the original is never touched.

## Limitations

- Password-protected / encrypted PDFs are not supported.
- Practical size is bounded by device memory (tens of MB / a few hundred pages are fine).
- The watermark is rendered from text into a raster tile (using local system fonts) — deterrent-level, not forensic-grade.

## Development

```bash
npm install     # only needed for tests (the browser build of pdf-lib is already vendored)
npm test        # node smoke tests: helpers + i18n + merge/extract/alpha-PNG watermark pipelines
npm run samples
npm run serve
```

> Note: source-code comments are in Chinese (the original product language). The UI itself ships with a built-in 中文 / EN switcher.
