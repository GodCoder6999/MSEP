# Build

The `*.dc.html` files in the repo root are the design prototype (an "omelette"/dc
component format: `<x-dc>` templates, `sc-for` / `sc-if`, `{{ bindings }}`,
`<image-slot>`, `<dc-import>`), which only render inside the design tool.
`build/` compiles them into an ordinary static website in `site/`.

## Commands

```bash
node build/fetch-images.mjs   # download Openverse photos -> site/assets/img (+ credits.json)
node build/build.mjs          # compile *.dc.html -> site/*.html
```

`fetch-images.mjs` skips slots whose file already exists. Options:

- `FORCE=1` — re-download even if present
- `IDS=hero-campus,lab-1` — restrict to specific slots

Serve the result from any static server, e.g.:

```bash
cd site && python -m http.server 8099
```

## What the compiler does

- runs each page's dc script at build time (React shimmed to emit SVG strings) and
  expands `sc-for` / `sc-if` / `{{ … }}` in document order
- inlines `SiteHeader` / `SiteFooter` in place of `<dc-import>`; the header is rendered
  twice (desktop + mobile) and CSS decides which one shows at 920px
- all seven nav dropdown panels are rendered and shown on hover via CSS, so the menu
  works without JavaScript
- `<image-slot>` becomes an `<img>` pointing at `site/assets/img/<id>.jpg`; slots with no
  photo (faculty, staff, principal) become monogram avatars built from the adjacent name
- `style-hover` / `style-focus` attributes are hoisted into generated CSS classes
- `*.dc.html` links are rewritten to `*.html`
- content overrides (`OVERRIDES` in `build.mjs`) apply the official spelling from
  muktirshikshacollegeofeducationandpharmacy.org and the stock-photo disclaimer
- `credits.html` is generated from `credits.json` — required attribution for the
  CC-licensed photography, and linked in the footer

Behaviour the prototype expressed as component state lives in `build/site.js`
(hero carousel, stat counters, mobile menu, enquiry-form validation) and
`build/site.css`; both are copied to `site/assets/`.

## Editing content

Edit the `*.dc.html` sources and re-run `node build/build.mjs`. Do not edit
`site/*.html` directly — it is generated output.
