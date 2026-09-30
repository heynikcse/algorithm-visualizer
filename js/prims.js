/* prims.js  (Prim's algorithm page)
   common.js is already loaded, so you can use:
     $('someId')   -> document.getElementById
     esc(text)     -> safe text for innerHTML

   Suggested structure (same as js/dijkstra.js):
     parse()   read the form   -> { V, E, ... , errs }
     solve(p)  run the algorithm and RECORD every step -> { steps, snaps, result }
     render()  write step cards into #steps and the answer into #final
     drawGraph() draw the current snapshot into #svg
     go(i)     show snapshot i (used by Previous / Next / clicking a step card)
   Use the CSS classes from css/base.css: box, card, it, st, snap, final, row, chip...
*/
