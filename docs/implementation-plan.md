# Implementation Plan

This document captures how the InfoBuilder JSON Store site is built, the
trade-offs behind those choices, and what is intentionally out of scope.

## Goals

1. Show a list of JSON files stored in the repository under `/data`.
2. On click, render the selected file with syntax colouring and
   collapsible sections.
3. Be deployable to Cloudflare Pages as a pure static site (no build step,
   no server, no framework).
4. Be easy for a contributor to add a new file via pull request.

## Non-goals

- Editing, uploading, or deleting files in the browser.
- Searching across files (could be added later — see *Future ideas*).
- Auth — the site is fully public.
- Validation or schema enforcement on the JSON files themselves.

## Architecture

```
┌──────────────┐    fetch     ┌─────────────────────┐
│  index.html  │ ───────────▶ │  /data/index.json   │  (manifest)
│   + main.js  │              └─────────────────────┘
│              │ ───────────▶ ┌─────────────────────┐
│              │    fetch     │  /data/<file>.json  │  (actual content)
└──────────────┘              └─────────────────────┘
```

- **`/data/index.json`** is a manifest. It lists every file we want to
  surface, with a human-readable title and short description. We use a
  manifest because static hosts don't expose a "list files in this folder"
  API.
- **`assets/js/main.js`** is a single self-contained script. It:
  1. Fetches the manifest and renders the sidebar list.
  2. Reads the URL hash (`#file=<path>`) to decide which file to load.
  3. Fetches the chosen JSON, parses it, and renders a tree of nested
     elements with classes per token type.
  4. Wires up click handlers on container nodes for collapse/expand,
     plus toolbar buttons for **Expand all** / **Collapse all**.
- **`assets/css/styles.css`** holds layout, the sidebar/viewer grid, and
  the colour palette (with a separate set of token colours for dark mode
  via `prefers-color-scheme`).

### Routing

URL fragments only, no `pushState`. `#file=<path>` is the only route.
Benefits:

- Survives Cloudflare Pages' static routing without any rewrite rules.
- Deep links and the browser back/forward button both work.
- No server changes needed.

### Why a manifest instead of auto-discovery?

A static host can't enumerate a folder. The options were:

1. **Manifest file** (chosen) — simple, explicit, requires one extra edit
   when adding a file but also gives us a place for titles and
   descriptions.
2. **Generated manifest** via a GitHub Action — adds CI complexity for a
   small repo.
3. **Hard-code the list in JS** — couples content to code; rejected.

The manifest is small and lives next to the data, so contributors edit
both in the same PR.

### JSON tree rendering

The renderer is recursive and produces semantic HTML:

- Objects and arrays become `<li class="json-node json-node--collapsible">`
  with a `<span class="json-summary">` (the opener with the toggle arrow)
  and a child `<ul>` of entries.
- Primitives are rendered as `<span>` with one of `json-string`,
  `json-number`, `json-bool`, `json-null`.
- Keys are wrapped in `<span class="json-key">`.
- Punctuation gets its own muted colour.

Strings are stringified with `JSON.stringify(value)` so quoting and escapes
match exactly what the file contains. We never inject untrusted JSON via
`innerHTML`; values always go through `textContent`.

### Accessibility

- The sidebar uses semantic `<nav>` / `<ul>` / `<a>` and marks the active
  file with `aria-current="true"`.
- The toolbar buttons are real `<button>` elements.
- Colours pass WCAG AA on both light and dark backgrounds for body text.
- Collapsible nodes are clickable on the summary line; keyboard support is
  a known gap (see *Future ideas*).

## Files added in this build

| File | Purpose |
| --- | --- |
| `index.html` | Landing page with file list + viewer panel. |
| `about/index.html` | Plain-English description of the site. |
| `assets/css/styles.css` | All styling. |
| `assets/js/main.js` | Manifest loader + JSON tree renderer. |
| `data/index.json` | Manifest of files to surface. |
| `data/sample-product.json` | Demo file — product catalogue. |
| `data/sample-user-profile.json` | Demo file — user profile. |
| `data/sample-config.json` | Demo file — app config. |
| `docs/implementation-plan.md` | This document. |
| `_headers` | Cloudflare Pages `Content-Type` rule for `/data/*.json`. |

## Deployment

Cloudflare Pages settings:

- **Build command:** *(none)*
- **Output directory:** `/` (repo root)
- **Production branch:** `main`

No environment variables are required.

## Future ideas (not implemented)

- Client-side search across all files in the manifest.
- Keyboard navigation (`Enter` / `Space` to toggle, arrow keys to move).
- "Copy path" / "Copy value" actions in the tree.
- Schema badges next to files if we add a `schema` field to the manifest.
- Auto-generate the manifest in CI to remove the manual edit step.
