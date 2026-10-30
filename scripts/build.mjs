// Consulta GitHub y genera las tarjetas con datos en dist/
import { mkdirSync, writeFileSync } from 'node:fs';
import { THEMES, SANS, MONO, esc, fmt, monthYear, shine, pill, wrap, ICONS } from './lib.mjs';

const LOGIN = process.env.PROFILE_LOGIN || 'argenismarin';
const TOKEN = process.env.GITHUB_TOKEN;

const FEATURED = [
  {
    repo: 'FinanzasApp',
    accent: 'teal',
    initials: 'FA',
    text: 'Finanzas personales full-stack con OCR de facturas, tarjetas, presupuestos con alertas, metas de ahorro y analítica.',
    tags: ['Next.js', 'Express', 'Prisma', 'OCR'],
  },
  {
    repo: 'Registros-Semana-Mineria',
    accent: 'gold',
    initials: 'RS',
    text: 'Registro de asistentes para eventos con códigos QR, escarapelas en PDF y sincronización en vivo con Google Sheets.',
    tags: ['Next.js', 'Socket.io', 'QR'],
  },
];

async function fetchData() {
  if (!TOKEN) throw new Error('Falta GITHUB_TOKEN');
  const query = `query($login: String!) {
    user(login: $login) {
      createdAt
      followers { totalCount }
      repositories(ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, first: 100) {
        totalCount
        nodes {
          name description stargazerCount pushedAt homepageUrl
          primaryLanguage { name color }
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } }
        }
      }
      contributionsCollection {
        totalCommitContributions
        contributionCalendar { totalContributions weeks { contributionDays { contributionCount } } }
      }
    }
  }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': LOGIN },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
  return json.data.user;
}

function summarize(user) {
  const repos = user.repositories.nodes;
  const cal = user.contributionsCollection.contributionCalendar;

  const bytes = new Map();
  for (const r of repos)
    for (const e of r.languages.edges) {
      const prev = bytes.get(e.node.name) || { size: 0, color: e.node.color };
      prev.size += e.size;
      bytes.set(e.node.name, prev);
    }
  const total = [...bytes.values()].reduce((a, b) => a + b.size, 0) || 1;
  let langs = [...bytes.entries()].map(([name, v]) => ({ name, color: v.color, share: v.size / total }));
  langs.sort((a, b) => b.share - a.share);
  if (langs.length > 6) {
    const rest = langs.slice(5).reduce((a, b) => a + b.share, 0);
    langs = [...langs.slice(0, 5), { name: 'Otros', color: null, share: rest }];
  }

  return {
    metrics: [
      ['Contribuciones', cal.totalContributions, 'último año'],
      ['Commits', user.contributionsCollection.totalCommitContributions, 'último año'],
      ['En GitHub', new Date(user.createdAt).getUTCFullYear(), 'desde'],
      ['Repos públicos', user.repositories.totalCount, 'propios'],
      ['Estrellas', repos.reduce((a, r) => a + r.stargazerCount, 0), 'recibidas'],
      ['Seguidores', user.followers.totalCount, 'en GitHub'],
    ],
    weeks: cal.weeks.map((w) => w.contributionDays.reduce((a, d) => a + d.contributionCount, 0)),
    langs,
    repos: new Map(repos.map((r) => [r.name, r])),
  };
}

const STYLE = `<style>
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .rise { animation: rise 0.7s ease-out both; }
</style>`;

function frame(t, w, h, body, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
  ${STYLE}
  <defs><clipPath id="card"><rect width="${w}" height="${h}" rx="16"/></clipPath></defs>
  <g clip-path="url(#card)">
    <rect width="${w}" height="${h}" fill="${t.card}"/>
    ${shine('sh', w, h, t)}
  </g>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="16" fill="none" stroke="${t.border}"/>
  ${body}
</svg>
`;
}

function title(t, icon, text, sub) {
  return `
  <g transform="translate(24 22)">${icon(t.copper)}</g>
  <text x="58" y="40" font-family="${SANS}" font-size="19" font-weight="700" fill="${t.text}">${esc(text)}</text>
  ${sub ? `<text x="476" y="40" text-anchor="end" font-family="${MONO}" font-size="11.5" fill="${t.muted}">${esc(sub)}</text>` : ''}`;
}

function statsCard(t, s, updated) {
  const W = 500;
  const H = 290;
  const cells = s.metrics
    .map(([label, value, unit], i) => {
      const x = 24 + (i % 3) * 160;
      const y = 94 + Math.floor(i / 3) * 62;
      return `<g transform="translate(${x} ${y})"><g class="rise" style="animation-delay:${(0.1 + i * 0.08).toFixed(2)}s">
        <text font-family="${SANS}" font-size="28" font-weight="800" fill="${t.text}">${label === 'En GitHub' ? value : fmt(value)}</text>
        <text y="21" font-family="${SANS}" font-size="12.5" fill="${t.muted}"><tspan font-weight="600" fill="${t.text}" fill-opacity="0.8">${esc(label)}</tspan> ${esc(unit)}</text>
      </g></g>`;
    })
    .join('');

  const x0 = 24;
  const x1 = W - 24;
  const top = 222;
  const bottom = 270;
  const max = Math.max(1, ...s.weeks);
  const pts = s.weeks.map((v, i) => [x0 + (i / (s.weeks.length - 1)) * (x1 - x0), bottom - (v / max) * (bottom - top)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${x1},${bottom} L${x0},${bottom} Z`;
  const peak = pts[s.weeks.indexOf(max)];

  const spark = `
  <defs>
    <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${t.copper}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${t.copper}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <text x="24" y="208" font-family="${SANS}" font-size="12" fill="${t.muted}">Actividad semanal en los últimos 12 meses</text>
  <text x="476" y="208" text-anchor="end" font-family="${MONO}" font-size="11.5" fill="${t.muted}">pico ${fmt(max)}/sem</text>
  <line x1="${x0}" x2="${x1}" y1="${bottom}" y2="${bottom}" stroke="${t.border}"/>
  <path d="${area}" fill="url(#area)" class="rise" style="animation-delay:0.6s"/>
  <path d="${line}" fill="none" stroke="${t.copper}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" pathLength="1000" stroke-dasharray="1000">
    <animate attributeName="stroke-dashoffset" values="1000;0" dur="2.2s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1"/>
  </path>
  <circle cx="${peak[0].toFixed(1)}" cy="${peak[1].toFixed(1)}" r="3.5" fill="${t.gold}">
    <animate attributeName="r" values="3.5;6;3.5" dur="2s" repeatCount="indefinite"/>
  </circle>`;

  return frame(t, W, H, `${title(t, ICONS.pick, 'Reporte de exploración', `act. ${updated}`)}${cells}${spark}`, 'Estadísticas de GitHub');
}

function langsCard(t, s) {
  const W = 500;
  const H = 290;
  const x0 = 30;
  const cw = W - 60;
  const y0 = 100;
  const ch = 44;
  // Cada estrato toma un color del tema para que se distingan entre sí
  const palette = [t.copper, t.teal, t.gold, t.violet, t.blue];
  let acc = 0;
  const segs = s.langs.map((l, i) => {
    const x = x0 + acc * cw;
    const w = l.share * cw;
    acc += l.share;
    return { ...l, x, w, color: l.name === 'Otros' ? t.muted : palette[i % palette.length] };
  });

  const rects = segs.map((g) => `<rect x="${g.x.toFixed(1)}" y="${y0}" width="${(g.w + 0.6).toFixed(1)}" height="${ch}" fill="${g.color}"/>`).join('');
  const cracks = segs
    .slice(1)
    .map((g) => `<path d="M${g.x.toFixed(1)},${y0} l3,8 l-4,9 l4,10 l-3,9 l2,8" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="1.4"/>`)
    .join('');
  const ticks = [0, 25, 50, 75, 100]
    .map((d) => {
      const x = x0 + (d / 100) * cw;
      const anchor = d === 0 ? 'start' : d === 100 ? 'end' : 'middle';
      return `<line x1="${x}" x2="${x}" y1="86" y2="94" stroke="${t.faint}"/><text x="${x}" y="80" text-anchor="${anchor}" font-family="${MONO}" font-size="10.5" fill="${t.muted}">${d} m</text>`;
    })
    .join('');

  const legend = segs
    .map((l, i) => {
      const x = 30 + (i % 2) * 235;
      const y = 180 + Math.floor(i / 2) * 34;
      return `<g transform="translate(${x} ${y})"><g class="rise" style="animation-delay:${(0.9 + i * 0.08).toFixed(2)}s">
        <rect width="12" height="12" rx="3" y="-10" fill="${l.color}"/>
        <text x="20" font-family="${SANS}" font-size="14" font-weight="600" fill="${t.text}">${esc(l.name)}</text>
        <text x="205" text-anchor="end" font-family="${MONO}" font-size="13" fill="${t.muted}">${(l.share * 100).toFixed(1)}%</text>
      </g></g>`;
    })
    .join('');

  const body = `
  ${title(t, ICONS.drill, 'Testigo de perforación', 'lenguajes · repos públicos')}
  <defs>
    <clipPath id="core"><rect x="${x0}" y="${y0}" width="${cw}" height="${ch}" rx="10"/></clipPath>
    <clipPath id="reveal"><rect x="${x0}" y="${y0 - 4}" width="${cw}" height="${ch + 8}">
      <animate attributeName="width" values="0;${cw}" dur="1.8s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.5 0 0.2 1"/>
    </rect></clipPath>
    <linearGradient id="cyl" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.38"/>
      <stop offset="0.35" stop-color="#fff" stop-opacity="0.05"/>
      <stop offset="0.7" stop-color="#000" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.32"/>
    </linearGradient>
  </defs>
  ${ticks}
  <rect x="${x0}" y="${y0}" width="${cw}" height="${ch}" rx="10" fill="${t.faint}" fill-opacity="0.35"/>
  <g clip-path="url(#reveal)"><g clip-path="url(#core)">
    ${rects}
    ${cracks}
    <rect x="${x0}" y="${y0}" width="${cw}" height="${ch}" fill="url(#cyl)"/>
  </g></g>
  <line x1="${x0}" x2="${x0 + cw}" y1="158" y2="158" stroke="${t.border}"/>
  ${legend}`;

  return frame(t, W, H, body, 'Lenguajes más usados');
}


function projectCard(t, f, repo) {
  const W = 500;
  const H = 206;
  const accent = t[f.accent];
  const lines = wrap(f.text, 60).slice(0, 3);
  const desc = lines
    .map((l, i) => `<text x="24" y="${104 + i * 21}" font-family="${SANS}" font-size="14.5" fill="${t.text}" fill-opacity="0.82">${esc(l)}</text>`)
    .join('');

  let px = 24;
  const pills = [];
  const lang = repo.primaryLanguage;
  for (const [i, label] of [lang?.name, ...f.tags].filter(Boolean).entries()) {
    const color = i === 0 && lang ? lang.color || t.muted : accent;
    const p = pill(px, 160, label, color, t, { size: 12.5, charW: 7.1, pad: 10, dot: i === 0 });
    if (px + p.w > W - 24) break;
    pills.push(p.svg);
    px += p.w + 8;
  }

  const body = `
  <defs>
    <linearGradient id="emb" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect x="24" y="24" width="46" height="46" rx="12" fill="url(#emb)"/>
  <text x="47" y="53.5" text-anchor="middle" font-family="${SANS}" font-size="17" font-weight="800" fill="${t.card}">${f.initials}</text>
  <text x="84" y="45" font-family="${SANS}" font-size="20" font-weight="700" fill="${t.text}">${esc(repo.name)}</text>
  <text x="84" y="65" font-family="${MONO}" font-size="12" fill="${t.muted}">${esc(`${LOGIN}/${repo.name}`)}</text>
  <g transform="translate(${W - 24 - 14 - fmt(repo.stargazerCount).length * 8.4 - 6} 32) scale(0.6)">${ICONS.star(t.gold)}</g>
  <text x="${W - 24}" y="45" text-anchor="end" font-family="${MONO}" font-size="14" font-weight="700" fill="${t.text}">${fmt(repo.stargazerCount)}</text>
  <text x="${W - 24}" y="65" text-anchor="end" font-family="${MONO}" font-size="11.5" fill="${t.muted}">act. ${monthYear(repo.pushedAt)}</text>
  ${desc}
  ${pills.join('')}`;

  return frame(t, W, H, body, repo.name);
}

const CODE = [
  'import minelab as ml',
  '',
  '# Economía minera, VAN del proyecto',
  'van = ml.npv(rate=0.10,',
  '    cashflows=[-100_000, 30_000, 45_000])',
  '',
  '# Voladura, fragmentación Kuz-Ram',
  'x50 = ml.kuz_ram_x50(powder_factor=0.5,',
  '    rock_factor=8.0, charge_weight=150.0)',
  '',
  '# Procesamiento, recuperación por flotación',
  'rec = ml.flotation_recovery(feed_grade=1.2,',
  '    concentrate_grade=28.0, tail_grade=0.15)',
];

const MODULES = [
  'utilities', 'geostatistics', 'mine_planning', 'geomechanics', 'mineral_processing', 'equipment',
  'drilling_blasting', 'ventilation', 'economics', 'environmental', 'production',
  'resource_classification', 'data_management', 'underground_mining', 'hydrogeology', 'surveying',
];

// Resaltado sencillo de Python para la ventana de código
const SYNTAX = { kw: '#c792ea', fn: '#82aaff', num: '#f78c6c', cm: '#6f7f99', tx: '#e6edf3' };
function highlight(line) {
  if (line.trim().startsWith('#')) return `<tspan fill="${SYNTAX.cm}">${esc(line)}</tspan>`;
  return line
    .split(/(\bimport\b|\bas\b|[A-Za-z_][A-Za-z0-9_]*(?=\()|(?<![A-Za-z0-9_])-?\d[\d_]*\.?\d*)/)
    .filter(Boolean)
    .map((tok) => {
      const color = /^(import|as)$/.test(tok) ? SYNTAX.kw : /^[A-Za-z_][A-Za-z0-9_]*$/.test(tok) && line.includes(`${tok}(`) ? SYNTAX.fn : /^-?\d/.test(tok) ? SYNTAX.num : SYNTAX.tx;
      return `<tspan fill="${color}">${esc(tok)}</tspan>`;
    })
    .join('');
}

function spotlight(t, repo, version) {
  const W = 1000;
  const H = 420;
  const stats = [
    ['388', 'funciones'],
    ['16', 'módulos'],
    ['897', 'tests'],
    ['94%', 'cobertura'],
  ]
    .map(([n, label], i) => {
      const x = 36 + (i % 2) * 210;
      const y = 214 + Math.floor(i / 2) * 64;
      return `<g transform="translate(${x} ${y})"><g class="rise" style="animation-delay:${(0.2 + i * 0.1).toFixed(2)}s">
        <text font-family="${SANS}" font-size="38" font-weight="800" fill="url(#num)">${n}</text>
        <text x="${[...n].reduce((a, c) => a + (c === '%' ? 33 : 22), 10)}" font-family="${SANS}" font-size="15" fill="${t.muted}">${label}</text>
      </g></g>`;
    })
    .join('');

  let px = 36;
  const pills = [
    [`PyPI v${version}`, t.copper],
    [`${fmt(repo.stargazerCount)} estrellas`, t.gold],
    ['Python 3.10+', t.teal],
    ['MIT', t.violet],
  ]
    .map(([label, color]) => {
      const p = pill(px, 334, label, color, t, { size: 13, charW: 7.4, pad: 11 });
      px += p.w + 8;
      return p.svg;
    })
    .join('');

  const cx = 512;
  const cw = W - cx - 36;
  const code = CODE.map(
    (line, i) =>
      `<text x="${cx + 22}" y="${96 + i * 19.5}" font-family="${MONO}" font-size="12.8" xml:space="preserve" class="rise" style="animation-delay:${(0.3 + i * 0.07).toFixed(2)}s">${highlight(line)}</text>`,
  ).join('');

  const ticker = MODULES.join('   ·   ') + '   ·   ';
  const tw = ticker.length * 7.8;
  const tick = [0, tw]
    .map((x) => `<text x="${x}" y="0" font-family="${MONO}" font-size="13" fill="${t.muted}" textLength="${tw.toFixed(1)}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">${esc(ticker)}</text>`)
    .join('');

  const body = `
  <defs>
    <linearGradient id="num" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${t.copper}"/>
      <stop offset="1" stop-color="${t.gold}"/>
    </linearGradient>
    <linearGradient id="emb" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${t.copper}"/>
      <stop offset="1" stop-color="${t.gold}"/>
    </linearGradient>
    <clipPath id="tick"><rect x="1" y="378" width="${W - 2}" height="40"/></clipPath>
  </defs>
  <rect x="36" y="36" width="60" height="60" rx="16" fill="url(#emb)"/>
  <g transform="translate(48 48) scale(1.5)">${ICONS.pick(t.card)}</g>
  <text x="112" y="66" font-family="${SANS}" font-size="34" font-weight="800" fill="${t.text}">MineLab</text>
  <text x="114" y="90" font-family="${MONO}" font-size="13" fill="${t.muted}">pip install minelab</text>
  <text x="36" y="140" font-family="${SANS}" font-size="18" fill="${t.text}" fill-opacity="0.88">La caja de herramientas de Python que todo</text>
  <text x="36" y="166" font-family="${SANS}" font-size="18" fill="${t.text}" fill-opacity="0.88">ingeniero de minas merece tener.</text>
  ${stats}
  ${pills}

  <rect x="${cx}" y="36" width="${cw}" height="324" rx="12" fill="#0b1020" stroke="${t.border}"/>
  <path d="M${cx} 48a12 12 0 0 1 12-12h${cw - 24}a12 12 0 0 1 12 12v18H${cx}z" fill="#141b2e"/>
  <circle cx="${cx + 20}" cy="51" r="5" fill="#ff5f57"/><circle cx="${cx + 38}" cy="51" r="5" fill="#febc2e"/><circle cx="${cx + 56}" cy="51" r="5" fill="#28c840"/>
  <text x="${cx + cw / 2}" y="55" text-anchor="middle" font-family="${MONO}" font-size="12" fill="#8b98ab">inicio_rapido.py</text>
  ${code}
  <rect x="${(cx + 24 + CODE.at(-1).length * 12.8 * 0.56).toFixed(1)}" y="${96 + (CODE.length - 1) * 19.5 - 13}" width="8" height="16" fill="${t.copper}" opacity="0">
    <animate attributeName="opacity" values="0;1;0" dur="1s" begin="1.4s" repeatCount="indefinite"/>
  </rect>

  <line x1="0" x2="${W}" y1="378" y2="378" stroke="${t.border}"/>
  <g clip-path="url(#tick)"><g transform="translate(0 404)">
    <g>${tick}<animateTransform attributeName="transform" type="translate" values="0 0;-${tw.toFixed(1)} 0" dur="60s" repeatCount="indefinite"/></g>
  </g></g>`;

  return frame(t, W, H, body, 'MineLab, librería de Python para ingeniería de minas');
}

const user = await fetchData();
const pypi = await fetch('https://pypi.org/pypi/minelab/json')
  .then((r) => r.json())
  .then((d) => d.info.version)
  .catch(() => null);
const s = summarize(user);
const updated = new Date().toISOString().slice(0, 10);
const out = new URL('../dist/', import.meta.url);
mkdirSync(out, { recursive: true });

for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(new URL(`stats-${name}.svg`, out), statsCard(t, s, updated));
  writeFileSync(new URL(`langs-${name}.svg`, out), langsCard(t, s));
  const minelab = s.repos.get('MineLab');
  if (minelab && pypi) writeFileSync(new URL(`minelab-${name}.svg`, out), spotlight(t, minelab, pypi));
  for (const f of FEATURED) {
    const repo = s.repos.get(f.repo);
    if (!repo) {
      console.warn(`No encontré ${f.repo} entre los repos públicos`);
      continue;
    }
    writeFileSync(new URL(`card-${f.repo.toLowerCase()}-${name}.svg`, out), projectCard(t, f, repo));
  }
}
console.log(`tarjetas listas (${s.metrics.map(([k, v]) => `${k} ${v}`).join(', ')})`);
