# Algorithm Lab

Open `index.html` in a browser (no build step, no server needed).

```
index.html        landing page (three full-width tabs)
dijkstra.html     finished (shortest path visualizer)
prims.html        finished (minimum spanning tree visualizer)
kruskal.html      finished (minimum spanning tree visualizer)
css/base.css      ALL shared styling (colours are the variables at the top)
css/landing.css   landing page only
css/dijkstra.css  Dijkstra-only bits (legend, chips)
css/prims.css     Prim-only bits (legend, chips, cut edges, vertex table)
css/kruskal.css   Kruskal-only bits (legend, chips, sorted edge table)
js/common.js      shared helpers + the ALGOS list that builds the tabs and top bar
js/dijkstra.js    Dijkstra logic and UI
js/prims.js       Prim's logic and UI
js/kruskal.js     Kruskal's logic and UI
```

## Features Across All Algorithms
1. **Interactive Graph Building**: Type vertices or a count, add edges with weights in the table, or draw edges directly by clicking two vertices in the SVG graph.
2. **Direct Weight Editing**: Click any edge weight badge directly on the SVG graph to edit it in place.
3. **Step-by-Step Mathematical Visualizations**:
   - **Dijkstra**: Minimum temporary label selection, neighbor distance relaxation, previous-hop tracking, shortest path highlight.
   - **Kruskal**: Sorted edge table, component cycle detection, cumulative weight, minimum spanning tree/forest output.
   - **Prim**: Start vertex selection, cut edge inspection, cheapest cut bridge selection, candidate key/parent updates, vertex key table per iteration.
4. **Interactive Graph Stepping**: Step forward and backward using Previous/Next buttons or click directly on any iteration card to inspect that step's graph state.
5. **No External Dependencies**: Works completely offline in any modern browser without builds, servers, or external libraries.
