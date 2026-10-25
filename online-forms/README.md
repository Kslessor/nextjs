# NEXA Online Forms v1.0

A clickable, team-facing build of the *Online Forms v1.0 — Functional
Specifications* (v0.3). It covers all three surfaces in the spec and connects
them through one shared dataset, so a form can be followed end to end:

| Surface | Route | Spec |
| --- | --- | --- |
| Overview | `/` | KPIs, items needing attention, live-form completion, recent activity |
| **Online Forms Editor list** | `/forms` | §9–11: empty state, search, status and category filters, status-aware cards, archived table |
| **Online Forms Editor** | `/builder/?id=…` | §12–20: Build/Preview, Fields and Settings panels, pages, drag-and-drop, conditional logic, duplicate, publish, unpublish, archive, delete, audit trail |
| **Q-Flow Service Console** | `/qflow` | §21–23: Case List and Calendar List with grey/green/red form icons, soft keys, submission pop-up, print |
| **VisitPlus & browser journeys** | `/visitplus` | §2–8: app form button, check-in CTA, push, SMS and email entry, verification, form, submission received, unavailable states |
| Patient form link | `/f/?t=<token>&form=<id>` | The `#OnlineFormsURL` a patient opens from SMS or email |
| Audit log | `/audit` | Admin-only history of every form change |

## Run it

```bash
cd online-forms
npm install
npm run dev      # http://localhost:3100
npm run build    # static export to ./out, deployable to any static host
```

## How it works

- **One data store.** `lib/store.ts` keeps forms, appointments, submissions
  and the audit log in `localStorage`. Every screen reads from it, so a form
  submitted in VisitPlus turns its Q-Flow icon green (or red) straight away.
  To connect the real backend, replace this module with API calls; the UI
  doesn't need to change.
- **One form renderer.** `components/FormRunner.tsx` drives the editor
  preview, VisitPlus and the browser link. All three therefore share the
  same multi-page navigation, display conditions, page jumps (first matching
  rule wins) and the spec's validation messages.
- **Roles (§1.2.1).** Use the switcher at the bottom of the sidebar to change
  role:
  - **Q-Flow Admin:** has every permission.
  - **Content Manager:** can't delete forms or view audit logs.
  - **Staff Manager:** can't edit form structure.

  Only Admins can edit forms created by someone else.
- **Action required (red icon).** In the editor, flag answer options with the
  🚩 button. A submission containing a flagged answer shows red in Q-Flow
  until a staff member selects **Mark as actioned**.
- **Reset demo data** in the sidebar restores the seed data. The seed has
  8 forms (one in every status), 12 appointments across 6 clinics and
  4 submissions. Appointment dates are set relative to the current date.

## Decisions on open spec questions

The spec has some highlighted questions that aren't answered yet. This build
picks one answer for each so the flow can be demonstrated. Each is easy to
change:

| Question | Prototype behaviour |
| --- | --- |
| §2.3.3: what happens when a link opens on a phone with VisitPlus installed? | The phone asks “Open in VisitPlus” or “Continue in browser”. The app path is already authenticated. The browser path asks for name and date of birth unless the form allows anonymous submissions. |
| §3.4.1: what happens after 3 failed verification attempts? | The link shows **Access Denied** with the facility's phone number. |
| §5.4.2.2: when does the check-in CTA come back after “Remind me later”? | It's snoozed for 4 hours per appointment. |
| §4.4.2 vs §6.4: is the submitted-form button inactive, or does it open a view-only form? | The button is greyed out and labelled “Form submitted”. Tapping it opens a read-only view. |
| “Action required”: what makes a form icon red? | Flagged answer options, set per field in the editor. |
| Form expiry vs link expiry | **Form expires on** (a date) auto-expires a published form. **Link expiry** (hours or days after the appointment) controls each patient's link (§8.4.1). |
