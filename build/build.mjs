// Compiles the .dc.html design prototype into a plain static website in site/.
// - evaluates each page's dc script at build time (React shimmed) and expands sc-for / sc-if / {{ bindings }}
// - inlines SiteHeader / SiteFooter
// - swaps <image-slot> for real <img> (Openverse photos in site/assets/img) or a monogram avatar
// - turns style-hover / style-focus attributes into real CSS classes
// - rewrites *.dc.html links to *.html
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
mkdirSync(SITE, { recursive: true });

/* ---------------------------------------------------------------- helpers */

const readPage = (name) => readFileSync(join(ROOT, name), 'utf8');

function splitDc(src) {
  const open = /<x-dc(?:\s[^>]*)?>/.exec(src);
  const close = src.lastIndexOf('</x-dc>');
  let template = src.slice(open.index + open[0].length, close);
  let helmet = '';
  template = template.replace(/<helmet>([\s\S]*?)<\/helmet>/, (_, inner) => { helmet = inner; return ''; });
  const sm = /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/.exec(src);
  return { template, helmet, js: sm ? sm[1] : '' };
}

// ---- React shim so header icons render to SVG strings at build time
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const dash = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
function elToHtml(el) {
  if (el == null || el === false) return '';
  if (Array.isArray(el)) return el.map(elToHtml).join('');
  if (typeof el !== 'object') return String(el);
  const { tag, props = {}, children = [] } = el;
  const attrs = Object.entries(props)
    .filter(([k, v]) => k !== 'key' && k !== 'children' && v != null && v !== false)
    .map(([k, v]) => {
      // SVG keeps camelCase attribute names — dash-casing viewBox breaks the icon
      const name = {
        className: 'class', strokeWidth: 'stroke-width', strokeLinecap: 'stroke-linecap',
        strokeLinejoin: 'stroke-linejoin', viewBox: 'viewBox', preserveAspectRatio: 'preserveAspectRatio',
      }[k] || dash(k);
      return ` ${name}="${String(v).replace(/"/g, '&quot;')}"`;
    }).join('');
  const kids = [].concat(children, props.children || []).map(elToHtml).join('');
  if (VOID.has(tag)) return `<${tag}${attrs}>`;
  return `<${tag}${attrs}>${kids}</${tag}>`;
}
const React = { createElement: (tag, props, ...children) => ({ tag, props: props || {}, children: children.flat() }) };

class DCLogic {
  constructor(props) { this.props = props || {}; }
  setState() {}
}

function runLogic(js, props, stateOverride) {
  if (!js.trim()) return {};
  const factory = new Function('DCLogic', 'React', 'window', 'document', `${js};\nreturn Component;`);
  const Component = factory(DCLogic, React, undefined, undefined);
  const inst = new Component(props);
  inst.props = props || {};
  Object.assign(inst.state, stateOverride || {});
  return inst.renderVals();
}

/* ------------------------------------------------------- template engine */

// find <tag ...> ... </tag> blocks honouring nesting
function findBlock(html, tag, from = 0) {
  const openRe = new RegExp(`<${tag}(\\s[^>]*)?>`, 'g');
  openRe.lastIndex = from;
  const m = openRe.exec(html);
  if (!m) return null;
  const attrs = m[1] || '';
  let depth = 1;
  const scan = new RegExp(`<${tag}(?:\\s[^>]*)?>|</${tag}>`, 'g');
  scan.lastIndex = m.index + m[0].length;
  let s;
  while ((s = scan.exec(html))) {
    depth += s[0][1] === '/' ? -1 : 1;
    if (depth === 0) {
      return {
        start: m.index, attrs,
        inner: html.slice(m.index + m[0].length, s.index),
        end: s.index + s[0].length,
      };
    }
  }
  throw new Error(`unclosed <${tag}>`);
}

const attrOf = (attrs, name) => {
  const m = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return m ? m[1] : null;
};
const bindingOf = (v) => {
  const m = /^\s*\{\{([\s\S]*?)\}\}\s*$/.exec(v || '');
  return m ? m[1].trim() : null;
};

function evalExpr(expr, scope) {
  try {
    return new Function('$s', `with($s){ return (${expr}); }`)(scope);
  } catch { return undefined; }
}

const escAttr = (s) => String(s).replace(/"/g, '&quot;');

function valueToHtml(v) {
  if (v == null || v === false) return '';
  if (typeof v === 'function') return '';
  if (typeof v === 'object') return elToHtml(v);
  return String(v);
}

// single-root check so data-if can be placed on the element itself
function singleRoot(html) {
  const t = html.trim();
  if (!t.startsWith('<')) return null;
  const tag = /^<([a-zA-Z][\w-]*)/.exec(t)[1];
  const blk = findBlock(t, tag);
  if (!blk || blk.start !== 0) return null;
  return blk.end === t.length ? { tag, html: t } : null;
}

function expand(html, scope, opts) {
  // sc-if / sc-for are handled in document order: a sc-if nested inside a sc-for
  // must only be evaluated once the loop variable exists in scope
  for (;;) {
    const ifBlk = findBlock(html, 'sc-if');
    const forBlk = findBlock(html, 'sc-for');
    if (!ifBlk && !forBlk) break;
    const useIf = ifBlk && (!forBlk || ifBlk.start < forBlk.start);
    const blk = useIf ? ifBlk : forBlk;

    if (!useIf) {
      const listExpr = bindingOf(attrOf(blk.attrs, 'list')) || '[]';
      const as = attrOf(blk.attrs, 'as') || 'item';
      const list = evalExpr(listExpr, scope) || [];
      const out = list.map((item, i) =>
        expand(blk.inner, { ...scope, [as]: item, $index: i }, opts)).join('');
      html = html.slice(0, blk.start) + out + html.slice(blk.end);
      continue;
    }

    const expr = bindingOf(attrOf(blk.attrs, 'value')) || '';
    const forced = opts.forceIf && opts.forceIf[expr];
    const val = forced ? true : evalExpr(expr, scope);
    let out = '';
    if (val) {
      out = expand(blk.inner, scope, opts);
      if (forced) {
        const root = singleRoot(out);
        const marker = ` data-if="${escAttr(expr)}"`;
        if (root) out = out.trim().replace(/^<([a-zA-Z][\w-]*)/, (m) => m + marker);
        else out = `<div style="display: contents;"${marker}>${out}</div>`;
      }
    }
    html = html.slice(0, blk.start) + out + html.slice(blk.end);
  }
  // event handlers -> data attributes
  html = html.replace(/\son([A-Z][a-zA-Z]*)="\{\{\s*([^}]*?)\s*\}\}"/g, (_, ev, expr) => {
    const idx = scope.$index != null ? ` data-i="${scope.$index}"` : '';
    return ` data-on-${ev.toLowerCase()}="${escAttr(expr)}"${idx}`;
  });
  // remaining bindings
  html = html.replace(/\{\{([\s\S]*?)\}\}/g, (_, expr) => valueToHtml(evalExpr(expr.trim(), scope)));
  // editor-only hints
  html = html.replace(/\shint-(size|placeholder-count|placeholder-val)="[^"]*"/g, '');
  return html;
}

/* --------------------------------------------------- style-hover -> CSS */

const cssRules = new Map(); // rule text -> class name
function classFor(decls, pseudo) {
  const key = pseudo + '|' + decls;
  if (cssRules.has(key)) return cssRules.get(key);
  const name = `${pseudo === 'hover' ? 'h' : 'f'}${cssRules.size}`;
  cssRules.set(key, name);
  return name;
}
function extractStateStyles(html) {
  return html.replace(/\sstyle-(hover|focus)="([^"]*)"/g, (_, pseudo, decls) => {
    const cls = classFor(decls.trim().replace(/;\s*$/, ''), pseudo);
    return ` data-sc-${pseudo}="${cls}"`;
  }).replace(/(<[a-zA-Z][\w-]*)((?:\s[^>]*?)?)\sdata-sc-(hover|focus)="([^"]*)"/g, (m, open, rest, pseudo, cls) => {
    // merge generated class into an existing class attribute if present
    if (/\sclass="/.test(rest)) return open + rest.replace(/\sclass="([^"]*)"/, ` class="$1 ${cls}"`);
    return `${open} class="${cls}"${rest}`;
  });
}
function cssText() {
  let out = '';
  for (const [key, name] of cssRules) {
    const [pseudo, decls] = key.split('|');
    const body = decls.split(';').map((d) => d.trim()).filter(Boolean)
      .map((d) => `${d} !important;`).join(' ');
    out += `.${name}:${pseudo}{${body}}\n`;
  }
  return out;
}

/* -------------------------------------------------------- image slots */

const credits = existsSync(join(SITE, 'assets/img/credits.json'))
  ? JSON.parse(readFileSync(join(SITE, 'assets/img/credits.json'), 'utf8')) : {};

function initialsAfter(html, pos) {
  const tail = html.slice(pos, pos + 700);
  const m = /Source Serif 4[^>]*>([^<]{3,60})</.exec(tail);
  if (!m) return null;
  const words = m[1].replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.|Prof\.)\s*/i, '').trim().split(/\s+/);
  return ((words[0]?.[0] || '') + (words[words.length - 1]?.[0] || '')).toUpperCase();
}

function renderImageSlots(html) {
  return html.replace(/<image-slot\s([^>]*?)><\/image-slot>|<image-slot\s([^>]*?)\/?>/g, (m, a1, a2, offset) => {
    const attrs = a1 || a2 || '';
    const id = attrOf(attrs, 'id') || '';
    const shape = attrOf(attrs, 'shape') || 'rounded';
    const style = attrOf(attrs, 'style') || '';
    const alt = (attrOf(attrs, 'placeholder') || 'Photo').replace(/&#39;/g, "'");
    const radius = shape === 'circle' ? '50%' : shape === 'pill' ? '999px' : shape === 'rect' ? '0' : '12px';
    const has = existsSync(join(SITE, 'assets/img', `${id}.jpg`));
    if (has) {
      const c = credits[id];
      const title = c ? `${c.title || 'Photo'} — ${c.creator || 'Unknown'} (CC ${(c.license || '').toUpperCase()})` : alt;
      return `<img src="assets/img/${id}.jpg" alt="${escAttr(alt)}" title="${escAttr(title)}" loading="lazy" decoding="async" style="${style} object-fit: cover; display: block; border-radius: ${radius}; background: #E9EEFB;">`;
    }
    const ini = initialsAfter(html, offset + m.length);
    if (ini) {
      return `<div role="img" aria-label="${escAttr(alt)}" style="${style} border-radius: ${radius}; background: linear-gradient(140deg, #2743A6, #3557C7); color: #FFF1DC; display: flex; align-items: center; justify-content: center; font-family: 'Source Serif 4', serif; font-weight: 700; font-size: ${shape === 'circle' ? '30px' : '64px'}; letter-spacing: 0.02em;">${ini}</div>`;
    }
    return `<div role="img" aria-label="${escAttr(alt)}" style="${style} border-radius: ${radius}; background: #E9EEFB;"></div>`;
  });
}

/* ------------------------------------------------------------ page build */

const headerSrc = splitDc(readPage('SiteHeader.dc.html'));
const footerSrc = splitDc(readPage('SiteFooter.dc.html'));

function renderHeader(active) {
  const desktopVals = runLogic(headerSrc.js, { active }, { width: 1200 });
  const mobileVals = runLogic(headerSrc.js, { active }, { width: 500, menuOpen: true });
  const opts = { forceIf: { 'g.open': true } };
  const desktop = expand(headerSrc.template, desktopVals, opts);
  const mobile = expand(headerSrc.template, mobileVals, opts);
  // desktop render keeps everything except the mobile-only pieces; take the mobile
  // nav sheet + hamburger from the mobile render and let CSS decide which shows.
  const menuBlock = /(<div style="position: fixed; inset: 0; z-index: 200;[\s\S]*?)(?=\s*$)/.exec(mobile);
  const hamburger = /<button data-on-click="toggleMenu"[\s\S]*?<\/button>/.exec(mobile);
  let html = desktop.trim();
  // the desktop action cluster and the mobile hamburger swap at the CSS breakpoint
  html = html.replace(/<div class="hdr-actions">[\s\S]*?<\/div>/,
    (cluster) => `<span class="only-desktop">${cluster}</span>${hamburger ? `<span class="only-mobile">${hamburger[0]}</span>` : ''}`);
  html = html.replace(/<nav /, '<nav class="only-desktop" ');
  if (menuBlock) html += `\n<div id="mobile-menu" hidden>${menuBlock[1].trim()}</div>`;
  return `<header>\n${html}\n</header>`;
}

function renderFooter() {
  const html = expand(footerSrc.template, runLogic(footerSrc.js, {}, {}), {}).trim();
  // openly-licensed photography needs a visible attribution route
  return html.replace(/(<a href="privacy\.dc\.html"[^>]*>Privacy Policy<\/a>)/,
    '$1<a href="credits.dc.html" style="color: #8E9BD1;" style-hover="color: #FFD48A;">Image Credits</a>');
}

const PAGE_STATE = {
  'index.dc.html': { seat: 60, dept: 6, slide: 0 },
  'apply.dc.html': { submitted: false },
};
const PAGE_FORCE = {
  'apply.dc.html': { forceIf: { notSubmitted: true, submitted: true, error: true } },
};

function fixLinks(html) {
  return html.replace(/href="([^"]*?)\.dc\.html/g, 'href="$1.html');
}

// corrections applied to every page: official spelling taken from the live site,
// plus honest wording about the openly-licensed stand-in photography
const OVERRIDES = [
  [/Muktir Siksha/g, 'Muktir Shiksha'],
  [/All photographs are of the actual campus — come and match them in person\./g,
    'The photographs below are openly-licensed stock images standing in until the college’s own campus photographs are published — see the <a href="credits.html" style="color: #FFD48A;">image credits</a>.'],
];
function applyOverrides(html) {
  for (const [find, rep] of OVERRIDES) html = html.replace(find, rep);
  return html;
}

function buildPage(file) {
  const src = splitDc(readPage(file));
  const vals = runLogic(src.js, {}, PAGE_STATE[file] || {});
  let html = expand(src.template, vals, PAGE_FORCE[file] || {});

  // dc-import -> inlined header / footer
  html = html.replace(/<dc-import\s([^>]*?)\/?>(?:<\/dc-import>)?/g, (_, attrs) => {
    const name = attrOf(attrs, 'name');
    if (name === 'SiteHeader') return renderHeader(attrOf(attrs, 'active') || '');
    if (name === 'SiteFooter') return renderFooter();
    return '';
  });

  html = renderImageSlots(html);
  html = extractStateStyles(html);
  html = fixLinks(html);
  html = applyOverrides(html);

  if (file === 'index.dc.html') {
    // tag the four hero slides so the carousel script can drive them
    html = html.replace(/<div style="position: absolute; inset: 0; opacity: [01]; transition: opacity 0\.9s ease;/g,
      (m) => m.replace('<div ', '<div class="hero-slide" '));
    html = html.replace(/>(60|6)<\/div><div style="font-size: 13px; color: #B9C3E8;/g,
      (m, n) => m.replace(`>${n}<`, `><span data-count="${n}">0</span><`));
  }

  if (file === 'apply.dc.html') {
    // hooks the enquiry script writes the submitted-state values into
    html = html.replace('Thank you, student!', 'Thank you, <span data-field="firstName">student</span>!')
      .replace('<strong></strong>', '<strong data-field="phone"></strong>')
      .replace(/<a href="https:\/\/wa\.me\/919830236143\?text=[^"]*"/, (m) => m + ' data-field="waLink"');
  }

  const title = {
    'index.dc.html': 'Muktir Shiksha College of Education & Pharmacy — D.Pharm, Gobardanga',
  }[file] || null;
  const heading = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  const pageTitle = title || `${(heading ? heading[1] : file.replace('.dc.html', '')).replace(/<[^>]+>/g, '').trim()} — Muktir Shiksha College of Education & Pharmacy`;

  const helmet = (src.helmet + headerSrc.helmet + footerSrc.helmet)
    .replace(/<link rel="preconnect"[\s\S]*?>/g, '')
    .match(/<style>[\s\S]*?<\/style>/g)?.join('\n') || '';

  writeFileSync(join(SITE, file.replace('.dc.html', '.html')), shell(pageTitle, helmet, html));
}

function shell(pageTitle, helmet, html) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="Muktir Shiksha College of Education &amp; Pharmacy, Gobardanga, North 24 Parganas — Diploma in Pharmacy (D.Pharm). Approved by PCI, New Delhi.">
<link rel="icon" href="assets/img/logo.jpg">
<link rel="apple-touch-icon" href="assets/img/logo.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
${helmet}
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
${html.trim()}
<script src="assets/site.js"></script>
</body>
</html>
`;
}

// Photographs supplied by the college, copied straight from the repo root.
// One source may feed several slots (each image-slot resolves id -> <id>.jpg).
// This has to run BEFORE the pages render: renderImageSlots only emits an <img>
// for a slot whose file already exists on disk.
mkdirSync(join(SITE, 'assets', 'img'), { recursive: true });
const COLLEGE_ASSETS = {
  'cropped-LOGO_page-0001-e1770559635454.jpg': ['logo.jpg'],
  'PP-e1770564409555.jpg': ['campus-front.jpg', 'gal-c0.jpg'],
};
for (const [src, targets] of Object.entries(COLLEGE_ASSETS)) {
  const from = join(ROOT, src);
  if (!existsSync(from)) { console.error(`WARN: missing college asset ${src}`); continue; }
  for (const t of targets) copyFileSync(from, join(SITE, 'assets', 'img', t));
}

const pages = readdirSync(ROOT).filter((f) => f.endsWith('.dc.html') && !/^Site(Header|Footer)\./.test(f));
for (const p of pages) {
  try { buildPage(p); } catch (e) { console.error(`FAIL ${p}: ${e.message}`); }
}

/* ------------------------------------------------- image credits page */
{
  const rows = Object.entries(credits).map(([id, c]) => `
    <tr>
      <td style="padding: 12px 14px; border-bottom: 1px solid #DFE3EF; width: 120px;"><img src="assets/img/${id}.jpg" alt="" loading="lazy" style="width: 100px; height: 64px; object-fit: cover; border-radius: 4px; display: block;"></td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #DFE3EF; font-size: 14px; color: #171D33;"><a href="${c.source}" rel="noopener">${(c.title || 'Untitled').replace(/</g, '&lt;')}</a></td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #DFE3EF; font-size: 14px; color: #3A4257;">${c.creator_url ? `<a href="${c.creator_url}" rel="noopener">${(c.creator || 'Unknown').replace(/</g, '&lt;')}</a>` : (c.creator || 'Unknown')}</td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #DFE3EF; font-size: 13.5px; white-space: nowrap;"><a href="${c.license_url}" rel="noopener license">CC ${(c.license || '').toUpperCase()} ${c.license_version || ''}</a></td>
    </tr>`).join('');

  const body = `${renderHeader('')}
<div style="background: #1B2559; color: #FFFFFF;">
  <div style="max-width: 1180px; margin: 0 auto; padding: 38px 20px 42px;">
    <div style="font-size: 13px; color: #8E9BD1; margin-bottom: 10px;"><a href="index.html" style="color: #B9C3E8;">Home</a> &nbsp;/&nbsp; <span style="color: #FFD48A;">Image Credits</span></div>
    <h1 style="font-family: 'Source Serif 4', serif; font-weight: 700; font-size: clamp(28px, 4vw, 42px); margin: 0 0 10px;">Image Credits</h1>
    <p style="font-size: 15.5px; color: #D6DEF6; max-width: 62ch; line-height: 1.65; margin: 0;">Photographs on this website are openly-licensed images sourced through <a href="https://openverse.org" style="color: #FFD48A;" rel="noopener">Openverse</a>, used as stand-ins where the college's own photography is not yet available. Photographs supplied by the college — including the campus building — are not listed here. Each is credited to its creator below under its Creative Commons licence.</p>
  </div>
</div>
<div style="max-width: 1180px; margin: 0 auto; padding: clamp(36px, 5vw, 60px) 20px;">
  <div style="background: #FFFFFF; border: 1px solid #DFE3EF; border-radius: 8px; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse; min-width: 640px;">
      <thead><tr style="background: #F3F5FB; text-align: left;">
        <th style="padding: 12px 14px; font-size: 12.5px; letter-spacing: 0.06em; text-transform: uppercase; color: #5A6178;">Image</th>
        <th style="padding: 12px 14px; font-size: 12.5px; letter-spacing: 0.06em; text-transform: uppercase; color: #5A6178;">Title</th>
        <th style="padding: 12px 14px; font-size: 12.5px; letter-spacing: 0.06em; text-transform: uppercase; color: #5A6178;">Creator</th>
        <th style="padding: 12px 14px; font-size: 12.5px; letter-spacing: 0.06em; text-transform: uppercase; color: #5A6178;">Licence</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>
${renderFooter()}`;
  const helmet = headerSrc.helmet.match(/<style>[\s\S]*?<\/style>/g)?.join('\n') || '';
  writeFileSync(join(SITE, 'credits.html'),
    shell('Image Credits — Muktir Shiksha College of Education & Pharmacy', helmet, applyOverrides(fixLinks(extractStateStyles(body)))));
}

// generated hover/focus CSS is appended to the hand-written stylesheet
const baseCss = readFileSync(join(ROOT, 'build', 'site.css'), 'utf8');
mkdirSync(join(SITE, 'assets'), { recursive: true });
writeFileSync(join(SITE, 'assets', 'site.css'), `${baseCss}\n/* generated from style-hover / style-focus */\n${cssText()}`);
copyFileSync(join(ROOT, 'build', 'site.js'), join(SITE, 'assets', 'site.js'));

console.log(`built ${pages.length} pages, ${cssRules.size} state-style rules`);
