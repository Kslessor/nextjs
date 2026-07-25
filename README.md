# Ajai · Rotimi Family Tree

An interactive family tree relatives can view and propose changes to. Nothing
goes live until Kelly approves it in the console.

Three surfaces, one codebase:

- **Viewer** (`/`) — public, read-only tree + person profiles, with search.
- **Suggest** — from any profile: *Suggest an edit*, *Add a relative*, or
  *Report a problem*. Every submission becomes a **pending suggestion**, never
  a direct write.
- **Console** (`/console`) — Kelly-only approval queue with a before → after
  diff, *Approve* / *Edit & approve* / *Reject*, an undo-able history, and an
  audit trail.

## Seed data

`public/family-data.json` is the canonical dataset — 156 people and 66
family units extracted from the 2010 Personal Ancestral File database. It is
the source of truth going forward; the old .paf is frozen. The app accepts
`people`/`families` either as arrays or as id-keyed objects, so a
re-exported file in the original keyed shape also loads fine.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Deploy (zero-backend mode — works today)

The app builds to plain static files, so any static host works (Netlify,
GitHub Pages, Cloudflare Pages, or a plain web folder):

```bash
npm run build      # output in ./out
```

Upload the `out/` folder to your host. In this mode:

1. A relative fills in a suggestion → the site downloads a
   `suggestion-….json` file and asks them to email it to Kelly.
2. Kelly opens `/console`, clicks **Load suggestions…**, picks the files she
   received, and reviews each diff.
3. On **Approve**, the change is applied (new ids assigned, both sides of
   every relationship kept in sync, `meta.revision` bumped, an audit entry
   written into `meta.audit`). **Reject** discards it — with an optional
   reason she can email back.
4. She clicks **Download updated family-data.json** and re-uploads it to the
   host, replacing `family-data.json`. The public tree now shows the change.

Every decision is undo-able from the History list at the bottom of the
console before she downloads.

## Upgrade: Google Apps Script + Google Sheet backend

This gives a live queue (no emailing files) and email notifications, still
with no server to maintain and no accounts for relatives. Full setup steps
are in the header comment of [`apps-script/Code.gs`](apps-script/Code.gs) —
in short:

1. Create a Google Sheet with tabs `suggestions` and `audit` (header rows in
   the Code.gs comment).
2. Upload the real `family-data.json` to Google Drive.
3. Open Extensions → Apps Script from the Sheet and paste in `Code.gs`.
4. In **Project Settings → Script Properties** set:
   - `SECRET` — a long random string. **This is the console password.**
     To change it later, edit this property and tell Kelly the new value —
     nothing else needs redeploying.
   - `DATA_FILE_ID` — the Drive id of `family-data.json`.
   - `NOTIFY_EMAIL` — where new-suggestion summaries go.
5. Deploy → **Web app**, *Execute as: Me*, *Access: Anyone*. Copy the `/exec`
   URL.
6. Paste that URL into [`lib/config.ts`](lib/config.ts) (`APPS_SCRIPT_URL`)
   and rebuild/redeploy the site.

The frontend is identical in both modes — `lib/adapter.ts` is a pluggable
data adapter, so swapping backends never touches the UI. With the backend
active, the console asks Kelly for the `SECRET` once per visit (kept in
memory only, never stored), suggestions are rate-limited server-side,
payloads referencing unknown ids are rejected, and every approval stores a
snapshot in the `audit` tab so it can be undone.

## Where things live

| Path | What it is |
| --- | --- |
| `public/family-data.json` | Canonical data (schema: `meta`, `people`, `families`) |
| `app/page.tsx` | Viewer |
| `app/console/page.tsx` | Approval console |
| `components/` | Tree renderer, search, profile, suggest forms, diff view |
| `lib/apply.ts` | The only write path — applies approved suggestions, keeps relationships in sync, assigns fresh ids |
| `lib/adapter.ts` | Pluggable data layer (static files ⇄ Apps Script) |
| `lib/config.ts` | `APPS_SCRIPT_URL` backend switch |
| `apps-script/Code.gs` | Google Apps Script backend + setup instructions |

## Notes

- All user text is sanitised (HTML stripped) before it is stored or shown.
- Dates are forgiving: a bare year (`1942`) is stored as approximate.
- Existing ids are never renumbered; new records get `I<max+1>` / `F<max+1>`.
- The tree needs no localStorage, works on mobile, is keyboard navigable,
  and respects `prefers-reduced-motion`.
