/* ============================================================
   common.js  (loaded on EVERY page, before the page's own script)

   0. Early setup  stops the page from jumping while it loads
   1. Helpers      $ and esc
   2. ALGOS        the one list that drives the landing page tabs
                   and the top navigation bar
   3. mountNav()   builds the top bar   -> <header id="siteNav">
      mountFooter() builds the footer   -> <footer id="siteFooter">
   4. Keep data    remembers the graph you typed on each algorithm
                   page, so switching pages does not lose it.
                   The Clear button is the only thing that empties it.

   IMPORTANT for no page jump: load this file in <head>, and call
   mountNav() right after <header id="siteNav"></header>. See the
   note at the bottom of this file.

   To add a 4th algorithm later: add one object to ALGOS. Done.
   ============================================================ */

/* ---------- 0. Early setup ----------
   Always reserve the scrollbar's space. Without this the page shifts sideways
   by about 15px the moment the content becomes taller than the window. */
document.head.insertAdjacentHTML('beforeend', '<style>html{overflow-y:scroll}</style>');

/* ---------- 1. Helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Small decorative graph drawn on each landing tab.
   Thick black lines = the part the algorithm picks. */
const art = (nodes, thin, thick, dashed = []) => {
  const line = (a, b, cls) => `<line class="${cls}" x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}"/>`;
  return `<svg viewBox="0 0 200 100" aria-hidden="true" focusable="false">`
    + thin.map(([a, b]) => line(a, b, 'thin')).join('')
    + dashed.map(([a, b]) => line(a, b, 'dash')).join('')
    + thick.map(([a, b]) => line(a, b, 'thick')).join('')
    + nodes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('')
    + `</svg>`;
};
const N = [[20, 50], [70, 14], [70, 86], [130, 50], [180, 22], [180, 78]];
const ALL = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 5]];

/* ---------- 2. ALGOS ---------- */
const ALGOS = [
  {
    id: 'dijkstra', name: 'Dijkstra', href: 'dijkstra.html',
    desc: 'Find the shortest path from one vertex to every other vertex, one label at a time.',
    art: art(N, ALL, [[0, 2], [2, 3], [3, 5]])
  },
  {
    id: 'prims', name: "Prim's", href: 'prims.html',
    desc: 'Grow a minimum spanning tree from a starting vertex by always adding the cheapest edge.',
    art: art(N, ALL, [[0, 1], [0, 2], [2, 3], [3, 4], [3, 5]])
  },
  {
    id: 'kruskal', name: "Kruskal's", href: 'kruskal.html',
    desc: 'Build a minimum spanning tree by sorting edges and skipping any edge that makes a cycle.',
    art: art(N, ALL.filter(e => !((e[0] === 1 && e[1] === 2))), [[0, 1], [0, 2], [3, 4], [3, 5], [2, 3]], [[1, 3]])
  }
];

/* ---------- 3. Top bar and footer ---------- */
/* `active` = the id of the current page (or omit on the landing page). */
function mountNav(active) {
  const el = $('siteNav');
  if (!el) return;
  el.className = 'nav';
  el.innerHTML = `<div class="wrap">
    <a class="brand" href="index.html"><span class="mark"></span>Algorithm Lab</a>
    <nav class="links" aria-label="Algorithms">${ALGOS.map(a =>
      `<a href="${a.href}"${a.id === active ? ' class="on" aria-current="page"' : ''}>${esc(a.name)}</a>`).join('')}</nav>
  </div>`;
}

function mountFooter() {
  const el = $('siteFooter');
  if (!el) return;
  el.innerHTML = `<div class="wrap">Algorithm Lab. Runs entirely in your browser.</div>`;
}

/* ---------- 4. Keep the graph when you switch pages ----------
   Works on any page that has #inputCard and #edges (Dijkstra, Prim's, Kruskal's).
   It saves everything in the input card (vertices, edge rows, source, target, checkboxes)
   in this browser when you leave the page, and puts it back when you return.
   Nothing in the page scripts needs to change. */
(function () {
  const KEY = 'algolab:' + (location.pathname.split('/').pop() || 'index.html');
  const ready = () => $('inputCard') && $('edges');

  const read = () => ({
    fields: Object.fromEntries([...document.querySelectorAll('#inputCard input[id], #inputCard select[id]')]
      .map(el => [el.id, el.type === 'checkbox' ? el.checked : el.value])),
    edges: [...document.querySelectorAll('#edges .row')]
      .map(r => [...r.querySelectorAll('input,select')].map(el => el.value))
  });

  function save() {
    if (!ready()) return;
    try {
      const s = read();
      const empty = !s.fields.verts && s.edges.every(r => r.slice(0, 3).every(v => v === ''));
      if (empty) localStorage.removeItem(KEY);          // the Clear button leaves nothing to restore
      else localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) { /* storage blocked: the page still works, it just will not remember */ }
  }

  function restore() {
    if (!ready()) return;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* ignore */ }
    if (!s) return;
    Object.entries(s.fields || {}).forEach(([id, v]) => {
      const el = $(id);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
    });
    const box = $('edges');
    box.innerHTML = '';
    (s.edges && s.edges.length ? s.edges : [[]]).forEach(vals => {
      $('addEdge').click();                              // the page's own "Add edge" creates a proper row
      [...box.lastElementChild.querySelectorAll('input,select')].forEach((el, i) => {
        if (vals[i] !== undefined) el.value = vals[i];
      });
    });
    // redraw the graph and steps with the restored data
    if (typeof window.run === 'function') window.run();
    else $('inputCard').dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* page scripts run first (they sit at the end of <body>), then we restore */
  document.addEventListener('DOMContentLoaded', restore);
  addEventListener('pagehide', save);                    // fires when you click another page in the nav
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  document.addEventListener('input', save);              // and while typing
})();
