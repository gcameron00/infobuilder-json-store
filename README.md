# InfoBuilder JSON Store

A minimal, read-only static site that lists and displays JSON files tracked
in this repository, as part of the wider **InfoBuilder** project.

There is no backend, no framework, and no build step — just plain HTML, CSS,
and vanilla JavaScript, hosted on
[Cloudflare Pages](https://pages.cloudflare.com/).

## What it does

- Lists every JSON file under [`/data`](./data) in a sidebar.
- Renders the selected file as a syntax-coloured tree.
- Lets you collapse/expand objects and arrays (with **Expand all** /
  **Collapse all** buttons).
- Exposes a direct **raw** link to each JSON file for download/copy.
- Supports deep links via the URL hash (e.g. `/#file=sample-product.json`).

It deliberately does **not** support editing, uploading, or any kind of write
operation. The repository is the source of truth.

## Project layout

```
/                    – index.html (file list + viewer)
/about/              – About page
/assets/
  /css/styles.css    – Layout, JSON token colours, dark mode
  /js/main.js        – Manifest loader, JSON tree renderer
  favicon.svg
/data/
  index.json         – Manifest: lists every file shown in the UI
  *.json             – The JSON documents themselves
/docs/
  implementation-plan.md
```

## Adding a JSON file

1. Drop the new `.json` file into [`/data`](./data).
2. Add an entry to [`/data/index.json`](./data/index.json) with:
   - `path` — filename relative to `/data/` (e.g. `my-file.json`)
   - `title` — short human-readable label for the sidebar
   - `description` — one-line summary shown above the file
3. Open a pull request. Cloudflare Pages will publish on merge.

Example manifest entry:

```json
{
  "path": "my-file.json",
  "title": "My File",
  "description": "What this document represents."
}
```

## Running locally

There is no build. Any static file server will do — for example:

```bash
# Python
python3 -m http.server 8080

# Node (with npx)
npx --yes serve .
```

Then open <http://localhost:8080>.

> Opening `index.html` directly via `file://` will not work because the viewer
> uses `fetch()` to load `/data/index.json` and the per-file JSON, which
> browsers block on the `file://` scheme.

## Deployment

The site deploys to Cloudflare Pages straight from the repository root with
**no build command**. The included [`_headers`](./_headers) file sets
`Content-Type: application/json` on `/data/*.json` so browsers handle the raw
links cleanly.

## Documentation

- [About page](./about/index.html) — user-facing description of the site.
- [Implementation plan](./docs/implementation-plan.md) — how the site was
  built and what each piece does.

## License

Content of the JSON files is owned by the InfoBuilder project. The site code
(HTML, CSS, JS) is provided as-is for internal use.
