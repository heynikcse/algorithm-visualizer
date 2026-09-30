/* kruskal.js  (needs js/common.js loaded first: it provides $ and esc)

   Kruskal's algorithm, as shown on the page:
     Step 1  Sort the edges in non-decreasing order of weight (the table).
     Step 2  Take the smallest edge not yet checked. If its two ends are already in
             the same component it would form a cycle -> MST cell = No.
             Otherwise add it to the MST -> MST cell = Yes, and merge the components.
     Step 3  If (edges selected) < n - 1 go back to Step 2, else stop.
*/
let S=null,cur=0;
let sel=null,sel2=null;                       // vertices picked on the graph while drawing an edge

const nm=e=>`${esc(e.u)}-${esc(e.v)}`;
const setTxt=a=>'{'+a.map(esc).join(', ')+'}';

/* ---------- edge table (input) ---------- */
function addRow(u='',v='',w=''){
  const r=document.createElement('div');r.className='row k';
  r.innerHTML=`<input aria-label="From" placeholder="From" value="${esc(u)}"><input aria-label="To" placeholder="To" value="${esc(v)}"><input aria-label="Weight" placeholder="Weight" type="number" step="any" value="${esc(w)}"><button class="x" type="button" aria-label="Remove edge">✕</button>`;
  r.querySelector('.x').onclick=()=>{r.remove();run(true);};
  $('edges').appendChild(r);
}
function blank(){$('verts').value='';$('edges').innerHTML='';addRow();}
function example(){
  $('verts').value='a, b, c, d, e, f';$('edges').innerHTML='';
  [['a','b',4],['a','c',2],['b','c',1],['b','d',5],['c','d',8],['c','e',10],['d','e',2],['d','f',6],['e','f',3]]
    .forEach(e=>addRow(e[0],e[1],e[2]));
}
$('addEdge').onclick=()=>addRow();
$('ex').onclick=()=>{example();run();};
$('clr').onclick=()=>{blank();run();};

function parse(){
  const errs=[];
  const toks=$('verts').value.split(/[\s,]+/).filter(Boolean);
  let V;
  if(toks.length===1&&/^\d+$/.test(toks[0])){          // a single number N makes vertices 1..N
    const N=+toks[0];
    if(N>30)errs.push('Up to 30 vertices are supported.');
    V=Array.from({length:Math.min(N,30)},(_,i)=>String(i+1));
  }else V=[...new Set(toks)];
  const E=[];let k=0;
  for(const r of $('edges').children){
    k++;
    const [a,b,c]=r.querySelectorAll('input');
    const u=a.value.trim(),v=b.value.trim();
    if(!u&&!v&&c.value==='')continue;
    if(!u||!v||c.value===''){errs.push(`Edge row ${k} is incomplete: fill in from, to and weight.`);continue;}
    if(!V.includes(u)||!V.includes(v)){errs.push(`Edge row ${k} (${u} - ${v}) uses a vertex that is not in the vertex list.`);continue;}
    if(isNaN(+c.value)){errs.push(`Edge row ${k} needs a numeric weight.`);continue;}
    E.push({u,v,w:+c.value,row:r});
  }
  return {V,E,errs};
}

/* ---------- the algorithm ---------- */
const hint=t=>`<div class="box card"><p class="sec-s" style="margin:0">${t}</p></div>`;
function draft(p){
  return {V:p.V,E:p.E,sorted:[],srcK:{},its:[],snaps:[{cur:-1,status:[],comps:p.V.map(v=>[v]),chosen:[],total:0}],draft:true};
}

function solve({V,E}){
  const n=V.length,need=n-1;
  // Step 1: sort in non-decreasing order of weight (ties keep the order they were entered)
  const sorted=E.map((e,i)=>({u:e.u,v:e.v,w:e.w,src:i})).sort((a,b)=>a.w-b.w||a.src-b.src);
  const srcK={};sorted.forEach((e,k)=>{e.k=k;srcK[e.src]=k;});

  const comp={};V.forEach(v=>comp[v]=[v]);            // vertex -> the array (component) it belongs to
  const order=x=>x.slice().sort((a,b)=>V.indexOf(a)-V.indexOf(b));
  const compsOf=()=>{const seen=new Set(),out=[];
    V.forEach(v=>{const c=comp[v];if(!seen.has(c)){seen.add(c);out.push(order(c));}});return out;};
  const status=sorted.map(()=>null),chosen=[];let total=0;
  const snap=c=>({cur:c,status:status.slice(),comps:compsOf(),chosen:chosen.slice(),total});
  const snaps=[snap(-1)],its=[];

  for(let k=0;k<sorted.length&&chosen.length<need;k++){   // Step 2 (repeated while Step 3 says so)
    const e=sorted[k],cu=comp[e.u],cv=comp[e.v],cyc=cu===cv;
    const A=order(cu),B=order(cv);
    let merged=null;
    if(cyc)status[k]='no';
    else{
      const m=cu.concat(cv);m.forEach(x=>comp[x]=m);
      chosen.push(k);total+=e.w;status[k]='yes';merged=order(m);
    }
    const left=sorted.length-k-1;
    const decision=chosen.length>=need?'done':left===0?'empty':'continue';   // Step 3
    its.push({k,e,cyc,A,B,merged,count:chosen.length,total,left,decision});
    snaps.push(snap(k));
  }
  return {V,E,sorted,srcK,its,snaps,need};
}

/* ---------- drawing ---------- */
function layout(V){
  const n=V.length,P={};
  V.forEach((v,i)=>{const a=-Math.PI/2+2*Math.PI*i/n;
    P[v]=n===1?{x:210,y:170}:{x:210+140*Math.cos(a),y:170+125*Math.sin(a)};});
  return P;
}

function chips(sn){
  const mst=sn.chosen.map((k,j)=>{const e=S.sorted[k];return `<span class="chip v"><i>${j+1}</i>${nm(e)} <em>${e.w}</em></span>`;});
  const cmp=sn.comps.map(c=>`<span class="chip${c.length>1?' v':''}">${setTxt(c)}</span>`);
  const row=(t,a)=>`<div class="crow"><span class="cl">${t}</span>${a.length?a.join(''):'<span class="none">none</span>'}</div>`;
  $('chips').innerHTML=row('MST edges (in order)',mst)+row('Components',cmp);
}

function drawGraph(){
  const {V,E,sorted,srcK,snaps}=S,sn=snaps[cur],P=layout(V),R=19;
  const curE=sn.cur>=0?sorted[sn.cur]:null;
  const size={};sn.comps.forEach(c=>c.forEach(v=>size[v]=c.length));
  const grp={};E.forEach((e,i)=>{const key=[e.u,e.v].sort().join('\u0001');(grp[key]=grp[key]||[]).push(i);});
  let h='';
  E.forEach((e,i)=>{
    const A=P[e.u],B=P[e.v];let body,mx,my;
    if(e.u===e.v){
      body=`M${A.x-8} ${A.y-R+2}C${A.x-40} ${A.y-70} ${A.x+40} ${A.y-70} ${A.x+8} ${A.y-R+2}`;mx=A.x;my=A.y-55;
    }else{
      const g=grp[[e.u,e.v].sort().join('\u0001')],bend=(g.indexOf(i)-(g.length-1)/2)*0.25*(e.u>e.v?-1:1);
      const dx=B.x-A.x,dy=B.y-A.y,L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L;
      const cx=(A.x+B.x)/2-uy*L*bend,cy=(A.y+B.y)/2+ux*L*bend;
      const s={x:A.x+ux*R,y:A.y+uy*R},t={x:B.x-ux*R,y:B.y-uy*R};
      body=`M${s.x} ${s.y}Q${cx} ${cy} ${t.x} ${t.y}`;
      mx=.25*s.x+.5*cx+.25*t.x;my=.25*s.y+.5*cy+.25*t.y;
    }
    const k=srcK[i],st=sn.status[k],isC=sn.cur===k&&k!==undefined;
    let stroke='var(--mute)',sw=1.5,dash='',op=.75;
    if(st==='yes'){stroke=isC?'var(--ink)':'var(--o)';sw=isC?6:5;op=1;}
    else if(st==='no'){if(isC){stroke='var(--bad)';sw=4;dash='6 4';op=1;}else{stroke='#9a9a9a';dash='5 4';op=.7;}}
    h+=`<path d="${body}" fill="none" stroke="${stroke}" stroke-width="${sw}" ${dash?`stroke-dasharray="${dash}"`:''} opacity="${op}"/>`;
    const ws=String(e.w),ww=Math.max(28,ws.length*8+14);
    h+=`<g class="ew" data-e="${i}" data-x="${mx}" data-y="${my-9}" tabindex="0" role="button" aria-label="Edit weight of edge ${esc(e.u)} to ${esc(e.v)}"><rect x="${mx-ww/2}" y="${my-18}" width="${ww}" height="18" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/><text x="${mx}" y="${my-5}" text-anchor="middle" font-size="12" font-family="JetBrains Mono,monospace" fill="var(--ink)">${esc(e.w)}</text></g>`;
  });
  V.forEach(v=>{
    const p=P[v],joined=size[v]>1,isEnd=curE&&(curE.u===v||curE.v===v);
    h+=`<g class="vn" data-v="${esc(v)}" data-x="${p.x}" data-y="${p.y}" tabindex="0" role="button" aria-label="Select vertex ${esc(v)} to draw an edge">`;
    if(v===sel||v===sel2)h+=`<circle cx="${p.x}" cy="${p.y}" r="${R+4}" fill="none" stroke="var(--o)" stroke-width="3"/>`;
    h+=`<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${joined?'var(--o)':'var(--panel)'}" stroke="var(--ink)" stroke-width="${isEnd?4:2}"/>`;
    h+=`<text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">${esc(v)}</text></g>`;
  });
  $('svg').innerHTML=h;chips(sn);
}

/* ---------- the Edge / Weight / MST table ---------- */
function tableHTML(sn){
  const c=(k,extra='')=>(sn.cur===k?'cur ':'')+extra;
  const S2=S.sorted;
  const r1=S2.map((e,k)=>`<td class="${c(k)}">${nm(e)}</td>`).join('');
  const r2=S2.map((e,k)=>`<td class="${c(k)}">${e.w}</td>`).join('');
  const r3=S2.map((e,k)=>{const s=sn.status[k];
    return `<td class="${c(k,s==='yes'?'yes':s==='no'?'no':'pend')}">${s==='yes'?'Yes':s==='no'?'No':'–'}</td>`;}).join('');
  return `<div class="tabwrap"><table class="etab"><tr><th class="rh" scope="row">Edge</th>${r1}</tr><tr><th class="rh" scope="row">Weight</th>${r2}</tr><tr><th class="rh" scope="row">MST</th>${r3}</tr></table></div>`;
}
const tnote='<p class="tnote">MST row: Yes = no cycle, edge added to the MST. No = the edge forms a cycle, so it is skipped. – = not checked yet.</p>';

/* ---------- step cards and result ---------- */
function render(){
  if(S.draft){
    $('steps').innerHTML=hint(S.E.length?'Fix the edges to see the steps.':'Add at least one edge to see the steps.');
    $('final').innerHTML='';return;
  }
  const {sorted,its,snaps,V,need}=S,n=V.length;
  let h=`<div class="it box" data-i="0"><h3>Step 1: Sort the edges</h3>
    <div class="st">
      <div>The graph has n = ${n} vertices and ${sorted.length} edges.</div>
      <div>A spanning tree needs n − 1 = ${need} edges. Edges selected so far: 0.</div>
      <div>Write the edges in non-decreasing order of weight (equal weights keep the order you entered them):</div>
      ${need<=0?'<div><span class="ok">n − 1 = 0, so no edge is needed. Stop.</span></div>':''}
    </div>${tableHTML(snaps[0])}${tnote}</div>`;
  its.forEach((it,j)=>{
    const {e}=it;
    const dec={
      continue:`Edges selected = ${it.count}, which is less than n − 1 = ${need}, so go to Step 2 again.`,
      done:`<span class="ok">Edges selected = ${it.count}, which equals n − 1 = ${need}. The spanning tree is complete. Stop.</span>`,
      empty:`Edges selected = ${it.count}, which is less than n − 1 = ${need}, but no edges are left to check. <span class="no">The graph is not connected, so no spanning tree exists. Stop.</span>`
    }[it.decision];
    h+=`<div class="it box" data-i="${j+1}"><h3>Iteration ${j+1}</h3>
    <div class="st"><b>Step 2: Select the smallest edge and check for a cycle</b>
      <div>Smallest edge not yet checked: <span class="p">${nm(e)}</span> with weight ${e.w}</div>
      <div>Component of ${esc(e.u)} = ${setTxt(it.A)}, component of ${esc(e.v)} = ${setTxt(it.B)}</div>
      ${it.cyc
        ?`<div>Both ends are in the same component, so adding ${nm(e)} forms a cycle. Skip it. MST cell = <span class="no">No</span></div>`
        :`<div>The ends are in different components, so there is no cycle. Add ${nm(e)} to the MST. MST cell = <span class="ok">Yes</span></div>
          <div>Merge the components: ${setTxt(it.merged)}</div>`}
      <div>MST so far: ${snaps[j+1].chosen.length?snaps[j+1].chosen.map(k=>nm(sorted[k])).join(', '):'no edges'} (weight ${it.total})</div>
    </div>
    <div class="st"><b>Step 3: Is the number of selected edges less than n − 1?</b>
      <div>${dec}</div></div>
    ${tableHTML(snaps[j+1])}${j===0?tnote:''}</div>`;
  });
  $('steps').innerHTML=h;
  $('steps').querySelectorAll('.it').forEach(el=>el.onclick=()=>go(+el.dataset.i));

  const last=snaps[snaps.length-1],done=last.chosen.length>=need;
  const edges=last.chosen.map(k=>sorted[k]);
  const sum=done
    ?`<div class="tsum">Minimum spanning tree with total weight <b>${last.total}</b>: <b class="mono">${edges.length?edges.map(nm).join(', '):'no edges needed'}</b></div>`
    :`<div class="tsum bad">The graph is not connected, so it has no spanning tree. The edges chosen form a minimum spanning forest of weight <b>${last.total}</b> with components ${last.comps.map(setTxt).join(' ')}.</div>`;
  let f2=`<div class="box card final"><h2>Minimum spanning ${done?'tree':'forest'}</h2>${sum}`;
  if(edges.length){
    f2+='<table><tr><th>No.</th><th>Edge</th><th>Weight</th></tr>';
    edges.forEach((e,j)=>{f2+=`<tr><td class="mono" data-l="No.">${j+1}</td><td class="mono" data-l="Edge">${nm(e)}</td><td class="mono" data-l="Weight">${e.w}</td></tr>`;});
    f2+=`<tr><td class="mono" data-l="No.">–</td><td data-l="Edge"><b>Total</b></td><td class="mono" data-l="Weight"><b>${last.total}</b></td></tr></table>`;
  }
  f2+=`<h2 style="margin-top:20px">Final edge table</h2>${tableHTML(last)}${tnote}</div>`;
  $('final').innerHTML=f2;
}

function go(i){cur=Math.max(0,Math.min(S.snaps.length-1,i));drawGraph();nav();
  document.querySelectorAll('.it').forEach(el=>el.classList.toggle('on',+el.dataset.i===cur));}
function nav(){
  const n=S?S.snaps.length-1:0;
  $('prev').disabled=!S||cur<=0;$('next').disabled=!S||cur>=n;
  let t='Type vertices to begin.';
  if(S){
    if(S.draft)t='Graph preview';
    else{const c=S.snaps[cur].chosen.length;
      t=(cur===0?'Before iteration 1':`After iteration ${cur} of ${n}`)+` · ${c} of ${S.need} edges selected`;}
  }
  $('stepLabel').textContent=t;
}
$('prev').onclick=()=>go(cur-1);$('next').onclick=()=>go(cur+1);

function run(keep){
  $('gmsg').textContent='';
  const p=parse();
  $('err').textContent=p.errs.join(' ');
  if(!p.V.length){
    S=null;cur=0;$('chips').innerHTML='';
    $('svg').innerHTML='<text x="210" y="162" text-anchor="middle" fill="var(--mute)" font-size="15">Type vertices on the left</text><text x="210" y="186" text-anchor="middle" fill="var(--mute)" font-size="15">and the nodes appear here.</text>';
    $('steps').innerHTML=hint('Add vertices and edges. The steps appear here.');
    $('final').innerHTML='';nav();return;
  }
  if(sel!==null&&!p.V.includes(sel))clearSel();
  if(sel2!==null&&!p.V.includes(sel2))sel2=null;
  S=p.E.length?solve(p):draft(p);
  render();go(keep?Math.min(cur,S.snaps.length-1):0);
}
$('run').onclick=()=>run(false);

/* ---------- edit directly on the graph (same as the Dijkstra page) ---------- */
let ed=null;
const gmsg=t=>{$('gmsg').textContent=t;};
function edit(x,y,val,commit,cancel){
  const inp=$('gedit'),sc=$('svg').getBoundingClientRect().width/420;
  ed={commit,cancel};
  inp.type='number';inp.step='any';
  inp.value=val;inp.style.left=x*sc+'px';inp.style.top=y*sc+'px';
  inp.style.width='78px';
  inp.hidden=false;inp.focus();inp.select();
}
function endEdit(ok){
  if(!ed)return;const c=ed;ed=null;const inp=$('gedit'),v=inp.value;
  inp.hidden=true;if(ok)c.commit(v);else if(c.cancel)c.cancel();
}
$('gedit').onkeydown=e=>{if(e.key==='Enter')endEdit(true);else if(e.key==='Escape')endEdit(false);};
$('gedit').onblur=()=>endEdit(true);

function setWeight(i,val){
  if(val===''||isNaN(+val)){gmsg('Weight must be a number.');return;}
  S.E[i].row.querySelectorAll('input')[2].value=val;
  run(true);
}
const HINT='Tap two vertices to connect them with an edge. Tap a weight to change it.';
const setHint=t=>{$('ghint').textContent=t||HINT;};
const clearSel=()=>{sel=sel2=null;};
function addEdge(a,b,val){
  clearSel();
  if(val===''||isNaN(+val)){gmsg('Weight must be a number.');drawGraph();setHint();return;}
  const rows=[...document.querySelectorAll('#edges .row')];
  const empty=rows.find(r=>[...r.querySelectorAll('input')].every(i=>!i.value.trim()));
  if(empty){
    const [x,y,z]=empty.querySelectorAll('input');
    x.value=a;y.value=b;z.value=val;
  }else addRow(a,b,val);
  setHint();run(true);
}
function pickVertex(v){
  if(!S)return;
  gmsg('');
  if(sel===null){sel=v;setHint(`Now tap the vertex you want to connect ${v} to.`);drawGraph();return;}
  if(sel===v){clearSel();setHint();drawGraph();return;}
  const a=sel,b=v;
  const dup=S.E.some(e=>(e.u===a&&e.v===b)||(e.u===b&&e.v===a));
  if(dup){clearSel();setHint();drawGraph();gmsg(`There is already an edge between ${a} and ${b}. Tap its weight to change it.`);return;}
  sel2=b;drawGraph();
  const P=layout(S.V);
  setHint(`Type the weight of ${a} - ${b} and press Enter (Esc cancels).`);
  edit((P[a].x+P[b].x)/2,(P[a].y+P[b].y)/2,1,val=>addEdge(a,b,val),()=>{clearSel();setHint();drawGraph();});
}
function openFrom(g){
  if(g.classList.contains('ew')){
    clearSel();setHint();
    const i=+g.dataset.e;edit(+g.dataset.x,+g.dataset.y,S.E[i].w,v=>setWeight(i,v));
  }else pickVertex(g.dataset.v);
}
$('svg').addEventListener('click',ev=>{
  const g=ev.target.closest('.ew,.vn');
  if(g&&S)openFrom(g);
  else if(sel!==null){clearSel();setHint();if(S)drawGraph();}
});
$('svg').addEventListener('keydown',ev=>{
  if(ev.key!=='Enter')return;
  const g=ev.target.closest&&ev.target.closest('.ew,.vn');if(g&&S)openFrom(g);
});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&sel!==null&&!ed){clearSel();setHint();if(S)drawGraph();}});

/* form edits update the graph live */
let tm;
$('inputCard').addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(()=>run(true),350);});

setHint();
blank();run();
