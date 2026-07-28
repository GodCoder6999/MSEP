// One-shot re-skin: maps the old blue/amber palette onto the
// Deep Navy + Mint + muted Gold system across every source file.
//   primary   #0B2545 navy
//   secondary #5AA9A3 / #8ED1C4 mint  (interactive accents, icon tiles)
//   neutral   #EEF2F5
//   accent    #C89B3C muted gold      (CTAs and prestige cues)
// Brand marks (Facebook, Instagram, X, YouTube, WhatsApp) keep their own colours.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const MAP = {
  // ---- navy family
  '#2743A6': '#0B2545', // primary: nav, buttons, links
  '#3557C7': '#16456F', // primary hover
  '#131A3D': '#0B2545', // headings
  '#1B2559': '#0B2545', // dark bands
  '#0B102A': '#061726', // deepest (hero)
  '#0F1533': '#061726',
  '#2C3A78': '#1B3E60', // divider on navy
  '#171D33': '#16232E', // base text
  '#3A4257': '#35424D', // body text
  '#2B3450': '#23384A', // pull-quote text
  '#5A6178': '#5A6B78', // muted text

  // ---- neutrals / tints
  '#F7F8FC': '#EEF2F5', // page background (spec neutral)
  '#F3F5FB': '#E7EDF1',
  '#F4F7F4': '#E7EDF1',
  '#E9EEFB': '#E2EFEC', // tint blocks -> mint tint
  '#EDF0FA': '#E2EFEC', // icon tiles -> mint tint
  '#EEF0F7': '#E6ECEF', // hairlines
  '#DFE3EF': '#D7DFE5', // borders
  '#D3D9EC': '#C7D3DA',
  '#D6DEF6': '#C2D2DC', // light text on navy
  '#D3DAEE': '#C2D2DC',
  '#D9DFF5': '#C2D2DC',
  '#C6D0F0': '#A9C3D1',
  '#B9C3E8': '#A9C3D1',
  '#8E9BD1': '#7E97A8',
  '#FFF1DC': '#F6EFE0',

  // ---- gold family (was amber)
  '#F59A23': '#C89B3C',
  '#FFAD3B': '#DBB05B',
  '#FFD48A': '#E8CE9A',
  '#FDF3DE': '#F7F1E3',
  '#FFE9C4': '#F0E4C8',
  '#F2D9A4': '#E2D2AC',
  '#2A1B03': '#2A2109', // text on gold
  '#8A5A05': '#7A5E1E',
  '#6B4504': '#6A511A',
  '#8A6A14': '#7A5E1E',
  '#6B5210': '#6A511A',

  // ---- urgency cues: red is off-palette, use deep mint
  '#C0392B': '#2F7E78',
  '#B3401E': '#256A65',
};

const files = [
  ...readdirSync(ROOT).filter((f) => f.endsWith('.dc.html')).map((f) => join(ROOT, f)),
  join(ROOT, 'build', 'site.css'),
];

let total = 0;
for (const file of files) {
  let s = readFileSync(file, 'utf8');
  const before = s;
  for (const [from, to] of Object.entries(MAP)) {
    s = s.split(from).join(to);
    s = s.split(from.toLowerCase()).join(to);
  }
  // rgba() shadows and glows carried the old blue/amber tints
  s = s.split('rgba(19,26,61,').join('rgba(11,37,69,')
       .split('rgba(19, 26, 61,').join('rgba(11, 37, 69,')
       .split('rgba(23,32,84,').join('rgba(11,37,69,')
       .split('rgba(23, 32, 84,').join('rgba(11, 37, 69,')
       .split('rgba(245,154,35,').join('rgba(200,155,60,')
       .split('rgba(245, 154, 35,').join('rgba(200, 155, 60,')
       .split('rgba(11,16,42,').join('rgba(6,23,38,')
       .split('rgba(15,21,52,').join('rgba(6,23,38,')
       .split('rgba(192, 57, 43,').join('rgba(47, 126, 120,');
  if (s !== before) { writeFileSync(file, s); total++; }
}
console.log(`recoloured ${total} files`);
