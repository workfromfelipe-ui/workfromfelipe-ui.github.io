/* TEMPORARY palette chooser (owner, 19 Nov): a small button, top left, that recolours the whole site so palettes can
   be compared on the live preview. Remove this file and its <script> tag in Base.astro once a palette is chosen,
   then write the chosen colours into global.css properly.
   How it works: every colour in the stylesheets is read once, then repainted through the chosen palette's rule.
   The logo, skin-tone swatches and photographs are never touched. */
(() => {
  const hsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return [h, s, l];
  };
  const rgb = (h, s, l) => {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [r, g, b].map((v) => Math.round((v + m) * 255));
  };
  const grey = (l) => rgb(240, 0.03, l);
  const palettes = {
    rose: { name: 'Rose quartz', dots: ['#5a2a3c', '#e3b7b0', '#c8a26a'], map: null },
    blood: {
      name: 'Blood red', dots: ['#8a0b14', '#8e8e93', '#ffffff'],
      vars: { '--ink': '#2b2b2e', '--muted': '#5f5f63' },
      map: (r, g, b) => {
        const [h, s, l] = hsl(r, g, b);
        if (s < 0.06) return [r, g, b]; // already white, black or grey
        const wine = h >= 300 || h < 5;
        if (wine && l < 0.5) return rgb(355, l < 0.2 ? 0.78 : 0.86, l < 0.2 ? l * 0.9 : l); // mulberry family -> blood red
        return grey(l > 0.9 ? Math.min(0.985, l + 0.02) : l); // rose, cream and gold -> greys
      },
    },
  };
  const KEY = 'sk-palette';
  const SKIP = /logo|mark|tone|swatch|face-disc|pal-/;
  const COL = /#([0-9a-f]{6})\b|rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/gi;
  let book = null; // [style, property, original value, priority]
  const read = () => {
    book = [];
    const walk = (rules) => {
      for (const rule of rules) {
        if (rule.cssRules && rule.cssRules.length) walk(rule.cssRules);
        const st = rule.style;
        if (!st || SKIP.test(rule.selectorText || '')) continue;
        for (let i = 0; i < st.length; i++) {
          const p = st[i], v = st.getPropertyValue(p);
          COL.lastIndex = 0;
          if (COL.test(v)) book.push([st, p, v, st.getPropertyPriority(p)]);
        }
      }
    };
    for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* another site's sheet */ } }
  };
  let pin = null;
  const paint = (id) => {
    const pal = palettes[id] || palettes.rose;
    if (!book) { if (!pal.map) return; read(); }
    for (const [st, p, v, pr] of book) {
      st.setProperty(p, pal.map ? v.replace(COL, (m, hex, r, g, b) => {
        const from = hex ? [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) : [+r, +g, +b];
        const to = pal.map(...from);
        return hex ? '#' + to.map((n) => n.toString(16).padStart(2, '0')).join('') : m.slice(0, m.indexOf('(') + 1) + to.join(' ');
      }) : v, pr);
    }
    const root = document.documentElement;
    for (const k of ['--ink', '--muted']) root.style.removeProperty(k);
    if (pal.vars) for (const k in pal.vars) root.style.setProperty(k, pal.vars[k]);
    // The logo keeps the clinic's own colours whatever the palette.
    if (!pin) { pin = document.createElement('style'); document.head.append(pin); }
    pin.textContent = pal.map ? '.logo,.mark,.foot-mark,.spin-logo{--petrol:#5a2a3c;--petrol-deep:#2a0f1b;--rose:#e3b7b0;--brass:#c8a26a;--ink:#5a2a3c}' : '';
    root.dataset.palette = id;
  };
  let now = 'rose';
  try { now = localStorage.getItem(KEY) || 'rose'; } catch { /* private window */ }
  if (!palettes[now]) now = 'rose';
  paint(now);
  // Styles that arrive after this script (slow connections, the dev server) are picked up once the page has loaded:
  // put the original colours back, read every sheet again, repaint.
  const refresh = () => {
    if (!palettes[now].map) return;
    if (book) for (const [st, p, v, pr] of book) st.setProperty(p, v, pr);
    book = null; paint(now);
  };
  document.addEventListener('DOMContentLoaded', refresh);
  addEventListener('load', () => { refresh(); setTimeout(refresh, 1200); });

  const css = document.createElement('style');
  css.textContent = `.pal-box{position:fixed;left:.5rem;top:.5rem;z-index:2147483000;font:500 13px/1.2 system-ui,sans-serif;color:#222}
@media(min-width:721px){.pal-box{top:10rem;left:.75rem}}
.pal-btn{display:grid;place-items:center;width:2.4rem;height:2.4rem;padding:0;border:1px solid rgb(0 0 0/.15);border-radius:50%;background:#fff;box-shadow:0 4px 14px rgb(0 0 0/.18);cursor:pointer}
.pal-btn i,.pal-opt i{display:block;width:1.35rem;height:1.35rem;border-radius:50%;border:1px solid rgb(0 0 0/.12)}
.pal-list{position:absolute;left:0;top:2.8rem;display:none;min-width:11.5rem;padding:.35rem;border-radius:.9rem;background:#fff;box-shadow:0 8px 28px rgb(0 0 0/.22)}
.pal-box.open .pal-list{display:block}
.pal-opt{display:flex;align-items:center;gap:.55rem;width:100%;padding:.5rem .6rem;border:0;border-radius:.6rem;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer}
.pal-opt[aria-pressed=true]{background:#f0f0f2;font-weight:700}
.pal-opt span{display:flex}.pal-opt span i{width:1rem;height:1rem;margin-right:-.3rem}`;
  document.head.append(css);
  const grad = (d) => `conic-gradient(${d[0]} 0 33.3%,${d[1]} 0 66.6%,${d[2]} 0)`;
  const box = document.createElement('div');
  box.className = 'pal-box';
  box.innerHTML = `<button class="pal-btn" type="button" aria-label="Choose a colour palette" aria-expanded="false"><i></i></button><div class="pal-list">${Object.entries(palettes).map(([id, p]) => `<button class="pal-opt" type="button" data-pal="${id}"><span>${p.dots.map((c) => `<i style="background:${c}"></i>`).join('')}</span>${p.name}</button>`).join('')}</div>`;
  const btn = box.querySelector('.pal-btn');
  const sync = () => {
    btn.firstChild.style.background = grad(palettes[now].dots);
    box.querySelectorAll('.pal-opt').forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.pal === now)));
  };
  btn.addEventListener('click', () => btn.setAttribute('aria-expanded', String(box.classList.toggle('open'))));
  box.querySelector('.pal-list').addEventListener('click', (e) => {
    const o = e.target.closest('.pal-opt'); if (!o) return;
    now = o.dataset.pal; paint(now); sync();
    try { localStorage.setItem(KEY, now); } catch { /* private window */ }
    box.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('click', (e) => { if (!box.contains(e.target)) box.classList.remove('open'); });
  sync();
  document.body.append(box);
})();
