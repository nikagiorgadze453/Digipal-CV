# Digipal CV Formatter — Full Website Summary

This document describes the **current** Digipal CV Formatter product: what it does, how it is built, and how to run it.

---

## What it is

**Digipal CV Formatter** is a web application that:

1. Lets users **upload** a CV as **PDF** or **plain text**.
2. Sends the extracted text to **Anthropic Claude** to **restructure** it into a fixed **Digipal profile** data shape (JSON).
3. Shows a **live preview** styled like the official Digipal profile (logo, section colors, skills table with borders, typography).
4. Lets users **edit** the structured data in a **visual form** (including add/remove for jobs, education, languages).
5. Offers **Digip-AI**, a chat sidebar that applies **natural-language edits** to the same JSON and refreshes the preview.
6. **Downloads** the result as **PDF** and **DOCX**.

There is **no user login, database, or subscription billing** in the current version. The **Anthropic API key lives only on the server** (`ANTHROPIC_API_KEY` or `CV_ANTHROPIC_KEY` in environment — e.g. `.env.local` locally, host dashboard in production). It is **never** sent to or stored in the browser.

---

## Repository layout

| Path | Role |
|------|------|
| **`nextjs-version/`** | **Primary app** — Next.js 16, TypeScript, React 19. Intended for hosting (e.g. Netlify, Vercel). |
| **`python-version/`** | **Legacy** — FastAPI + Jinja + static JS/CSS; same conceptual features with a Python stack and **fpdf2** for PDF. |

This summary focuses on **`nextjs-version`**.

---

## User flow (Next.js)

1. **Upload step** — Drag-and-drop or pick a file (`.pdf`, `.txt`, `.md`).
2. **API key** — Configured only on the **server** (see `.env.example`). No key field in the UI.
3. **Format CV with AI** — Client calls upload → format; a **progress** state is shown while Claude runs.
4. **Result step** — Preview, **Download PDF**, **Download DOCX**, **Edit Data**, **Digip-AI**, **New CV**.

---

## Technical architecture (Next.js)

### Frontend

- **`app/page.tsx`** — Single main client page: state machine (`upload` → `processing` → `result`), file handling, preview, actions.
- **`components/FormEditor.tsx`** — Modal form bound to `CvData`; dynamic rows for experience, education, languages.
- **`components/DigipAIChat.tsx`** — Chat UI; posts to `/api/chat` with `file_id` and `message` only (API key stays on server).

### Backend (API routes)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/upload` | POST | Accepts `multipart/form-data` with `file`; extracts text (**pdf-parse** via `pdf-parse/lib/pdf-parse.js` + Node polyfills for `DOMMatrix` / `Path2D` / `ImageData`); stores text in memory under a new `file_id`. |
| `/api/format` | POST | `FormData`: `file_id`. Uses **`getServerAnthropicApiKey()`** from env; loads raw text, calls Claude (**`lib/cv-formatter.ts`**), stores `CvData`, returns JSON + **`renderPreviewHtml`**. |
| `/api/chat` | POST | `FormData`: `file_id`, `message`. Same server-side key; updates CV + preview HTML. |
| `/api/update` | POST | `FormData`: `file_id`, `cv_data` (JSON string). Manual saves from the form editor. |
| `/api/download` | GET | Query `id` = `file_id`. Builds **PDF** with **pdfkit** + embedded **Poppins** TTFs in `fonts/`. |
| `/api/download-docx` | GET | Query `id` = `file_id`. Builds **DOCX** with the **`docx`** library. |

### State / session model

- **`lib/storage.ts`** — In-memory `Map` keyed by `file_id`. Holds raw upload text and optional formatted `CvData`.
- **Important:** Data is **lost on server restart** and is **not shared** across multiple serverless instances unless you add shared storage later.

### AI layer

- **`lib/cv-formatter.ts`** — `SYSTEM_PROMPT` for one-shot CV → JSON; **`formatCvWithAI`**, **`chatWithAI`** using **`@anthropic-ai/sdk`** (model configurable in code, e.g. Claude Sonnet).
- **`lib/types.ts`** — TypeScript interfaces for `CvData`, skills, jobs, education, languages.

### Preview & template styling

- **`lib/render-preview.ts`** — Builds HTML string for the preview iframe area (inline styles).
- **Digipal-aligned styling** (from reference PDFs): **Poppins** (Regular / SemiBold / Bold / Italic); name/title **navy** `#070422`; section titles **green** `#51e0ac`; body **black**; skills table **black** borders; job header pattern (bold company, italic role/dates); bullet **●**.
- **`app/layout.tsx`** — Loads **Google Fonts** (Inter for app chrome + Poppins for preview).
- **`public/digipal-logo.png`** — Logo in navbar and preview header.
- **`fonts/*.ttf`** — Poppins files used by **pdfkit** for PDF output (not all environments load web fonts into PDF without embedding).

### PDF / parsing caveats

- **PDF generation** uses **pdfkit** (server-safe). **jsPDF** was removed earlier because it relied on browser APIs (`DOMMatrix`) on the server.
- **PDF text extraction** avoids **pdfjs** worker issues by sticking to **pdf-parse v1** + direct require path + polyfills.

### Config

- **`next.config.ts`** — `serverExternalPackages: ["pdfkit"]` (and similar as needed for native-heavy deps).
- **`.env.local`** (optional) — e.g. `ANTHROPIC_API_KEY=...` for server-side default key.

---

## Removed features (for reference only)

Login, organizations, PayPal subscriptions, Prisma database, JWT middleware, Settings/Billing pages, and related API routes were **removed** so the site stays a simple hosted tool with **server-only** Claude credentials.

Details for **re-enabling** that stack are summarized in **`AUTH_BILLING_REMOVED.md`**.

---

## How to run locally

```bash
cd nextjs-version
npm install
npm run dev
```

Open **http://localhost:3000**.

Production build:

```bash
npm run build
npm start
```

---

## Deployment notes

- Set **`ANTHROPIC_API_KEY`** (or **`CV_ANTHROPIC_KEY`**) in the host’s environment; never expose it in client bundles.
- Remember **in-memory `file_id` storage** on serverless: one instance may not see another’s uploads; for production scale, consider Redis or similar keyed by user/session.
- Ensure **`fonts/`** and **`public/digipal-logo.png`** are deployed with the app for correct PDF/logo behavior.

---

## Branding copy

- Browser title / product name: **Digipal CV Formatter**.
- Footer: **Powered by Digip-AI** (no vendor model name in the footer by design).

This is the **edited, whole-website summary** of the project in its current form.
