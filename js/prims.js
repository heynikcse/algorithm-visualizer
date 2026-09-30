/* prims.js  (needs js/common.js loaded first: it provides $ and esc)

   Prim's algorithm, weight-matrix method.

   W = W(G) = [w_ij] is an n x n matrix with
     1) w_ii = infinity for 1 <= i <= n
     2) w_ij = w_ji = weight of the edge (V_i, V_j) if V_i and V_j are adjacent
     3) w_ij = w_ji = infinity if V_i and V_j are not adjacent

   Iteration 1      : choose the start vertex. Mark its row (check) and delete its column.
   Iteration 2 .. n : among the entries that lie in a marked row AND an undeleted column, take the
                      smallest one, w_ij. Edge (V_i, V_j) joins the tree. Mark row j, delete column j.
   Stop when every column is deleted: n iterations and n - 1 edges.
   If every candidate entry is infinity, the graph is disconnected and the algorithm stops early.
*/

const INF = Infinity;
const f = x => x === INF ? '∞' : x;
const lab = (d, p) => d === INF ? '[∞, -]' : `[${d}, ${p == null ? '-' : esc(p)}]`;
const nm = (u, v) => `${esc(u)} - ${esc(v)}`;
const edgeKey = (u, v) => u < v ? `${u}--${v}` : `${v}--${u}`;

let S = null, cur = 0;
let sel = null, sel2 = null;
let ed = null;

/* ---------- edge table (input) ---------- */
function addRow(u = '', v = '', w = '') {
  const r = document.createElement('div');
  r.className = 'row k';
  r.innerHTML = `<input aria-label="From" placeholder="From" value="${esc(u)}"><input aria-label="To" placeholder="To" value="${esc(v)}"><input aria-label="Weight" placeholder="Weight" type="number" step="any" value="${esc(w)}"><button class="x" type="button" aria-label="Remove edge">✕</button>`;
  r.querySelector('.x').onclick = () => { r.remove(); run(true); };
  $('edges').appendChild(r);
}

function blank() {
  $('verts').value = '';
  $('src').value = '';
  $('edges').innerHTML = '';
  addRow();
}

function example() {
  $('verts').value = 'a, b, c, d, e, f';
  $('src').value = 'a';
  $('edges').innerHTML = '';
  [
    ['a', 'b', 4], ['a', 'c', 2], ['b', 'c', 1],
    ['b', 'd', 5], ['c', 'd', 8], ['c', 'e', 10],
    ['d', 'e', 2], ['d', 'f', 6], ['e', 'f', 3]
  ].forEach(e => addRow(e[0], e[1], e[2]));
}

$('addEdge').onclick = () => addRow();
$('ex').onclick = () => { example(); run(); };
$('clr').onclick = () => { blank(); run(); };

function parse() {
  const errs = [];
  const toks = $('verts').value.split(/[\s,]+/).filter(Boolean);
  let V;
  if (toks.length === 1 && /^\d+$/.test(toks[0])) {
    const N = +toks[0];
    if (N > 30) errs.push('Up to 30 vertices are supported.');
    V = Array.from({ length: Math.min(N, 30) }, (_, i) => String(i + 1));
  } else {
    V = [...new Set(toks)];
  }

  const E = [];
  let k = 0;
  for (const r of $('edges').children) {
    k++;
    const [a, b, c] = r.querySelectorAll('input');
    const u = a.value.trim(), v = b.value.trim();
    if (!u && !v && c.value === '') continue;
    if (!u || !v || c.value === '') {
      errs.push(`Edge row ${k} is incomplete: fill in from, to and weight.`);
      continue;
    }
    if (!V.includes(u) || !V.includes(v)) {
      errs.push(`Edge row ${k} (${u} - ${v}) uses a vertex that is not in the vertex list.`);
      continue;
    }
    if (isNaN(+c.value)) {
      errs.push(`Edge row ${k} needs a numeric weight.`);
      continue;
    }
    E.push({ u, v, w: +c.value, row: r });
  }

  let src = $('src').value.trim(), okS = true;
  if (!src && V.length) src = V[0];
  if (V.length && !V.includes(src)) {
    errs.push(`Start vertex "${src}" is not in the vertex list.`);
    okS = false;
  }

  return { V, E, s: src, errs, okS };
}

const hint = t => `<div class="box card"><p class="sec-s" style="margin:0">${t}</p></div>`;

function draft(p) {
  return {
    V: p.V,
    E: p.E,
    s: p.s,
    its: [],
    snaps: [{
      justAddedV: null,
      justAddedE: null,
      justAddedW: 0,
      inTreeCount: 0,
      treeVertices: [],
      chosenEdges: [],
      totalWeight: 0,
      L: p.V.map(v => ({ v, key: INF, parent: null, inTree: false, ord: null })),
      cutEdges: []
    }],
    draft: true
  };
}

/* ---------- the weight matrix W = W(G) ---------- */
function buildMatrix(V, E) {
  const n = V.length, idx = {};
  V.forEach((v, i) => idx[v] = i);
  // rules 1 and 3: start with infinity everywhere, so w_ii and non-adjacent pairs stay infinity
  const W = Array.from({ length: n }, () => Array(n).fill(INF));
  const Wi = Array.from({ length: n }, () => Array(n).fill(null)); // which edge gave w_ij
  const cnt = {};
  let loops = 0;
  E.forEach((e, k) => {
    const i = idx[e.u], j = idx[e.v];
    if (i === j) { loops++; return; } // a self-loop never joins two vertices, so w_ii stays infinity
    const key = edgeKey(e.u, e.v);
    (cnt[key] = cnt[key] || { n: 0, label: nm(e.u, e.v) }).n++;
    if (e.w < W[i][j]) { // rule 2: w_ij = w_ji = weight (parallel edges: keep the lightest)
      W[i][j] = W[j][i] = e.w;
      Wi[i][j] = Wi[j][i] = k;
    }
  });
  const dups = Object.values(cnt).filter(c => c.n > 1).map(c => c.label);
  return { W, Wi, idx, dups, loops };
}

function solve({ V, E, s }) {
  const n = V.length, need = n - 1;
  const { W, Wi, idx, dups, loops } = buildMatrix(V, E);

  const marked = new Set();   // marked rows    = vertices already in the tree
  const deleted = new Set();  // deleted columns = the same vertices
  const ord = {};             // vertex -> iteration in which it joined the tree
  const tKey = {}, tPar = {}; // [w, p] label of a vertex once it has joined
  const chosenEdges = [];
  let totalWeight = 0;

  // candidate entries: finite, in a marked row and an undeleted column (top to bottom, left to right)
  const candidates = () => {
    const c = [];
    for (let i = 0; i < n; i++) {
      if (!marked.has(i)) continue;
      for (let j = 0; j < n; j++) if (!deleted.has(j) && W[i][j] < INF) c.push({ i, j, w: W[i][j] });
    }
    return c;
  };

  // label [w, p] shown under a vertex on the graph = smallest entry of its column among the marked rows
  const labelOf = v => {
    const j = idx[v];
    if (marked.has(j)) return { key: tKey[v], parent: tPar[v] };
    let best = INF, bp = null;
    for (let i = 0; i < n; i++) if (marked.has(i) && W[i][j] < best) { best = W[i][j]; bp = V[i]; }
    return { key: best, parent: bp };
  };

  const snap = (justV, justE, justW) => ({
    justAddedV: justV,
    justAddedE: justE,
    justAddedW: justW,
    inTreeCount: marked.size,
    treeVertices: V.filter((v, i) => marked.has(i)).sort((a, b) => ord[a] - ord[b]),
    chosenEdges: chosenEdges.slice(),
    totalWeight,
    L: V.map((v, i) => {
      const l = labelOf(v);
      return { v, key: l.key, parent: l.parent, inTree: marked.has(i), ord: ord[v] || null };
    }),
    cutEdges: candidates().map(c => ({ u: V[c.i], v: V[c.j], w: c.w, i: Wi[c.i][c.j] }))
  });

  const copyState = extra => Object.assign({ marked: new Set(marked), deleted: new Set(deleted), cand: [], chosen: null }, extra);

  const snaps = [snap(null, null, 0)];
  const its = [];
  let stoppedDisconnected = false, stop = null;

  for (let k = 1; k <= n; k++) {
    let v, u = null, w = 0, edgeIdx = null, cand = [], chosen = null, ties = [], mat;

    if (k === 1) {
      v = s;                               // iteration 1: the start vertex
    } else {
      cand = candidates();
      if (!cand.length) {                  // every candidate entry is infinity
        stoppedDisconnected = true;
        stop = { k, mat: copyState({}) };
        break;
      }
      chosen = cand.reduce((b, c) => c.w < b.w ? c : b, cand[0]); // first smallest entry
      ties = cand.filter(c => c !== chosen && c.w === chosen.w);
      u = V[chosen.i]; v = V[chosen.j]; w = chosen.w;
      edgeIdx = Wi[chosen.i][chosen.j];
      mat = copyState({ cand, chosen });   // matrix at the moment of the decision
    }

    // mark the row and delete the column of the new vertex
    const j = idx[v];
    marked.add(j); deleted.add(j);
    ord[v] = marked.size;
    tKey[v] = w; tPar[v] = u;
    if (edgeIdx != null) chosenEdges.push(edgeIdx);
    totalWeight += w;
    if (k === 1) mat = copyState({ cand: candidates() }); // matrix after marking the start row

    its.push({
      k, v, u, w, ord: marked.size, edgeIdx, cand, chosen, ties, mat,
      totalWeight,
      edgesSelected: chosenEdges.length,
      done: marked.size === n
    });
    snaps.push(snap(v, edgeIdx, w));
  }

  const picks = new Set(its.filter(t => t.chosen).map(t => t.chosen.i * n + t.chosen.j));
  return {
    V, E, s, W, Wi, dups, loops, its, snaps, totalWeight,
    chosenEdges,
    complete: marked.size === n,
    need,
    stoppedDisconnected,
    stop,
    finalUnreachable: V.filter((v, i) => !marked.has(i)),
    finalMat: copyState({ picks })
  };
}

/* ---------- drawing ---------- */
function layout(V) {
  const n = V.length, P = {};
  V.forEach((v, i) => {
    const a = -Math.PI / 2 + 2 * Math.PI * i / n;
    P[v] = n === 1 ? { x: 210, y: 170 } : { x: 210 + 140 * Math.cos(a), y: 170 + 125 * Math.sin(a) };
  });
  return P;
}

function chips(sn) {
  const c = x => `<span class="chip ${x.k}">${x.n != null ? `<i>${x.n}</i>` : ''}${esc(x.v)}${x.d != null ? ` <em>${f(x.d)}</em>` : ''}</span>`;
  const tree = sn.treeVertices.map(v => {
    const o = sn.L.find(l => l.v === v);
    return c({ k: 'v', n: o ? o.ord : null, v, d: o ? o.key : 0 });
  });
  const mstEdges = sn.chosenEdges.map((ei, idx) => {
    const e = S.E[ei];
    return `<span class="chip v"><i>${idx + 1}</i>${nm(e.u, e.v)} <em>${e.w}</em></span>`;
  });
  const fringe = sn.L.filter(o => !o.inTree && o.key < INF).sort((a, b) => a.key - b.key).map(o => c({ k: 'f', v: o.v, d: o.key }));
  const unreached = sn.L.filter(o => !o.inTree && o.key === INF).map(o => c({ k: 'u', v: o.v }));

  const row = (t, a) => `<div class="crow"><span class="cl">${t}</span>${a.length ? a.join('') : '<span class="none">none</span>'}</div>`;
  $('chips').innerHTML =
    row('Tree vertices (in order)', tree) +
    row('MST edges (in order)', mstEdges) +
    row('Candidate fringe keys', fringe) +
    row('Not reached yet', unreached);
}

function drawGraph() {
  const { V, E, snaps } = S, sn = snaps[cur], P = layout(V), R = 19;
  const st = {};
  sn.L.forEach(o => st[o.v] = o);
  const chosenSet = new Set(sn.chosenEdges);
  const justAddedEdge = sn.justAddedE;
  const cutEdgeKeys = new Set(sn.cutEdges.map(e => edgeKey(e.u, e.v)));

  const grp = {};
  E.forEach((e, i) => {
    const key = [e.u, e.v].sort().join('\u0001');
    (grp[key] = grp[key] || []).push(i);
  });

  let h = '';
  E.forEach((e, i) => {
    const A = P[e.u], B = P[e.v];
    let body, mx, my;
    if (e.u === e.v) {
      body = `M${A.x - 8} ${A.y - R + 2}C${A.x - 40} ${A.y - 70} ${A.x + 40} ${A.y - 70} ${A.x + 8} ${A.y - R + 2}`;
      mx = A.x; my = A.y - 55;
    } else {
      const g = grp[[e.u, e.v].sort().join('\u0001')];
      const bend = (g.indexOf(i) - (g.length - 1) / 2) * 0.25 * (e.u > e.v ? -1 : 1);
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const cx = (A.x + B.x) / 2 - uy * L * bend, cy = (A.y + B.y) / 2 + ux * L * bend;
      const s = { x: A.x + ux * R, y: A.y + uy * R }, t = { x: B.x - ux * R, y: B.y - uy * R };
      body = `M${s.x} ${s.y}Q${cx} ${cy} ${t.x} ${t.y}`;
      mx = 0.25 * s.x + 0.5 * cx + 0.25 * t.x;
      my = 0.25 * s.y + 0.5 * cy + 0.25 * t.y;
    }

    const inMST = chosenSet.has(i);
    const isJustE = justAddedEdge === i;
    const isCut = !inMST && cutEdgeKeys.has(edgeKey(e.u, e.v));

    let stroke = 'var(--mute)', sw = 1.5, dash = '', op = 0.6;
    if (inMST) {
      stroke = isJustE ? 'var(--ink)' : 'var(--o)';
      sw = isJustE ? 6 : 5;
      op = 1;
    } else if (isCut) {
      stroke = 'var(--o-dark)';
      sw = 2.5;
      dash = '5 4';
      op = 0.9;
    }

    h += `<path d="${body}" fill="none" stroke="${stroke}" stroke-width="${sw}" ${dash ? `stroke-dasharray="${dash}"` : ''} opacity="${op}"/>`;

    const ws = String(e.w), ww = Math.max(28, ws.length * 8 + 14);
    h += `<g class="ew" data-e="${i}" data-x="${mx}" data-y="${my - 9}" tabindex="0" role="button" aria-label="Edit weight of edge ${esc(e.u)} to ${esc(e.v)}">
      <rect x="${mx - ww / 2}" y="${my - 18}" width="${ww}" height="18" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/>
      <text x="${mx}" y="${my - 5}" text-anchor="middle" font-size="12" font-family="JetBrains Mono,monospace" fill="var(--ink)">${esc(e.w)}</text>
    </g>`;
  });

  V.forEach(v => {
    const p = P[v], o = st[v];
    const isCurV = sn.justAddedV === v;
    const isFringe = !o.inTree && o.key < INF;

    h += `<g class="vn" data-v="${esc(v)}" data-x="${p.x}" data-y="${p.y}" tabindex="0" role="button" aria-label="Select vertex ${esc(v)} to draw an edge">`;
    if (v === sel || v === sel2) {
      h += `<circle cx="${p.x}" cy="${p.y}" r="${R + 4}" fill="none" stroke="var(--o)" stroke-width="3"/>`;
    }
    h += `<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${o.inTree ? 'var(--o)' : 'var(--panel)'}" stroke="var(--ink)" stroke-width="${isCurV ? 4 : isFringe ? 2 : o.inTree ? 2 : 1.5}" ${isFringe && !o.inTree ? 'stroke-dasharray="4 3"' : ''}/>`;

    if (o.inTree && o.ord != null) {
      h += `<circle cx="${p.x + R - 3}" cy="${p.y - R + 3}" r="8" fill="var(--bg)" stroke="var(--ink)"/><text x="${p.x + R - 3}" y="${p.y - R + 6.5}" text-anchor="middle" font-size="10" font-family="JetBrains Mono,monospace" fill="var(--ink)">${o.ord}</text>`;
    }
    h += `<text x="${p.x}" y="${p.y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">${esc(v)}</text></g>`;

    const dy = p.y < 170 ? -R - 8 : R + 16;
    if (!S.draft) {
      h += `<text x="${p.x}" y="${p.y + dy}" text-anchor="middle" font-size="11" font-family="JetBrains Mono,monospace" fill="${o.inTree ? 'var(--o-dark)' : isFringe ? 'var(--ink)' : 'var(--mute)'}" font-weight="700">${lab(o.key, o.parent)}</text>`;
    }
  });

  $('svg').innerHTML = h;
  chips(sn);
}

const snapLine = sn => sn.L.map(o =>
  `<span class="${o.inTree ? 'p' : o.key < INF ? 't' : ''}">${o.inTree ? 'Tree' : 'Key'}(${esc(o.v)})</span> = ${lab(o.key, o.parent)}`
).join(',&nbsp; ');

/* ---------- the matrix W shown inside the step cards (uses the existing .etab styles) ---------- */
function matrixHTML(m) {
  const { V, W } = S, n = V.length;
  const cand = new Set((m.cand || []).map(c => c.i * n + c.j));
  const picks = m.picks || new Set();
  let h = '<div class="tabwrap"><table class="etab"><tr><th class="rh" scope="col">W</th>';
  V.forEach((v, j) => {
    h += m.deleted.has(j)
      ? `<th style="color:var(--mute)" title="column deleted"><s>${esc(v)}</s></th>`
      : `<th>${esc(v)}</th>`;
  });
  h += '</tr>';
  V.forEach((v, i) => {
    h += `<tr><th class="rh" scope="row">${esc(v)}${m.marked.has(i) ? ' ✓' : ''}</th>`;
    V.forEach((_, j) => {
      const isChosen = m.chosen && m.chosen.i === i && m.chosen.j === j;
      let cls = '';
      if (isChosen || picks.has(i * n + j)) cls = 'cur';
      else if (m.deleted.has(j)) cls = 'pend';
      else if (cand.has(i * n + j)) cls = 'fringe';
      const strike = cls === 'pend' ? ' style="text-decoration:line-through"' : '';
      h += `<td class="${cls}"${strike}>${f(W[i][j])}</td>`;
    });
    h += '</tr>';
  });
  return h + '</table></div>';
}
const tnote = '<p class="tnote">&#10003; = marked row (vertex already in the tree). Struck-out column = deleted column. Shaded entries = candidates (marked row, undeleted column). Orange = the entry chosen.</p>';

/* ---------- step cards and result ---------- */
function render() {
  if (S.draft) {
    $('steps').innerHTML = hint(S.E.length ? 'Fix the start vertex to see the steps.' : 'Add at least one edge to see the steps.');
    $('final').innerHTML = '';
    return;
  }

  const { its, snaps, V, s, need, complete, finalUnreachable } = S;
  const n = V.length;
  const name = i => esc(V[i]);
  const ent = c => `w(${name(c.i)},${name(c.j)}) = ${c.w}`;

  /* initialisation: build W */
  let h = `<div class="it box" data-i="0"><h3>Initialisation: weight matrix</h3>
    <div class="st"><b>Build W = W(G) = [w<sub>ij</sub>], an n &times; n matrix (n = ${n})</b>
      <div>Vertex order: ${V.map((v, i) => `V<sub>${i + 1}</sub> = ${esc(v)}`).join(', ')}</div>
      <div>1) w<sub>ii</sub> = &infin; for 1 &le; i &le; n</div>
      <div>2) w<sub>ij</sub> = w<sub>ji</sub> = weight of the edge (V<sub>i</sub>, V<sub>j</sub>) if V<sub>i</sub> and V<sub>j</sub> are adjacent</div>
      <div>3) w<sub>ij</sub> = w<sub>ji</sub> = &infin; if V<sub>i</sub> and V<sub>j</sub> are not adjacent</div>
      ${S.dups.length ? `<div>Parallel edges between ${S.dups.join(', ')}: the lightest one is used.</div>` : ''}
      ${S.loops ? `<div>Self-loops are ignored because w<sub>ii</sub> is always &infin;.</div>` : ''}
    </div>
    ${matrixHTML({ marked: new Set(), deleted: new Set(), cand: [], chosen: null })}
    <div class="st"><b>Plan: one iteration per vertex (${n} iterations)</b>
      <div>Iteration 1 chooses the start vertex <b>${esc(s)}</b>, marks its row and deletes its column.</div>
      <div>Each later iteration takes the smallest entry in the marked rows and undeleted columns, adds that edge, marks the new row and deletes the new column.</div>
      <div>The label [w, p] under a vertex on the graph is the smallest entry of its column among the marked rows (p = that row).</div>
    </div>
    <div class="snap">${snapLine(snaps[0])}</div>
  </div>`;

  /* iterations 1..n */
  its.forEach(it => {
    const k = it.k, m = it.mat;
    h += `<div class="it box" data-i="${k}"><h3>Iteration ${k}</h3>`;
    if (k === 1) {
      h += `<div class="st"><b>Step 1: Choose the start vertex</b>
          <div>Start vertex is <span class="p">${esc(it.v)}</span> (V<sub>${V.indexOf(it.v) + 1}</sub>).</div></div>
        <div class="st"><b>Step 2: Mark its row and delete its column</b>
          <div>Mark row ${esc(it.v)} (&#10003;) and delete column ${esc(it.v)}. Now V<sub>MST</sub> = {${esc(it.v)}} with 0 of ${need} edges selected.</div>
          ${it.done ? '<div><span class="ok">There is only one vertex, so the tree is complete. Stop.</span></div>' : ''}</div>
        ${matrixHTML(m)}${tnote}`;
    } else {
      const rows = V.filter((_, i) => m.marked.has(i)).map(esc).join(', ');
      const cols = V.filter((_, j) => !m.deleted.has(j)).map(esc).join(', ');
      const shown = it.cand.slice(0, 30).map(ent).join(', ') + (it.cand.length > 30 ? `, and ${it.cand.length - 30} more` : '');
      h += `<div class="st"><b>Step 1: Look at the marked rows and the undeleted columns</b>
          <div>Marked rows: ${rows}. Undeleted columns: ${cols}.</div>
          <div>Entries to compare (&infin; entries are ignored): ${shown}</div></div>
        <div class="st"><b>Step 2: Choose the smallest entry</b>
          <div>The smallest entry is <span class="p">${ent(it.chosen)}</span> (row ${name(it.chosen.i)}, column ${name(it.chosen.j)}).</div>
          ${it.ties.length ? `<div>Tie with ${it.ties.map(ent).join(', ')}: the first one found (top to bottom, left to right) is taken.</div>` : ''}
          <div>So edge <span class="ok">${nm(it.u, it.v)}</span> is chosen and vertex <b>${esc(it.v)}</b> joins the tree.</div></div>
        ${matrixHTML(m)}
        <div class="st"><b>Step 3: Add the edge, mark the new row and delete the new column</b>
          <div>Add edge <span class="ok">${nm(it.u, it.v)}</span> (weight ${it.w}) to the MST. Mark row ${esc(it.v)} (&#10003;) and delete column ${esc(it.v)}.</div>
          <div>Edges selected: ${it.edgesSelected} of ${need} &middot; Cumulative weight: <b>${it.totalWeight}</b></div>
          ${it.done ? `<div><span class="ok">All ${n} columns are deleted and ${it.edgesSelected} = n &minus; 1 edges are selected. The minimum spanning tree is complete. Stop.</span></div>` : ''}</div>`;
    }
    h += `<div class="snap">${snapLine(snaps[k])}</div></div>`;
  });

  if (S.stoppedDisconnected) {
    h += `<div class="it box" data-i="${snaps.length - 1}" style="border-color:var(--bad)"><h3>Iteration ${S.stop.k}: no edge available</h3>
      <div class="st"><b>Step 1: Look at the marked rows and the undeleted columns</b>
        <div>Every entry in the marked rows and undeleted columns is &infin;, so no edge can join a new vertex.</div></div>
      ${matrixHTML(S.stop.mat)}
      <div class="st"><div><span style="color:var(--bad);font-weight:700">Vertices ${finalUnreachable.map(esc).join(', ')} cannot be reached from ${esc(s)}, so the graph is not connected and has no spanning tree. The algorithm stops after ${snaps.length - 1} of ${n} iterations, with the tree of the component of ${esc(s)}.</span></div></div>
    </div>`;
  }

  $('steps').innerHTML = h;
  $('steps').querySelectorAll('.it').forEach(el => el.onclick = () => go(+el.dataset.i));

  /* final results */
  const last = snaps[snaps.length - 1];
  const edges = last.chosenEdges.map(ei => S.E[ei]);

  const sum = complete
    ? `<div class="tsum">Minimum spanning tree with total weight <b>${last.totalWeight}</b>: <b class="mono">${edges.length ? edges.map(e => nm(e.u, e.v)).join(', ') : 'no edges needed'}</b></div>`
    : `<div class="tsum bad">The graph is disconnected. Prim's algorithm constructed a minimum spanning tree for the connected component of <b>${esc(s)}</b> with total weight <b>${last.totalWeight}</b> (${edges.length} edges). Vertices <b>${finalUnreachable.map(esc).join(', ')}</b> cannot be reached from ${esc(s)}.</div>`;

  let f2 = `<div class="box card final"><h2>Minimum spanning ${complete ? 'tree' : 'tree (connected component)'}</h2>${sum}`;

  if (edges.length) {
    let cum = 0;
    f2 += `<h3 style="margin:16px 0 8px;font-size:1.05rem">Edges selected in the MST</h3>
    <table><tr><th>Iteration</th><th>Edge</th><th>Weight</th><th>Cut bridged (Tree &rarr; New Vertex)</th><th>Cumulative weight</th></tr>`;
    edges.forEach((e, j) => {
      cum += e.w;
      f2 += `<tr>
        <td class="mono" data-l="Iteration">${j + 2}</td>
        <td class="mono" data-l="Edge">${nm(e.u, e.v)}</td>
        <td class="mono" data-l="Weight">${e.w}</td>
        <td data-l="Cut bridged">${esc(e.u)} &harr; ${esc(e.v)}</td>
        <td class="mono" data-l="Cumulative">${cum}</td>
      </tr>`;
    });
    f2 += `<tr><td class="mono" data-l="Iteration">–</td><td data-l="Edge"><b>Total</b></td><td class="mono" data-l="Weight"><b>${last.totalWeight}</b></td><td data-l="Cut bridged">–</td><td class="mono" data-l="Cumulative"><b>${last.totalWeight}</b></td></tr></table>`;
  }

  f2 += `<h3 style="margin:22px 0 8px;font-size:1.05rem">Vertex connections in the MST</h3>
  <table><tr><th>Vertex</th><th>Joined in iteration</th><th>Parent in tree</th><th>Connecting edge weight</th><th>Status</th></tr>`;
  V.forEach(v => {
    const o = last.L.find(l => l.v === v);
    if (!o || !o.inTree) {
      f2 += `<tr>
        <td class="mono" data-l="Vertex">${esc(v)}</td>
        <td class="mono" data-l="Iteration">–</td>
        <td class="mono" data-l="Parent">–</td>
        <td class="mono" data-l="Weight">–</td>
        <td data-l="Status" style="color:var(--bad)">Not reached (disconnected)</td>
      </tr>`;
    } else if (v === s) {
      f2 += `<tr style="background:var(--soft)">
        <td class="mono" data-l="Vertex"><b>${esc(v)}</b></td>
        <td class="mono" data-l="Iteration">1 (start)</td>
        <td class="mono" data-l="Parent">–</td>
        <td class="mono" data-l="Weight">0</td>
        <td data-l="Status" class="ok">Start vertex</td>
      </tr>`;
    } else {
      f2 += `<tr>
        <td class="mono" data-l="Vertex"><b>${esc(v)}</b></td>
        <td class="mono" data-l="Iteration">${o.ord}</td>
        <td class="mono" data-l="Parent">${esc(o.parent)}</td>
        <td class="mono" data-l="Weight">${o.key}</td>
        <td data-l="Status" class="ok">In MST</td>
      </tr>`;
    }
  });
  f2 += `</table><h3 style="margin:22px 0 8px;font-size:1.05rem">Final matrix</h3>${matrixHTML(S.finalMat)}
    <p class="tnote">${complete ? 'Every row is marked and every column is deleted.' : 'Rows and columns of unreached vertices stay unmarked.'} Orange entries are the edges chosen for the minimum spanning tree.</p></div>`;

  $('final').innerHTML = f2;
}

function go(i) {
  cur = Math.max(0, Math.min(S.snaps.length - 1, i));
  drawGraph();
  nav();
  document.querySelectorAll('.it').forEach(el => el.classList.toggle('on', +el.dataset.i === cur));
}

function nav() {
  const n = S ? S.snaps.length - 1 : 0;
  $('prev').disabled = !S || cur <= 0;
  $('next').disabled = !S || cur >= n;
  let t = 'Type vertices to begin.';
  if (S) {
    if (S.draft) t = 'Graph preview';
    else {
      const c = S.snaps[cur].chosenEdges.length;
      t = (cur === 0 ? 'Before iteration 1' : `After iteration ${cur} of ${n}`) + ` · ${c} of ${S.need} edges selected`;
    }
  }
  $('stepLabel').textContent = t;
}

$('prev').onclick = () => go(cur - 1);
$('next').onclick = () => go(cur + 1);

function run(keep) {
  $('gmsg').textContent = '';
  const p = parse();
  $('err').textContent = p.errs.join(' ');
  if (!p.V.length) {
    S = null;
    cur = 0;
    $('chips').innerHTML = '';
    $('svg').innerHTML = '<text x="210" y="162" text-anchor="middle" fill="var(--mute)" font-size="15">Type vertices on the left</text><text x="210" y="186" text-anchor="middle" fill="var(--mute)" font-size="15">and the nodes appear here.</text>';
    $('steps').innerHTML = hint('Add vertices, edges and a start vertex. The steps appear here.');
    $('final').innerHTML = '';
    nav();
    return;
  }
  if (sel !== null && !p.V.includes(sel)) clearSel();
  if (sel2 !== null && !p.V.includes(sel2)) sel2 = null;
  S = (p.E.length && p.okS) ? solve(p) : draft(p);
  render();
  go(keep ? Math.min(cur, S.snaps.length - 1) : 0);
}

$('run').onclick = () => run(false);

/* ---------- edit directly on the graph ---------- */
const gmsg = t => { $('gmsg').textContent = t; };

function edit(x, y, val, commit, cancel) {
  const inp = $('gedit'), sc = $('svg').getBoundingClientRect().width / 420;
  ed = { commit, cancel };
  inp.type = 'number';
  inp.step = 'any';
  inp.value = val;
  inp.style.left = x * sc + 'px';
  inp.style.top = y * sc + 'px';
  inp.style.width = '78px';
  inp.hidden = false;
  inp.focus();
  inp.select();
}

function endEdit(ok) {
  if (!ed) return;
  const c = ed;
  ed = null;
  const inp = $('gedit'), v = inp.value;
  inp.hidden = true;
  if (ok) c.commit(v);
  else if (c.cancel) c.cancel();
}

$('gedit').onkeydown = e => {
  if (e.key === 'Enter') endEdit(true);
  else if (e.key === 'Escape') endEdit(false);
};
$('gedit').onblur = () => endEdit(true);

function setWeight(i, val) {
  if (val === '' || isNaN(+val)) {
    gmsg('Weight must be a number.');
    return;
  }
  S.E[i].row.querySelectorAll('input')[2].value = val;
  run(true);
}

const HINT = 'Tap two vertices to connect them with an edge. Tap a weight to change it.';
const setHint = t => { $('ghint').textContent = t || HINT; };
const clearSel = () => { sel = sel2 = null; };

function addEdge(a, b, val) {
  clearSel();
  if (val === '' || isNaN(+val)) {
    gmsg('Weight must be a number.');
    drawGraph();
    setHint();
    return;
  }
  const rows = [...document.querySelectorAll('#edges .row')];
  const empty = rows.find(r => [...r.querySelectorAll('input')].every(i => !i.value.trim()));
  if (empty) {
    const [x, y, z] = empty.querySelectorAll('input');
    x.value = a; y.value = b; z.value = val;
  } else {
    addRow(a, b, val);
  }
  setHint();
  run(true);
}

function pickVertex(v) {
  if (!S) return;
  gmsg('');
  if (sel === null) {
    sel = v;
    setHint(`Now tap the vertex you want to connect ${v} to.`);
    drawGraph();
    return;
  }
  if (sel === v) {
    clearSel();
    setHint();
    drawGraph();
    return;
  }
  const a = sel, b = v;
  const dup = S.E.some(e => (e.u === a && e.v === b) || (e.u === b && e.v === a));
  if (dup) {
    clearSel();
    setHint();
    drawGraph();
    gmsg(`There is already an edge between ${a} and ${b}. Tap its weight to change it.`);
    return;
  }
  sel2 = b;
  drawGraph();
  const P = layout(S.V);
  setHint(`Type the weight of ${a} - ${b} and press Enter (Esc cancels).`);
  edit((P[a].x + P[b].x) / 2, (P[a].y + P[b].y) / 2, 1, val => addEdge(a, b, val), () => {
    clearSel();
    setHint();
    drawGraph();
  });
}

function openFrom(g) {
  if (g.classList.contains('ew')) {
    clearSel();
    setHint();
    const i = +g.dataset.e;
    edit(+g.dataset.x, +g.dataset.y, S.E[i].w, v => setWeight(i, v));
  } else {
    pickVertex(g.dataset.v);
  }
}

$('svg').addEventListener('click', ev => {
  const g = ev.target.closest('.ew,.vn');
  if (g && S) openFrom(g);
  else if (sel !== null) { clearSel(); setHint(); if (S) drawGraph(); }
});

$('svg').addEventListener('keydown', ev => {
  if (ev.key !== 'Enter') return;
  const g = ev.target.closest && ev.target.closest('.ew,.vn');
  if (g && S) openFrom(g);
});

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && sel !== null && !ed) {
    clearSel(); setHint(); if (S) drawGraph();
  }
});

/* form edits update the graph live */
let tm;
$('inputCard').addEventListener('input', () => {
  clearTimeout(tm);
  tm = setTimeout(() => run(true), 350);
});

setHint();
blank();
run();