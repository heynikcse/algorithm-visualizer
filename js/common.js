/* ============================================================
   common.js  (loaded on EVERY page, before the page's own script)

   1. Helpers      $ and esc
   2. ALGOS        the one list that drives the landing page tabs
                   and the top navigation bar
   3. mountNav()   builds the top bar   -> <header id="siteNav">
      mountFooter() builds the footer   -> <footer id="siteFooter">

   To add a 4th algorithm later: add one object to ALGOS. Done.
   ============================================================ */

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

/* Top bar. `active` = the id of the current page (or omit on the landing page). */
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
