// Genera el encabezado y el pie animados en assets/
import { mkdirSync, writeFileSync } from 'node:fs';
import { THEMES, SANS, MONO, esc, wavePath, contourPath, pill, ICONS } from './lib.mjs';

const W = 1200;
const PHRASES = [
  'Ingeniero de Minas y Metalurgia',
  'Desarrollador full-stack',
  'Automatización con Python',
  'IA aplicada a problemas reales',
];

const STRATA = [
  { baseline: 338, amp: 9, periods: 2, phase: 0, color: 'violet', op: 0.16, dur: 38 },
  { baseline: 352, amp: 11, periods: 3, phase: 1, color: 'teal', op: 0.16, dur: 28 },
  { baseline: 366, amp: 8, periods: 2, phase: 2.3, color: 'gold', op: 0.2, dur: 22 },
  { baseline: 380, amp: 7, periods: 4, phase: 0.7, color: 'copper', op: 0.28, dur: 17 },
];

function strata(t, bottom, layers, crystals = true) {
  return layers
    .map((l, i) => {
      const d = wavePath({ width: W, baseline: l.baseline, amp: l.amp, periods: l.periods, phase: l.phase, bottom });
      const gems =
        crystals && i >= 2
          ? [140, 430, 720, 1010]
              .flatMap((x) => [x + i * 60, x + i * 60 + W])
              .map((x, k) => {
                const color = k % 2 ? t.gold : t.teal;
                return `<path d="M0,-5 L3.5,0 L0,5 L-3.5,0 Z" transform="translate(${x} ${l.baseline + 12})" fill="${color}"><animate attributeName="opacity" values="0.2;1;0.2" dur="${2.4 + (k % 3) * 0.7}s" begin="${(k * 0.37).toFixed(2)}s" repeatCount="indefinite"/></path>`;
              })
              .join('')
          : '';
      return `
    <g>
      <path d="${d}" fill="${t[l.color]}" fill-opacity="${l.op}"/>
      ${gems}
      <animateTransform attributeName="transform" type="translate" values="0 0;-${W} 0" dur="${l.dur}s" repeatCount="indefinite"/>
    </g>`;
    })
    .join('');
}

// Línea de escritura animada que alterna frases letra por letra
function typing(t, x0, y, size) {
  const cw = size * 0.6;
  const slot = 4.6;
  const total = slot * PHRASES.length;
  const events = [];
  PHRASES.forEach((p, i) => {
    const s = i * slot;
    const n = p.length;
    for (let c = 0; c <= n; c++) events.push({ t: s + c * 0.065, p: i, c });
    const del = s + slot - 0.35 - n * 0.02;
    for (let c = n - 1; c >= 0; c--) events.push({ t: del + (n - c) * 0.02, p: i, c });
  });
  events.sort((a, b) => a.t - b.t);

  const anim = (attr, fn) => {
    const keys = [];
    const vals = [];
    for (const e of events) {
      const v = fn(e).toFixed(1);
      if (vals.length && vals[vals.length - 1] === v) continue;
      keys.push((keys.length ? e.t / total : 0).toFixed(5));
      vals.push(v);
    }
    return `<animate attributeName="${attr}" values="${vals.join(';')}" keyTimes="${keys.join(';')}" dur="${total}s" calcMode="discrete" repeatCount="indefinite"/>`;
  };

  const lines = PHRASES.map((p, i) => {
    const full = p.length * cw;
    return `
    <clipPath id="type${i}"><rect x="${x0}" y="${y - size}" width="${i === 0 ? full : 0}" height="${size * 1.4}">${anim('width', (e) => (e.p === i ? e.c * cw : 0))}</rect></clipPath>
    <text x="${x0}" y="${y}" clip-path="url(#type${i})" font-family="${MONO}" font-size="${size}" fill="${t.text}" textLength="${full.toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(p)}</text>`;
  }).join('');

  const cursorX0 = x0 + PHRASES[0].length * cw + 3;
  const cursor = `
    <rect x="${cursorX0.toFixed(1)}" y="${y - size * 0.82}" width="${(size * 0.5).toFixed(1)}" height="${size * 1.02}" fill="${t.copper}">
      ${anim('x', (e) => x0 + e.c * cw + 3)}
      <animate attributeName="opacity" values="1;0.15" dur="0.9s" calcMode="discrete" repeatCount="indefinite"/>
    </rect>`;

  return `<text x="${x0 - 32}" y="${y}" font-family="${MONO}" font-size="${size}" font-weight="700" fill="${t.copper}">›</text>${lines}${cursor}`;
}

function contours(t, cx, cy) {
  const rings = Array.from({ length: 10 }, (_, i) => {
    const major = i % 3 === 0;
    const delay = i * 0.18;
    const dur = delay + 1.8;
    return `<path d="${contourPath(cx, cy, 24 + i * 26, i * 0.55)}" fill="none" stroke="${major ? t.copper : t.teal}" stroke-opacity="${(0.55 - i * 0.04).toFixed(2)}" stroke-width="${major ? 1.6 : 1}" pathLength="1000" stroke-dasharray="1000">
        <animate attributeName="stroke-dashoffset" values="1000;1000;0" keyTimes="0;${(delay / dur).toFixed(3)};1" dur="${dur.toFixed(2)}s" fill="freeze"/>
      </path>`;
  }).join('');
  return `
  <g>
    ${rings}
    <animateTransform attributeName="transform" type="rotate" values="0 ${cx} ${cy};360 ${cx} ${cy}" dur="300s" repeatCount="indefinite"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="4" fill="${t.copper}"/>
  <circle cx="${cx}" cy="${cy}" r="4" fill="none" stroke="${t.copper}" stroke-width="1.5">
    <animate attributeName="r" values="4;26" dur="2.6s" repeatCount="indefinite"/>
    <animate attributeName="stroke-opacity" values="0.9;0" dur="2.6s" repeatCount="indefinite"/>
  </circle>`;
}

function header(t) {
  const H = 400;
  const cx = 965;
  const cy = 180;
  let px = 72;
  const pills = [
    ['Minería y metalurgia', t.copper],
    ['Python', t.gold],
    ['TypeScript', t.teal],
    ['IA aplicada', t.violet],
  ]
    .map(([label, color]) => {
      const p = pill(px, 280, label, color, t);
      px += p.w + 10;
      return p.svg;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Argenis Marin, ingeniero de minas y desarrollador">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.bg1}"/>
      <stop offset="1" stop-color="${t.bg2}"/>
    </linearGradient>
    <linearGradient id="name" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${t.copper}"/>
      <stop offset="0.55" stop-color="${t.gold}"/>
      <stop offset="1" stop-color="${t.teal}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${t.teal}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${t.teal}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${t.copper}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${t.copper}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="13" cy="13" r="0.9" fill="${t.faint}"/>
    </pattern>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="20"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#dots)" opacity="0.7"/>
    <circle cx="${cx}" cy="${cy}" r="300" fill="url(#glow)"/>
    <circle cx="160" cy="60" r="260" fill="url(#glow2)"/>
    ${contours(t, cx, cy)}
    ${strata(t, H, STRATA)}
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="20" fill="none" stroke="${t.border}"/>

  <text x="72" y="112" font-family="${MONO}" font-size="18"><tspan fill="${t.teal}">~/argenismarin</tspan><tspan fill="${t.muted}"> $ whoami</tspan></text>
  <text x="68" y="192" font-family="${SANS}" font-size="70" font-weight="800" fill="url(#name)" letter-spacing="-1">Argenis Marin</text>
  ${typing(t, 104, 250, 26)}
  ${pills}
</svg>
`;
}

function footer(t) {
  const H = 130;
  const layers = [
    { baseline: 92, amp: 8, periods: 2, phase: 0.4, color: 'violet', op: 0.14, dur: 34 },
    { baseline: 104, amp: 9, periods: 3, phase: 1.2, color: 'teal', op: 0.16, dur: 26 },
    { baseline: 116, amp: 6, periods: 4, phase: 2.1, color: 'copper', op: 0.26, dur: 18 },
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="De la roca al código">
  <defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath></defs>
  <g transform="translate(${W / 2 - 230} 26)">${ICONS.pick(t.copper)}</g>
  <text x="${W / 2 + 16}" y="44" text-anchor="middle" font-family="${MONO}" font-size="17" fill="${t.muted}" textLength="418" lengthAdjust="spacingAndGlyphs">De la roca al código · gracias por pasar</text>
  <g clip-path="url(#frame)">${strata(t, H, layers, false)}</g>
</svg>
`;
}

// Logos de skillicons cuando existen y de Iconify para el resto
const S = (id) => ({ skill: id });
const I = (id, opts = {}) => ({ iconify: id, ...opts });

// Cada fila agrupa categorías que caben lado a lado
const STACK = [
  [
    ['Lenguajes', 'copper', [['Python', S('py')], ['C#', S('cs')], ['C++', S('cpp')], ['TypeScript', S('ts')], ['JavaScript', S('js')], ['LaTeX', S('latex')]]],
    ['Power Platform', 'gold', [['Power Apps', I('arcticons:microsoft-power-apps', { color: '#a33bbd', stroke: 3 })], ['Power Automate', I('selfhst:microsoft-power-automate')], ['Power BI', I('logos:microsoft-power-bi')]]],
  ],
  [
    ['Web y backend', 'teal', [['Next.js', S('nextjs')], ['React', S('react')], ['Node.js', S('nodejs')], ['Express', S('express')], ['Tailwind', S('tailwind')], ['Socket.io', I('devicon:socketio', { dark: '#010101' })], ['Prisma', S('prisma')], ['PostgreSQL', S('postgres')]]],
  ],
  [
    ['Nube', 'blue', [['Cloudflare', S('cloudflare')], ['Workers', S('workers')], ['Vercel', S('vercel')], ['Actions', S('githubactions')], ['Git', S('git')]]],
    ['Datos y automatización', 'violet', [['Jupyter', I('devicon:jupyter')], ['pandas', I('devicon:pandas', { dark: '#130754' })], ['Selenium', S('selenium')], ['OpenAI', I('logos:openai-icon', { dark: 'root' })]]],
  ],
];

const TILE = { dark: '#242938', light: '#F4F2ED' };

async function logo(spec, theme) {
  if (spec.skill) {
    const res = await fetch(`https://skillicons.dev/icons?i=${spec.skill}&theme=${theme}`);
    return res.text();
  }
  const [set, name] = spec.iconify.split(':');
  const color = spec.color ? `?color=${encodeURIComponent(spec.color)}` : '';
  let svg = await (await fetch(`https://api.iconify.design/${set}/${name}.svg${color}`)).text();
  if (spec.stroke) svg = svg.replaceAll('stroke-linecap', `stroke-width="${spec.stroke}" stroke-linecap`);
  if (theme === 'dark' && spec.dark === 'root') svg = svg.replace('<svg ', '<svg fill="#ffffff" ');
  else if (theme === 'dark' && spec.dark) svg = svg.replaceAll(`fill="${spec.dark}"`, 'fill="#ffffff"');
  // Se coloca dentro de una baldosa con el mismo estilo de skillicons
  svg = svg.replace(/<svg([^>]*?) width="[^"]*" height="[^"]*"/, '<svg$1 x="48" y="48" width="160" height="160"');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="60" fill="${TILE[theme]}"/>${svg}</svg>`;
}

async function stack(t, theme) {
  const SW = 1000;
  const cell = 96;
  const tile = 52;
  const gap = 40;
  const rowH = 128;
  let k = 0;
  const rows = [];
  for (const [r, groups] of STACK.entries()) {
    const width = groups.reduce((a, [, , items]) => a + items.length * cell, 0) + gap * (groups.length - 1);
    let x = (SW - width) / 2;
    const y = 28 + r * rowH;
    for (const [label, color, items] of groups) {
      const tiles = [];
      for (const [i, [name, spec]] of items.entries()) {
        const data = Buffer.from(await logo(spec, theme)).toString('base64');
        const cx = i * cell + cell / 2;
        tiles.push(`<g class="rise" style="animation-delay:${(0.08 + k++ * 0.035).toFixed(2)}s">
          <image x="${cx - tile / 2}" y="34" width="${tile}" height="${tile}" href="data:image/svg+xml;base64,${data}"/>
          <text x="${cx}" y="106" text-anchor="middle" font-family="${SANS}" font-size="12.5" fill="${t.text}" fill-opacity="0.8">${esc(name)}</text>
        </g>`);
      }
      rows.push(`<g transform="translate(${x} ${y})">
        <rect x="${cell / 2 - tile / 2}" y="4" width="4" height="16" rx="2" fill="${t[color]}"/>
        <text x="${cell / 2 - tile / 2 + 12}" y="17.5" font-family="${SANS}" font-size="15" font-weight="700" fill="${t.text}">${esc(label)}</text>
        ${tiles.join('')}
      </g>`);
      x += items.length * cell + gap;
    }
  }
  const SH = 28 + STACK.length * rowH;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" width="${SW}" height="${SH}" role="img" aria-label="Tecnologías con las que trabajo">
  <style>
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .rise { animation: rise 0.6s ease-out both; }
  </style>
  <rect x="0.5" y="0.5" width="${SW - 1}" height="${SH - 1}" rx="16" fill="${t.card}" stroke="${t.border}"/>
  ${rows.join('')}
</svg>
`;
}

mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(new URL(`../assets/header-${name}.svg`, import.meta.url), header(t));
  writeFileSync(new URL(`../assets/footer-${name}.svg`, import.meta.url), footer(t));
  writeFileSync(new URL(`../assets/stack-${name}.svg`, import.meta.url), await stack(t, name));
}
console.log('assets listos');
