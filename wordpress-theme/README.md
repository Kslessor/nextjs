# Tribe Gen AI — WordPress block theme

A custom WordPress block theme converted from the approved **Tribe Gen AI rebrand** design
(the React/Next.js source export, `Tribe-Gen-AI-Website-Source.zip`). It follows the
recommendation in that package's own WordPress implementation brief: **keep WordPress,
replace the front end** — your content, posts, media, users, forms and integrations stay;
only the theme changes.

Reference design: https://tribe-gen-ai-rebrand.theecommtribe.chatgpt.site

## What's inside `tribe-gen-ai/`

| Piece | Where |
| --- | --- |
| Design system (colours, type) | `theme.json` + `assets/css/globals.css` (ported verbatim from the approved design) |
| Homepage refinements | `assets/css/suite.css` (ported verbatim) |
| WordPress adaptations | `assets/css/wp-bridge.css` (query loops, post content, admin bar, plain pages) |
| Interactions | `assets/js/main.js` — scroll progress, cursor halo, reveal-on-scroll, service tabs, architecture explorer, blog topic filter, article TOC. Keyboard accessible, honours `prefers-reduced-motion`. |
| Templates | `templates/` — front page, Your Tribe, Book, blog hub (`home`/`page-blog`), single article, plain page, archive fallback |
| Editable sections | `patterns/` — every section is a block pattern in the "Tribe Gen AI" category, editable in the Site Editor |
| Brand assets | `assets/img/` — original transparent logos (AJE removed, per the brief) + hero artwork |

Fidelity notes carried over from the brief: the **Trusted by Leading Brands** gallery sits
immediately below the hero with the original transparent logos on black, two slow opposing
rows, pause on hover/focus, and a static reduced-motion fallback. The brand-count claim is
omitted. The website yellow is `#F2C400`.

## Install on staging (do not activate on live first)

1. **Create a staging copy** of tribegenai.com (most hosts have one-click staging;
   otherwise use a staging plugin). Keep live untouched until sign-off.
2. Zip the `tribe-gen-ai/` folder (or use the release zip) and upload via
   **Appearance → Themes → Add New Theme → Upload Theme**, then **Activate** on staging.
3. **Reading settings** (Settings → Reading): keep "Your homepage displays: A static page"
   with *Home* as the front page. Optionally set *Blog* as the Posts page — either way
   `/blog/` renders the Thinking hub design (`page-blog.html` covers the page case,
   `home.html` the posts-page case).
4. **Create the "Your Tribe" page**: Pages → Add New, title "Your Tribe", slug `your-tribe`,
   publish with empty content. The `page-your-tribe.html` template picks it up by slug.
5. The **Book** page (`/aiforecommercebook/`) and any page slugs already on the site are
   picked up automatically; all other pages (Privacy, Terms, Resources, …) render in the
   plain editorial template.
6. **Categorise posts** with a handful of topics (e.g. Leadership, Systems, Creative,
   Playbooks) — the Thinking hub's topic filter and counts are generated from your live
   categories.
7. Review desktop + mobile, forms, analytics and SEO plugins on staging; back up live;
   then activate the theme on the live site.

## Elementor note

The live site currently runs Hello Elementor. Existing Elementor-built pages will still
render their saved content inside the plain template, but the intent of this redesign is
that the five key pages (Home, Your Tribe, Blog, Article, Book) come from this theme's
templates. Once approved, Elementor can be deactivated if nothing else depends on it.

## Editing content

- Every section is a **block pattern** (Appearance → Editor → Patterns → "Tribe Gen AI").
  Edit the pattern PHP files, or copy a pattern into a page and edit it there.
- Service copy, delivery stages, architecture labels and logo rows live at the top of the
  corresponding `patterns/*.php` files as plain PHP arrays — edit once, no markup surgery.
- Colours and fonts: `theme.json` and the `:root` variables at the top of
  `assets/css/globals.css`.
