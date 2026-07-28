// Fetches Openverse images for every image-slot in the design and downloads them
// into site/assets/img. Writes site/assets/img/credits.json with attribution.
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site', 'assets', 'img');
mkdirSync(OUT, { recursive: true });

// slot id -> [search query, extra terms to prefer]
const SLOTS = {
  'hero-campus': 'Pharmd students faculty hajvery university',
  'hero-slide-2': 'chemistry laboratory practical work',
  'hero-slide-3': 'college lecture classroom teacher',
  'hero-slide-4': 'hospital pharmacy pharmacist dispensing',
  'home-g1': 'classroom students desks',
  'home-g2': 'science laboratory equipment',
  'home-g3': 'library bookshelves',
  'home-g4': 'college students campus india',
  'about-building': 'college building campus india',
  'canteen-1': 'college canteen cafeteria',
  'class-1': 'classroom empty desks',
  'class-2': 'students classroom lecture',
  'comp-1': 'computer lab desktop computers room',
  'museum-1': 'apothecary jars pharmacy museum',
  'gal-c1': 'university campus building exterior',
  'gal-c2': 'campus entrance gate college',
  'gal-c3': 'herb garden plants beds',
  'gal-l1': 'pharmaceutical laboratory glassware',
  'gal-l2': 'chemistry laboratory bench',
  'gal-l3': 'students laboratory practical microscope',
  'gal-r1': 'university library students studying',
  'gal-r2': 'classroom teaching',
  'gal-r3': 'computer classroom students working',
  'gal-e1': 'seminar lecture hall audience',
  'gal-e2': 'college sports day athletics track',
  'gal-e3': 'student group event college',
  'herb-1': 'medicinal herb garden',
  'herb-2': 'medicinal plants leaves tulsi',
  'hostel-1': 'hostel dormitory room beds',
  'infra-1': 'college building campus',
  'infra-2': 'laboratory science room',
  'infra-3': 'library books shelves',
  'lab-1': 'pharmacy laboratory tablets formulation',
  'lab-2': 'chemistry laboratory flasks',
  'lab-3': 'student microscope laboratory',
  'lib-1': 'library shelves books',
  'lib-2': 'reading room library desk',
  'sport-1': 'playground sports field',
  'sport-2': 'college students football match',
  'course-dpharm': 'pharmacist pharmacy medicine dispensing counter',
  'about-home': 'college campus building students india',
};

const API = 'https://api.openverse.org/v1/images/';

async function search(q, wide = true) {
  const url = `${API}?q=${encodeURIComponent(q)}&license_type=all-cc${wide ? '&aspect_ratio=wide' : ''}&mature=false&page_size=20`;
  const r = await fetch(url, { headers: { 'User-Agent': 'muktir-siksha-site-build/1.0' } });
  if (!r.ok) throw new Error(`${q}: HTTP ${r.status}`);
  const j = await r.json();
  // rank by how many query terms actually appear in the title/tags, so we do not
  // end up with an arena for "sports day" or a card catalogue for "library"
  const terms = q.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
  return (j.results || []).map((it) => {
    const hay = `${it.title || ''} ${(it.tags || []).map((t) => t.name).join(' ')}`.toLowerCase();
    return { ...it, _score: terms.filter((t) => hay.includes(t)).length };
  }).filter((it) => it._score > 0).sort((a, b) => b._score - a._score);
}

async function download(url, dest) {
  const r = await fetch(url, { headers: { 'User-Agent': 'muktir-siksha-site-build/1.0' } });
  if (!r.ok) throw new Error(`download HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 4000) throw new Error('too small');
  writeFileSync(dest, buf);
  return buf.length;
}

const credits = {};
const used = new Set();

const only = process.env.IDS ? new Set(process.env.IDS.split(',')) : null;

for (const [id, q] of Object.entries(SLOTS)) {
  if (only && !only.has(id)) continue;
  const file = join(OUT, `${id}.jpg`);
  if (existsSync(file) && process.env.FORCE !== '1') {
    console.log(`skip ${id} (exists)`);
    continue;
  }
  let ok = false;
  for (const [attempt, wide] of [[q, true], [q, false], [q.split(' ').slice(0, 2).join(' '), true]]) {
    let results = [];
    try { results = await search(attempt, wide); } catch (e) { console.log(`  search fail ${attempt}: ${e.message}`); continue; }
    for (const it of results) {
      if (used.has(it.id)) continue;
      const src = it.url;
      if (!src) continue;
      try {
        const n = await download(src, file);
        used.add(it.id);
        credits[id] = {
          title: it.title, creator: it.creator, creator_url: it.creator_url,
          license: it.license, license_version: it.license_version, license_url: it.license_url,
          source: it.foreign_landing_url, provider: it.provider, query: attempt, bytes: n,
        };
        console.log(`ok   ${id}  <- ${it.title?.slice(0, 60)} (${it.license})`);
        ok = true;
        break;
      } catch (e) { /* next candidate */ }
    }
    if (ok) break;
  }
  if (!ok) console.log(`FAIL ${id}`);
}

const creditsPath = join(OUT, 'credits.json');
let prev = {};
if (existsSync(creditsPath)) { try { prev = JSON.parse(readFileSync(creditsPath, 'utf8')); } catch {} }
writeFileSync(creditsPath, JSON.stringify({ ...prev, ...credits }, null, 2));
console.log('credits written:', Object.keys(credits).length);
