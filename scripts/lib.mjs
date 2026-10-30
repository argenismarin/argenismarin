// Utilidades compartidas para generar los SVG del perfil

export const THEMES = {
  dark: {
    bg1: '#0b1120',
    bg2: '#131c33',
    card: '#0f172a',
    border: '#24314d',
    text: '#e6edf3',
    muted: '#8b98ab',
    faint: '#3a4763',
    copper: '#f2994a',
    gold: '#f2c94c',
    teal: '#2dd4bf',
    violet: '#a78bfa',
    blue: '#60a5fa',
    shine: '#ffffff',
  },
  light: {
    bg1: '#fbfaf7',
    bg2: '#f1ede4',
    card: '#ffffff',
    border: '#e2dccf',
    text: '#1f2937',
    muted: '#5f6b7a',
    faint: '#cfc6b4',
    copper: '#c2410c',
    gold: '#b7791f',
    teal: '#0f766e',
    violet: '#6d28d9',
    blue: '#2563eb',
    shine: '#ffffff',
  },
};

export const SANS = "'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif";
export const MONO = "SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace";

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const fmt = (n) => Number(n).toLocaleString('es-CO');

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const monthYear = (iso) => {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

// Onda que se repite cada `width` px para poder desplazarla sin cortes
export function wavePath({ width, baseline, amp, periods, phase = 0, bottom, step = 12 }) {
  const pts = [];
  for (let x = 0; x <= width * 2; x += step) {
    const t = (x / width) * Math.PI * 2 * periods + phase;
    const y = baseline + amp * Math.sin(t) + amp * 0.35 * Math.sin(t * 2 + phase * 1.7);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M0,${bottom} L${pts.join(' L')} L${width * 2},${bottom} Z`;
}

// Curva de nivel cerrada con forma irregular, como en un mapa topográfico
export function contourPath(cx, cy, r, seed) {
  const pts = [];
  const n = 72;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.13 * Math.sin(3 * a + seed) + 0.07 * Math.sin(5 * a + seed * 2.1) + 0.04 * Math.cos(2 * a - seed);
    pts.push(`${(cx + r * k * Math.cos(a)).toFixed(1)},${(cy + r * k * 0.82 * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

// Brillo que cruza la tarjeta de lado a lado
export function shine(id, w, h, t, dur = 7) {
  return `
  <linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="${t.shine}" stop-opacity="0"/>
    <stop offset="0.5" stop-color="${t.shine}" stop-opacity="0.07"/>
    <stop offset="1" stop-color="${t.shine}" stop-opacity="0"/>
  </linearGradient>
  <rect x="${-w * 0.6}" y="0" width="${w * 0.5}" height="${h}" fill="url(#${id})" transform="skewX(-18)">
    <animateTransform attributeName="transform" type="translate" values="0 0;0 0;${w * 1.9} 0" keyTimes="0;0.7;1" dur="${dur}s" repeatCount="indefinite" additive="sum"/>
  </rect>`;
}

// Etiqueta tipo píldora con ancho fijo para que no dependa de la fuente del visitante
export function pill(x, y, label, color, t, { size = 13, charW = 7.4, pad = 12, dot = true } = {}) {
  const textW = label.length * charW;
  const dotW = dot ? 14 : 0;
  const w = textW + pad * 2 + dotW;
  const h = size + 14;
  const svg = `
  <g transform="translate(${x} ${y})">
    <rect width="${w.toFixed(1)}" height="${h}" rx="${h / 2}" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-opacity="0.45"/>
    ${dot ? `<circle cx="${pad + 4}" cy="${h / 2}" r="4" fill="${color}"/>` : ''}
    <text x="${pad + dotW}" y="${h / 2 + size * 0.36}" font-family="${SANS}" font-size="${size}" font-weight="600" fill="${t.text}" textLength="${textW.toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(label)}</text>
  </g>`;
  return { svg, w };
}

// Parte un texto en líneas de como máximo `max` caracteres
export function wrap(text, max) {
  const lines = [];
  let cur = '';
  for (const word of text.split(' ')) {
    if ((cur + ' ' + word).trim().length > max) {
      lines.push(cur);
      cur = word;
    } else cur = (cur + ' ' + word).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

// Íconos de 24 px dibujados con trazos
export const ICONS = {
  pick: (c) =>
    `<path d="M3 21 L16 8" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><path d="M8 2 Q22 2.5 22.5 16.5 Q18 6.5 8 2 Z" fill="${c}" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/>`,
  drill: (c) =>
    `<g fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M8 3h8v5H8z"/><path d="M10 8v4l2 9 2-9V8"/><path d="M10.5 13.5l3-1.5M10.8 16.5l2.6-1.3"/></g>`,
  eye: (c) =>
    `<g fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3.2"/></g>`,
  bolt: (c) => `<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`,
  spark: (c) =>
    `<g fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.2 3.2M15.8 15.8L19 19M5 19l3.2-3.2M15.8 8.2L19 5"/><circle cx="12" cy="12" r="2.2"/></g>`,
  devices: (c) =>
    `<g fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M2 4h14v10H2z"/><path d="M6 18h6M9 14v4"/><path d="M18 8h4v12h-4z"/></g>`,
  server: (c) =>
    `<g fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 3h18v7H3zM3 14h18v7H3z"/><path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6"/></g>`,
  chart: (c) =>
    `<g fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16v-4M11.5 16V8M16 16v-6M20 16V5"/></g>`,
  bell: (c) =>
    `<g fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M2 19.5c3.5 0 4.5-6.5 6.5-10.5S11 4.5 12 4.5s2 1 3.5 4.5 3 10.5 6.5 10.5"/><circle cx="7" cy="16" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="15.5" cy="15" r="1"/></g>`,
  network: (c) =>
    `<g fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M10.8 7.2l-4.6 9.6M13.2 7.2l4.6 9.6M7.5 19h9"/></g>`,
  chat: (c) =>
    `<g fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 4h16v11H10l-5 4.5V15H4z"/><path d="M8 8.5h8M8 11.5h5"/></g>`,
  star: (c) =>
    `<path d="M12 2.5l2.8 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.2l-6.1 3.6 1.6-6.8-5.2-4.6 6.9-.6z" fill="${c}"/>`,
};
