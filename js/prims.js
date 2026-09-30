/* prims.js  (needs js/common.js loaded first: it provides $ and esc)

   Prim's algorithm:
     Step 1: Choose a start vertex s. Add s to the tree V_MST = {s}.
     Step 2: Find the cheapest cut edge connecting a vertex in V_MST to a vertex outside V_MST
             (or vertex outside with minimum key).
     Step 3: Add that edge and vertex to the tree.
     Step 4: Update keys/parents for unvisited neighbors of the newly added vertex.
     Step 5: Repeat until all vertices are in the tree (n - 1 edges) or no cut edges exist.
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

/* Helper to get cut edges crossing between inTree and outside */
function getCutEdges(inTree, adj) {
  const list = [];
  const seen = new Set();
  inTree.forEach(u => {
    (adj[u] || []).forEach(e => {
      if (!inTree.has(e.to)) {
        const k = edgeKey(e.u, e.v);
        if (!seen.has(k)) {
          seen.add(k);
          list.push({ u: e.u, v: e.to, w: e.w, i: e.i });
        }
      }
    });
  });
  return list.sort((a, b) => a.w - b.w || a.i - b.i);
}

function solve({ V, E, s }) {
  const n = V.length, need = n - 1;
  const adj = {};
  V.forEach(v => adj[v] = []);
  E.forEach((e, i) => {
    if (e.u === e.v) return; // self loops never cross a cut
    adj[e.u].push({ to: e.v, w: e.w, i, u: e.u, v: e.v });
    adj[e.v].push({ to: e.u, w: e.w, i, u: e.v, v: e.u });
  });

  const inTree = new Set();
  const ord = {};
  const key = {};
  const parent = {};
  const parentEdgeIndex = {};

  V.forEach(v => {
    key[v] = INF;
    parent[v] = null;
    parentEdgeIndex[v] = null;
  });

  key[s] = 0;
  inTree.add(s);
  ord[s] = 1;

  // Initial update for neighbors of s
  const initUpdates = [];
  (adj[s] || []).forEach(e => {
    if (e.w < key[e.to]) {
      key[e.to] = e.w;
      parent[e.to] = s;
      parentEdgeIndex[e.to] = e.i;
      initUpdates.push({ z: e.to, w: e.w, oldK: INF, newK: e.w, newP: s, better: true });
    }
  });

  const chosenEdges = [];
  let totalWeight = 0;

  const snap = (justAddedV, justAddedE, justAddedW) => ({
    justAddedV,
    justAddedE,
    justAddedW,
    inTreeCount: inTree.size,
    treeVertices: V.filter(v => inTree.has(v)).sort((a, b) => ord[a] - ord[b]),
    chosenEdges: chosenEdges.slice(),
    totalWeight,
    L: V.map(v => ({
      v,
      key: key[v],
      parent: parent[v],
      inTree: inTree.has(v),
      ord: ord[v] || null
    })),
    cutEdges: getCutEdges(inTree, adj)
  });

  const snaps = [snap(s, null, 0)];
  const its = [];
  let stoppedDisconnected = false;

  while (inTree.size < n) {
    const candVertices = V.filter(v => !inTree.has(v) && key[v] < INF);
    const cutEdges = getCutEdges(inTree, adj);

    if (!candVertices.length) {
      stoppedDisconnected = true;
      break;
    }

    // Pick vertex with minimum key (ties keep original V order)
    const nextV = candVertices.reduce((best, v) => (key[v] < key[best] ? v : best), candVertices[0]);
    const u = parent[nextV];
    const w = key[nextV];
    const edgeIdx = parentEdgeIndex[nextV];

    inTree.add(nextV);
    ord[nextV] = inTree.size;
    chosenEdges.push(edgeIdx);
    totalWeight += w;

    // Update keys for neighbors of nextV
    const updates = [];
    (adj[nextV] || []).filter(e => !inTree.has(e.to)).forEach(e => {
      const z = e.to;
      const oldK = key[z];
      const oldP = parent[z];
      const better = e.w < oldK;
      if (better) {
        key[z] = e.w;
        parent[z] = nextV;
        parentEdgeIndex[z] = e.i;
      }
      updates.push({
        z,
        w: e.w,
        oldK,
        oldP,
        newK: key[z],
        newP: parent[z],
        better
      });
    });

    its.push({
      k: its.length + 1,
      v: nextV,
      u,
      w,
      cutEdges,
      edgeIdx,
      ord: ord[nextV],
      totalWeight,
      updates,
      done: inTree.size === n,
      edgesSelected: chosenEdges.length
    });

    snaps.push(snap(nextV, edgeIdx, w));
  }

  return {
    V, E, s, its, snaps, totalWeight,
    chosenEdges,
    complete: inTree.size === n,
    need,
    stoppedDisconnected,
    finalTreeVertices: V.filter(v => inTree.has(v)).sort((a, b) => ord[a] - ord[b]),
    finalUnreachable: V.filter(v => !inTree.has(v)),
    initUpdates
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

/* ---------- the Vertex / Key / Parent / Tree table ---------- */
function tableHTML(sn) {
  const S2 = S.V;
  const st = {};
  sn.L.forEach(o => st[o.v] = o);

  const r1 = S2.map(v => {
    const isCur = sn.justAddedV === v;
    return `<td class="${isCur ? 'cur' : ''}">${esc(v)}</td>`;
  }).join('');

  const r2 = S2.map(v => {
    const o = st[v];
    const isCur = sn.justAddedV === v;
    const txt = o.key === INF ? '∞' : o.key;
    return `<td class="${isCur ? 'cur' : ''}">${txt}</td>`;
  }).join('');

  const r3 = S2.map(v => {
    const o = st[v];
    const isCur = sn.justAddedV === v;
    return `<td class="${isCur ? 'cur' : ''}">${o.parent ? esc(o.parent) : '–'}</td>`;
  }).join('');

  const r4 = S2.map(v => {
    const o = st[v];
    const isCur = sn.justAddedV === v;
    if (o.inTree) {
      return `<td class="${isCur ? 'cur' : 'yes'}">${v === S.s ? 'Root' : `Yes (#${o.ord})`}</td>`;
    } else if (o.key < INF) {
      return `<td class="fringe">Fringe</td>`;
    } else {
      return `<td class="pend">–</td>`;
    }
  }).join('');

  return `<div class="tabwrap"><table class="etab">
    <tr><th class="rh" scope="row">Vertex</th>${r1}</tr>
    <tr><th class="rh" scope="row">Key</th>${r2}</tr>
    <tr><th class="rh" scope="row">Parent</th>${r3}</tr>
    <tr><th class="rh" scope="row">In Tree</th>${r4}</tr>
  </table></div>`;
}
const tnote = '<p class="tnote">In Tree: Root = start vertex, Yes (#) = added to MST in step #. Fringe = candidate neighbor with finite key. – = not yet reached.</p>';

/* ---------- step cards and result ---------- */
function render() {
  if (S.draft) {
    $('steps').innerHTML = hint(S.E.length ? 'Fix the start vertex to see the steps.' : 'Add at least one edge to see the steps.');
    $('final').innerHTML = '';
    return;
  }

  const { its, snaps, V, s, need, complete, totalWeight, finalTreeVertices, finalUnreachable } = S;
  const n = V.length;

  let h = `<div class="it box" data-i="0"><h3>Initialisation</h3>
    <div class="st">
      <div>Start vertex <b>${esc(s)}</b> is chosen as the root of the tree: <span class="p">V<sub>MST</sub> = {${esc(s)}}</span>.</div>
      <div>Initialize keys: <span class="mono">Key(${esc(s)}) = [0, -]</span>. Every other vertex gets <span class="mono">[∞, -]</span>.</div>
      ${snaps[0].cutEdges.length
        ? `<div>Candidate cut edges incident to <b>${esc(s)}</b>: ${snaps[0].cutEdges.map(e => `${nm(e.u, e.v)} (weight ${e.w})`).join(', ')}.</div>`
        : `<div>No edges connected to <b>${esc(s)}</b>.</div>`}
    </div>
    ${tableHTML(snaps[0])}
    ${tnote}
    <div class="snap">${snapLine(snaps[0])}</div>
  </div>`;

  its.forEach((it, idx) => {
    const isLast = idx === its.length - 1;
    h += `<div class="it box" data-i="${idx + 1}"><h3>Iteration ${idx + 1}</h3>
      <div class="st"><b>Step 1: Inspect candidate cut edges and choose the minimum</b>
        <div>Candidate cut edges crossing the cut (Tree &harr; Outside): ${it.cutEdges.length ? it.cutEdges.map(e => `${nm(e.u, e.v)} (wt ${e.w})`).join(', ') : 'none'}</div>
        <div>Minimum weight cut edge is <span class="p">${nm(it.u, it.v)}</span> with weight <b>${it.w}</b>.</div>
        <div>Selected vertex: <b>${esc(it.v)}</b> with label <span class="p">${lab(it.w, it.u)}</span>.</div>
      </div>
      <div class="st"><b>Step 2: Add edge and vertex to the minimum spanning tree</b>
        <div>Add edge <span class="ok">${nm(it.u, it.v)}</span> to the MST and vertex <b>${esc(it.v)}</b> joins the tree (order ${it.ord}).</div>
        <div>MST so far: ${it.edgesSelected} of ${need} edges selected · Cumulative weight: <b>${it.totalWeight}</b>.</div>
        ${it.done ? `<div><span class="ok">Edges selected = ${it.edgesSelected}, which equals n − 1 = ${need}. The minimum spanning tree is complete. Stop.</span></div>` : ''}
      </div>
      <div class="st"><b>Step 3: Update candidate keys for neighbors of newly added vertex ${esc(it.v)}</b>`;

    if (!it.updates.length) {
      h += `<div>No outgoing edge to an unvisited vertex; candidate keys remain unchanged.</div>`;
    } else {
      it.updates.forEach(u => {
        h += `<div>Key(${esc(u.z)}) = min(Key(${esc(u.z)}), w(${esc(it.v)}, ${esc(u.z)})) = min(${f(u.oldK)}, ${u.w}) = ${f(u.newK)} &rarr; <span class="t">${lab(u.newK, u.newP)}</span> (${u.better ? 'updated: cheaper connection found' : 'no change'})</div>`;
      });
    }

    h += `</div>
      ${tableHTML(snaps[idx + 1])}
      ${idx === 0 ? tnote : ''}
      <div class="snap">${snapLine(snaps[idx + 1])}</div>
    </div>`;
  });

  if (S.stoppedDisconnected) {
    h += `<div class="it box on" style="border-color:var(--bad)"><h3>Termination: Disconnected Graph</h3>
      <div class="st">
        <div>No candidate cut edges remain connecting the tree to unvisited vertices: <b>${finalUnreachable.map(esc).join(', ')}</b>.</div>
        <div><span class="no">The graph is not connected, so no spanning tree exists for the whole graph. Prim's algorithm has constructed the MST for the connected component of ${esc(s)}. Stop.</span></div>
      </div>
    </div>`;
  }

  $('steps').innerHTML = h;
  $('steps').querySelectorAll('.it').forEach(el => el.onclick = () => go(+el.dataset.i));

  /* Final results */
  const last = snaps[snaps.length - 1];
  const edges = last.chosenEdges.map(ei => S.E[ei]);

  const sum = complete
    ? `<div class="tsum">Minimum spanning tree with total weight <b>${last.totalWeight}</b>: <b class="mono">${edges.length ? edges.map(e => nm(e.u, e.v)).join(', ') : 'no edges needed'}</b></div>`
    : `<div class="tsum bad">The graph is disconnected. Prim's algorithm constructed a minimum spanning tree for the connected component of <b>${esc(s)}</b> with total weight <b>${last.totalWeight}</b> (${edges.length} edges). Vertices <b>${finalUnreachable.map(esc).join(', ')}</b> cannot be reached from ${esc(s)}.</div>`;

  let f2 = `<div class="box card final"><h2>Minimum spanning ${complete ? 'tree' : 'tree (connected component)'}</h2>${sum}`;

  if (edges.length) {
    let cum = 0;
    f2 += `<h3 style="margin:16px 0 8px;font-size:1.05rem">Edges selected in the MST</h3>
    <table><tr><th>Step</th><th>Edge</th><th>Weight</th><th>Cut bridged (Tree &rarr; New Vertex)</th><th>Cumulative weight</th></tr>`;
    edges.forEach((e, j) => {
      cum += e.w;
      f2 += `<tr>
        <td class="mono" data-l="Step">${j + 1}</td>
        <td class="mono" data-l="Edge">${nm(e.u, e.v)}</td>
        <td class="mono" data-l="Weight">${e.w}</td>
        <td data-l="Cut bridged">${esc(e.u)} &harr; ${esc(e.v)}</td>
        <td class="mono" data-l="Cumulative">${cum}</td>
      </tr>`;
    });
    f2 += `<tr><td class="mono" data-l="Step">–</td><td data-l="Edge"><b>Total</b></td><td class="mono" data-l="Weight"><b>${last.totalWeight}</b></td><td data-l="Cut bridged">–</td><td class="mono" data-l="Cumulative"><b>${last.totalWeight}</b></td></tr></table>`;
  }

  f2 += `<h3 style="margin:22px 0 8px;font-size:1.05rem">Vertex connections in the MST</h3>
  <table><tr><th>Vertex</th><th>Joined in step</th><th>Parent in tree</th><th>Connecting edge weight</th><th>Status</th></tr>`;
  V.forEach(v => {
    const o = last.L.find(l => l.v === v);
    if (!o || !o.inTree) {
      f2 += `<tr>
        <td class="mono" data-l="Vertex">${esc(v)}</td>
        <td class="mono" data-l="Step">–</td>
        <td class="mono" data-l="Parent">–</td>
        <td class="mono" data-l="Weight">–</td>
        <td data-l="Status" style="color:var(--bad)">Not reached (disconnected)</td>
      </tr>`;
    } else if (v === s) {
      f2 += `<tr style="background:var(--soft)">
        <td class="mono" data-l="Vertex"><b>${esc(v)}</b></td>
        <td class="mono" data-l="Step">Root (Initial)</td>
        <td class="mono" data-l="Parent">–</td>
        <td class="mono" data-l="Weight">0</td>
        <td data-l="Status" class="ok">Start vertex</td>
      </tr>`;
    } else {
      f2 += `<tr>
        <td class="mono" data-l="Vertex"><b>${esc(v)}</b></td>
        <td class="mono" data-l="Step">${o.ord}</td>
        <td class="mono" data-l="Parent">${esc(o.parent)}</td>
        <td class="mono" data-l="Weight">${o.key}</td>
        <td data-l="Status" class="ok">In MST</td>
      </tr>`;
    }
  });
  f2 += `</table><h3 style="margin:22px 0 8px;font-size:1.05rem">Final vertex state table</h3>${tableHTML(last)}${tnote}</div>`;

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
