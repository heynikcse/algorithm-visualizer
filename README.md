# Algorithm Lab

Step-by-step visualizers for **Dijkstra's**, **Prim's** and **Kruskal's** graph algorithms. Build your own graph, then read every iteration and watch the graph change.

**Live demo:** https://algorithm-visualizer-murex-iota.vercel.app

No build step, no install, no server. It is plain HTML, CSS and JavaScript.

---

## Run it on Windows (from GitHub)

### Option 1: Download the ZIP (easiest, no tools needed)
1. Open the repository on GitHub.
2. Click the green **Code** button, then **Download ZIP**.
3. Right-click the downloaded ZIP and choose **Extract All**.
4. Open the extracted folder and double-click **`index.html`**. It opens in your browser.

### Option 2: Clone with Git
Open **PowerShell** or **Command Prompt** and run:

```powershell
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
start index.html
```

`start index.html` opens the landing page in your default browser.

### Option 3: VS Code with Live Server (best for editing)
1. Open the project folder in **VS Code**.
2. Install the **Live Server** extension.
3. Right-click `index.html` and choose **Open with Live Server**.
4. The page reloads by itself every time you save a file.

> Keep the folder structure as it is (see below). The pages load their CSS and JS using relative paths.

---

## Project structure

```
algo-lab/
├── index.html          Landing page (three full-width algorithm tabs)
├── dijkstra.html       Dijkstra's shortest path visualizer
├── prims.html          Prim's minimum spanning tree visualizer
├── kruskal.html        Kruskal's minimum spanning tree visualizer
├── css/
│   ├── base.css        ALL shared styling (colours are the variables at the top)
│   ├── landing.css     Landing page only
│   ├── dijkstra.css    Dijkstra-only bits (legend, chips)
│   ├── prims.css       Prim-only bits (legend, chips, cut edges, matrix table)
│   └── kruskal.css     Kruskal-only bits (legend, chips, sorted edge table)
├── js/
│   ├── common.js       Shared helpers, the ALGOS list (builds the tabs and top bar),
│   │                   and the code that keeps your graph when you switch pages
│   ├── dijkstra.js     Dijkstra logic and UI
│   ├── prims.js        Prim's logic and UI
│   └── kruskal.js      Kruskal's logic and UI
└── README.md
```

---

## How to use

1. Pick an algorithm on the landing page.
2. Type your **vertices**. Names like `a, b, c` work, or type just a number like `5` to get vertices `1` to `5`. The nodes appear straight away.
3. Add **edges** in the table (from, to, weight), or draw them on the graph (see below).
4. Choose the **start / source vertex** (and an optional **target** on the Dijkstra page).
5. Read the **Steps** and use **Previous / Next** to move through the iterations. Tap any iteration card to see the graph at that moment.
6. Use **Load example** to try a ready-made graph and **Clear** to start again.

---

## Features

1. **Interactive graph building**
   - Type vertices or a count, and fill in the edge table.
   - Draw edges on the graph: tap one vertex, tap a second vertex, type the weight and press Enter. The edge is added to the table.
   - Tap any weight on the graph to edit it. The table updates too, and the table updates the graph.
2. **Your graph is kept when you switch pages**
   - The data on each algorithm page is saved in your browser. Go to another algorithm and come back and it is still there.
   - Only the **Clear** button empties it.
3. **Step-by-step explanations**
   - **Dijkstra:** temporary and permanent labels `[distance, previous vertex]`, the minimum-label step, neighbour updates, an optional target with early stop, directed or undirected edges, and the shortest path traced back through the labels.
   - **Prim's:** the weight matrix `W = W(G)`, a start vertex, marked rows and deleted columns, the smallest candidate entry in each iteration, one iteration per vertex, and the final minimum spanning tree.
   - **Kruskal's:** a sorted edge table, cycle detection with components, cumulative weight, and the minimum spanning tree or forest.
4. **Graph view**
   - Visited or tree vertices are filled and numbered in the order they were added.
   - The chosen edges, the path to the target and the candidate edges are highlighted.
5. **Responsive boxy design**
   - Orange and white theme with black text, working on desktop, tablet and phone.

---

## Deployment (Vercel)

The project is deployed on **Vercel** and connected to this GitHub repository:

- **Live site:** https://algorithm-visualizer-murex-iota.vercel.app
- Every push to the main branch updates the **Production** site automatically.
- Other branches and pull requests get a **Preview** deployment.

To deploy your own copy:
1. Push the project to a GitHub repository.
2. On [vercel.com](https://vercel.com), choose **Add New, Project** and import the repository.
3. Set **Framework Preset** to **Other**. Leave the build command and output directory empty.
4. Click **Deploy**.

---

## Adding a new algorithm

1. Copy one of the algorithm pages (for example `kruskal.html`) and its `css/` and `js/` files, then rename them.
2. Add one object to the `ALGOS` list in `js/common.js`: `id`, `name`, `href`, `desc` and `art`. The landing tab and the top bar update by themselves.

### Page template

Keep the script order the same on every page so the page does not jump while it loads:

```html
<head>
  ...
  <script src="js/common.js"></script>      <!-- loaded in <head> -->
</head>
<body>
  <header id="siteNav"></header>
  <script>mountNav('your-algo-id');</script> <!-- top bar built straight away -->

  <main> ... </main>

  <footer id="siteFooter"></footer>
  <script>mountFooter();</script>
  <script src="js/your-algo.js"></script>    <!-- the page's own script goes last -->
</body>
```

---

## Notes

- Works in any modern browser (Chrome, Edge, Firefox, Safari).
- There are no libraries or build tools. The only outside request is the Google Fonts stylesheet. Without internet the page still works and uses your system fonts.
- Saved graphs are stored in the browser's local storage, so they stay on your own device.