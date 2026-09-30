# Algorithm Lab

Open `index.html` in a browser (no build step, no server needed).

```
index.html        landing page (three full-width tabs)
dijkstra.html     finished
prims.html        template  -> friend builds js/prims.js
kruskal.html      template  -> friend builds js/kruskal.js
css/base.css      ALL shared styling (colours are the variables at the top)
css/landing.css   landing page only
css/dijkstra.css  Dijkstra-only bits (legend, chips)
js/common.js      shared helpers + the ALGOS list that builds the tabs and top bar
js/dijkstra.js    Dijkstra logic and UI
js/prims.js       empty, with notes
js/kruskal.js     empty, with notes
```

## Integrating Prim's / Kruskal's
1. Open `prims.html` (or `kruskal.html`). It already has the top bar, header, Graph / Steps / Result sections and footer.
2. Fill in the `TODO` parts, and write the algorithm in `js/prims.js` / `js/kruskal.js`.
3. Copy patterns from `dijkstra.html` and `js/dijkstra.js`: the edge table, the SVG graph drawing, Previous/Next, step cards.
4. Reuse the classes in `css/base.css` so the page matches. Do not hard-code colours; use the variables (`var(--o)`, `var(--ink)`...).
5. Names, descriptions and links of the tabs live in one place: the `ALGOS` list in `js/common.js`.

Tips: every JS file is a normal script that shares globals. Dijkstra declares `S`, `run`, `go`, `INF`... so those names are free in the other pages, because each page loads only its own script.
