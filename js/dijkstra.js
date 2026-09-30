/* dijkstra.js  (needs js/common.js loaded first: it provides $ and esc) */
const INF=Infinity,f=x=>x===INF?'∞':x;
const lab=(d,p)=>d===INF?'[∞, -]':`[${d}, ${p==null?'-':esc(p)}]`;
let S=null,cur=0;

function addRow(u='',v='',w='',d='D'){
  const r=document.createElement('div');r.className='row';
  r.innerHTML=`<input aria-label="From" placeholder="From" value="${esc(u)}"><input aria-label="To" placeholder="To" value="${esc(v)}"><input aria-label="Weight" placeholder="Weight" type="number" min="0" step="any" value="${esc(w)}"><select aria-label="Direction"><option value="D">Directed</option><option value="U">Undirected</option></select><button class="x" type="button" aria-label="Remove edge">✕</button>`;
  r.querySelector('select').value=d;
  r.querySelector('.x').onclick=()=>{r.remove();run(true);};
  $('edges').appendChild(r);
}
function blank(){$('tgt').value='';$('verts').value='';$('src').value='';$('edges').innerHTML='';addRow();}
function example(){
  $('verts').value='s, a, b, t';$('src').value='s';$('tgt').value='t';$('edges').innerHTML='';
  [['s','a',4],['s','b',2],['b','a',1],['a','t',5],['b','t',8]].forEach(e=>addRow(e[0],e[1],e[2],'D'));
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
    const [a,b,c]=r.querySelectorAll('input'),d=r.querySelector('select').value;
    const u=a.value.trim(),v=b.value.trim();
    if(!u&&!v&&c.value==='')continue;
    if(!u||!v||c.value===''){errs.push(`Edge row ${k} is incomplete: fill in from, to and weight.`);continue;}
    if(!V.includes(u)||!V.includes(v)){errs.push(`Edge row ${k} (${u} → ${v}) uses a vertex that is not in the vertex list.`);continue;}
    if(+c.value<0){errs.push(`Edge row ${k} needs a weight of 0 or more. Dijkstra cannot use negative weights.`);continue;}
    E.push({u,v,w:+c.value,d,row:r});
  }
  let src=$('src').value.trim(),okS=true;
  if(!src&&V.length)src=V[0];
  if(V.length&&!V.includes(src)){errs.push(`Source "${src}" is not in the vertex list.`);okS=false;}
  let tg=$('tgt').value.trim();
  if(tg&&!V.includes(tg)){errs.push(`Target "${tg}" is not in the vertex list.`);tg='';}
  return {V,E,s:src,t:tg,stop:$('stop').checked,errs,okS};
}
const hint=t=>`<div class="box card"><p class="sec-s" style="margin:0">${t}</p></div>`;
function draft(p){
  return {V:p.V,E:p.E,s:p.s,t:p.t,its:[],snaps:[{u:null,L:p.V.map(v=>({v,d:INF,p:null,perm:false}))}],T:{},pred:{},perm:new Set(),draft:true};
}

function solve({V,E,s,t,stop}){
  const adj={};V.forEach(v=>adj[v]=[]);
  E.forEach(e=>{adj[e.u].push([e.v,e.w]);if(e.d==='U')adj[e.v].push([e.u,e.w]);});
  const T={},pred={},perm=new Set(),ord={};V.forEach(v=>{T[v]=INF;pred[v]=null;});T[s]=0;
  const snap=u=>({u,L:V.map(v=>({v,d:T[v],p:pred[v],perm:perm.has(v),ord:ord[v]}))});
  const snaps=[snap(null)],its=[];let stopped=false;
  for(;;){
    const cand=V.filter(v=>!perm.has(v)&&T[v]<INF);if(!cand.length)break;
    const u=cand.reduce((a,b)=>T[b]<T[a]?b:a);
    const temps=V.filter(v=>!perm.has(v)).map(v=>`T(${esc(v)}) = ${f(T[v])}`);
    perm.add(u);ord[u]=perm.size;const pl=lab(T[u],pred[u]);
    if(stop&&t&&u===t){its.push({u,temps,pl,pu:pred[u],du:T[u],ups:[],hit:true});snaps.push(snap(u));stopped=true;break;}
    const ups=[];
    adj[u].filter(([v])=>!perm.has(v)).forEach(([v,w])=>{
      const old=T[v],nw=T[u]+w,better=nw<old;
      if(better){T[v]=nw;pred[v]=u;}
      ups.push({v,w,old,nw,better,label:lab(T[v],pred[v])});
    });
    its.push({u,temps,pl,pu:pred[u],du:T[u],ups});
    snaps.push(snap(u));
  }
  return {V,E,s,t,stopped,its,snaps,T,pred,perm};
}

function chips(sn){
  const c=x=>`<span class="chip ${x.k}">${x.n!=null?`<i>${x.n}</i>`:''}${esc(x.v)}${x.d!=null?` <em>${f(x.d)}</em>`:''}</span>`;
  const vis=sn.L.filter(o=>o.perm).sort((a,b)=>a.ord-b.ord).map(o=>c({k:'v',n:o.ord,v:o.v,d:o.d}));
  const fr=sn.L.filter(o=>!o.perm&&o.d<INF).sort((a,b)=>a.d-b.d).map(o=>c({k:'f',v:o.v,d:o.d}));
  const un=sn.L.filter(o=>!o.perm&&o.d===INF).map(o=>c({k:'u',v:o.v}));
  const row=(t,a)=>`<div class="crow"><span class="cl">${t}</span>${a.length?a.join(''):'<span class="none">none</span>'}</div>`;
  const tg=S.t?`<div class="crow"><span class="cl">Target</span><span class="chip t">${esc(S.t)}</span></div>`:'';
  $('chips').innerHTML=row('Visited (in order)',vis)+row('Frontier (temporary)',fr)+row('Not reached yet',un)+tg;
}
function layout(V){
  const n=V.length,P={};
  V.forEach((v,i)=>{const a=-Math.PI/2+2*Math.PI*i/n;
    P[v]=n===1?{x:210,y:170}:{x:210+140*Math.cos(a),y:170+125*Math.sin(a)};});
  return P;
}
function drawGraph(){
  const {V,E,snaps}=S,sn=snaps[cur],P=layout(V),R=19;
  const st={};sn.L.forEach(o=>st[o.v]=o);
  const pk=new Set(),pv=new Set();
  if(S.t&&st[S.t]&&st[S.t].perm){let x=S.t;pv.add(x);while(st[x].p!=null){pk.add(st[x].p+'>'+x);x=st[x].p;pv.add(x);}}
  const onPath=e=>pk.has(e.u+'>'+e.v)||(e.d==='U'&&pk.has(e.v+'>'+e.u));
  const hl=(e)=>{const a=st[e.v],b=st[e.u];return (a.perm&&a.p===e.u)||(e.d==='U'&&b.perm&&b.p===e.v);};
  let h='<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>';
  E.forEach((e,i)=>{
    const A=P[e.u],B=P[e.v];let body,mx,my;
    if(e.u===e.v){
      body=`M${A.x-8} ${A.y-R+2}C${A.x-40} ${A.y-70} ${A.x+40} ${A.y-70} ${A.x+8} ${A.y-R+2}`;mx=A.x;my=A.y-55;
    }else{
      const dx=B.x-A.x,dy=B.y-A.y,L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L;
      const bend=e.d==='D'?0.14:0,cx=(A.x+B.x)/2-uy*L*bend,cy=(A.y+B.y)/2+ux*L*bend;
      const s={x:A.x+ux*R,y:A.y+uy*R},t={x:B.x-ux*(R+(e.d==='D'?5:0)),y:B.y-uy*(R+(e.d==='D'?5:0))};
      body=`M${s.x} ${s.y}Q${cx} ${cy} ${t.x} ${t.y}`;
      mx=.25*s.x+.5*cx+.25*t.x;my=.25*s.y+.5*cy+.25*t.y;
    }
    const on=hl(e),op=onPath(e);
    h+=`<path d="${body}" fill="none" stroke="${op?'var(--ok)':on?'var(--o)':'var(--mute)'}" stroke-width="${op?4.5:on?3.5:1.5}" ${e.d==='D'?'marker-end="url(#ar)"':''} opacity="${on||op?1:.75}"/>`;
    const ws=String(e.w),ww=Math.max(28,ws.length*8+14);
    h+=`<g class="ew" data-e="${i}" data-x="${mx}" data-y="${my-9}" tabindex="0" role="button" aria-label="Edit weight of edge ${esc(e.u)} to ${esc(e.v)}"><rect x="${mx-ww/2}" y="${my-18}" width="${ww}" height="18" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/><text x="${mx}" y="${my-5}" text-anchor="middle" font-size="12" font-family="JetBrains Mono,monospace" fill="var(--ink)">${esc(e.w)}</text></g>`;
  });
  V.forEach(v=>{
    const p=P[v],o=st[v],isCur=sn.u===v;
    h+=`<g class="vn" data-v="${esc(v)}" data-x="${p.x}" data-y="${p.y}" tabindex="0" role="button" aria-label="Select vertex ${esc(v)} to draw an edge">`;
    const front=!o.perm&&o.d<INF,isT=v===S.t,onP=pv.has(v);
    if(v===sel||v===sel2)h+=`<circle cx="${p.x}" cy="${p.y}" r="${R+4}" fill="none" stroke="var(--o)" stroke-width="3"/>`;
    if(isT)h+=`<circle cx="${p.x}" cy="${p.y}" r="${R+7}" fill="none" stroke="var(--ok)" stroke-width="2" ${o.perm?'':'stroke-dasharray="4 3"'}/>`;
    h+=`<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${o.perm?'var(--perm)':'var(--panel)'}" stroke="${isCur?'var(--ink)':onP?'var(--ok)':front?'var(--ink)':o.perm?'var(--ink)':'var(--mute)'}" stroke-width="${isCur?4:onP?3:1.5}" ${front&&!isCur?'stroke-dasharray="4 3"':''}/>`;
    if(o.perm)h+=`<circle cx="${p.x+R-3}" cy="${p.y-R+3}" r="8" fill="var(--bg)" stroke="var(--ink)"/><text x="${p.x+R-3}" y="${p.y-R+6.5}" text-anchor="middle" font-size="10" font-family="JetBrains Mono,monospace" fill="var(--ink)">${o.ord}</text>`;
    h+=`<text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">${esc(v)}</text>`;
    h+='</g>';
    const txt=o.d===INF?'':`${o.d}`;
    const dy=(p.y<170?-R-8:R+16)+(isT?(p.y<170?-7:7):0);
    if(txt||(v===S.s&&!S.draft)) h+=`<text x="${p.x}" y="${p.y+dy}" text-anchor="middle" font-size="11" font-family="JetBrains Mono,monospace" fill="${o.perm?'var(--o-dark)':'var(--ink)'}" font-weight="700">${lab(o.d,o.p)}</text>`;
  });
  $('svg').innerHTML=h;chips(sn);
}

const snapLine=(sn)=>sn.L.map(o=>`<span class="${o.perm?'p':'t'}">${o.perm?'P':'T'}(${esc(o.v)})</span> = ${lab(o.d,o.p)}`).join(',&nbsp; ');

function render(){
  const {its,snaps,V,s}=S;
  if(S.draft){$('steps').innerHTML=hint(S.E.length?'Fix the source vertex to see the steps.':'Add at least one edge to see the steps.');$('final').innerHTML='';return;}
  let h=`<div class="it box" data-i="0"><h3>Initialisation</h3><div class="st">The source ${esc(s)} gets <span class="mono">[0, -]</span>; every other vertex gets <span class="mono">[∞, -]</span>.</div><div class="snap">${snapLine(snaps[0])}</div></div>`;
  its.forEach((it,k)=>{
    h+=`<div class="it box" data-i="${k+1}"><h3>Iteration ${k+1}</h3>
    <div class="st"><b>Step 1: Find the minimum temporary label and label it permanently</b>
      <div>Temporary distances: ${it.temps.join(', ')}</div>
      <div>Minimum is T(${esc(it.u)}) = ${f(it.du)}</div>
      <div>Label: <span class="p">P(${esc(it.u)}) = ${lab(it.du,it.pu)}</span></div></div>
    <div class="st"><b>${it.hit?'Step 2: Target reached':'Step 2: New temporary labels for vertices adjacent to '+esc(it.u)}</b>`;
    if(it.hit) h+=`<div><span class="ok">Target ${esc(it.u)} is now permanently labelled, so its distance ${f(it.du)} is final. Stop.</span></div>`;
    else if(!it.ups.length) h+=`<div>No outgoing edge to a non-permanent vertex, nothing to update.</div>`;
    it.ups.forEach(x=>{
      h+=`<div>T(${esc(x.v)}) = min(T(${esc(x.v)}), P(${esc(it.u)}) + w(${esc(it.u)},${esc(x.v)})) = min(${f(x.old)}, ${f(it.du)} + ${x.w}) = min(${f(x.old)}, ${f(x.nw)}) = ${f(Math.min(x.old,x.nw))} &rarr; <span class="t">T(${esc(x.v)}) = ${x.label}</span> (${x.better?'updated':'no change'})</div>`;
    });
    h+=`</div><div class="snap">${snapLine(snaps[k+1])}</div></div>`;
  });
  $('steps').innerHTML=h;
  $('steps').querySelectorAll('.it').forEach(el=>el.onclick=()=>go(+el.dataset.i));

  const {T,pred,perm}=S;
  const tsum=()=>{
    if(!S.t)return '';
    if(!perm.has(S.t))return `<div class="tsum bad">No path: ${esc(S.t)} cannot be reached from ${esc(s)}.</div>`;
    const path=[S.t];let x=S.t;while(pred[x]!=null){x=pred[x];path.push(x);}
    return `<div class="tsum">Shortest path from ${esc(s)} to ${esc(S.t)}: <b class="mono">${path.reverse().map(esc).join(' → ')}</b> with length <b>${T[S.t]}</b>${S.stopped?' (stopped as soon as the target was labelled)':''}</div>`;
  };
  let f2=`<div class="box card final"><h2>Final permanent labels and shortest paths</h2>${tsum()}<table><tr><th>Vertex</th><th>Label</th><th>Shortest path (traced back through the labels)</th></tr>`;
  V.forEach(v=>{
    if(!perm.has(v)){f2+=`<tr${v===S.t?' class="tgt"':''}><td class="mono" data-l="Vertex">${esc(v)}</td><td class="mono" data-l="Label">${lab(T[v],pred[v])}</td><td data-l="Shortest path">${S.stopped?'Not visited (stopped at the target)':'Unreachable from '+esc(s)}</td></tr>`;return;}
    const path=[v],trace=[];let x=v;
    while(pred[x]!=null){trace.push(`P(${esc(x)}) = ${lab(T[x],pred[x])}: came from ${esc(pred[x])}`);x=pred[x];path.push(x);}
    trace.push(`P(${esc(x)}) = ${lab(T[x],pred[x])}: source, stop`);
    f2+=`<tr${v===S.t?' class="tgt"':''}><td class="mono" data-l="Vertex">${esc(v)}</td><td class="mono" data-l="Label">${lab(T[v],pred[v])}</td><td data-l="Shortest path"><div class="path ok">${path.reverse().map(esc).join(' → ')} &nbsp;(length ${T[v]})</div><div class="path" style="color:var(--mute)">${trace.join('<br>')}</div></td></tr>`;
  });
  $('final').innerHTML=f2+'</table></div>';
}

function go(i){cur=Math.max(0,Math.min(S.snaps.length-1,i));drawGraph();nav();
  document.querySelectorAll('.it').forEach(el=>el.classList.toggle('on',+el.dataset.i===cur));}
function nav(){
  const n=S?S.snaps.length-1:0;
  $('prev').disabled=!S||cur<=0;$('next').disabled=!S||cur>=n;
  $('stepLabel').textContent=!S?'Type vertices to begin.':S.draft?'Graph preview':cur===0?'Before iteration 1':`After iteration ${cur} of ${n}`;
}
$('prev').onclick=()=>go(cur-1);$('next').onclick=()=>go(cur+1);

function run(keep){
  $('gmsg').textContent='';
  const p=parse();
  $('err').textContent=p.errs.join(' ');
  if(!p.V.length){
    S=null;cur=0;$('chips').innerHTML='';
    $('svg').innerHTML='<text x="210" y="162" text-anchor="middle" fill="var(--mute)" font-size="15">Type vertices on the left</text><text x="210" y="186" text-anchor="middle" fill="var(--mute)" font-size="15">and the nodes appear here.</text>';
    $('steps').innerHTML=hint('Add vertices, edges and a source. The steps appear here.');
    $('final').innerHTML='';nav();return;
  }
  if(sel!==null&&!p.V.includes(sel))clearSel();
  if(sel2!==null&&!p.V.includes(sel2))sel2=null;
  S=(p.E.length&&p.okS)?solve(p):draft(p);
  render();go(keep?Math.min(cur,S.snaps.length-1):0);
}
$('run').onclick=()=>run(false);

/* ---------- edit directly on the graph ---------- */
let ed=null;
const gmsg=t=>{$('gmsg').textContent=t;};
function edit(kind,x,y,val,commit,cancel){
  const inp=$('gedit'),sc=$('svg').getBoundingClientRect().width/420;
  ed={commit,cancel};
  inp.type=kind==='w'?'number':'text';
  if(kind==='w'){inp.min=0;inp.step='any';}
  inp.value=val;inp.style.left=x*sc+'px';inp.style.top=y*sc+'px';
  inp.style.width=(kind==='w'?78:100)+'px';
  inp.hidden=false;inp.focus();inp.select();
}
function endEdit(ok){
  if(!ed)return;const c=ed;ed=null;const inp=$('gedit'),v=inp.value;
  inp.hidden=true;if(ok)c.commit(v);else if(c.cancel)c.cancel();
}
$('gedit').onkeydown=e=>{if(e.key==='Enter')endEdit(true);else if(e.key==='Escape')endEdit(false);};
$('gedit').onblur=()=>endEdit(true);

function setWeight(i,val){
  if(val===''||isNaN(+val)||+val<0){gmsg('Weight must be a number, 0 or more.');return;}
  S.E[i].row.querySelectorAll('input')[2].value=val;
  run(true);
}
let sel=null,sel2=null;
const HINT='Tap two vertices to connect them with an edge. Tap a weight to change it.';
const setHint=t=>{$('ghint').textContent=t||HINT;};
const clearSel=()=>{sel=sel2=null;};
function addEdge(a,b,val,dir){
  clearSel();
  if(val===''||isNaN(+val)||+val<0){gmsg('Weight must be a number, 0 or more.');drawGraph();setHint();return;}
  const rows=[...document.querySelectorAll('#edges .row')];
  const empty=rows.find(r=>[...r.querySelectorAll('input')].every(i=>!i.value.trim()));
  if(empty){
    const [x,y,z]=empty.querySelectorAll('input');
    x.value=a;y.value=b;z.value=val;empty.querySelector('select').value=dir;
  }else addRow(a,b,val,dir);
  setHint();run(true);
}
function pickVertex(v){
  if(!S)return;
  gmsg('');
  if(sel===null){sel=v;setHint(`Now tap the vertex you want to connect ${v} to.`);drawGraph();return;}
  if(sel===v){clearSel();setHint();drawGraph();return;}
  const a=sel,b=v,dir=$('newdir').value;
  const dup=S.E.some(e=>(e.u===a&&e.v===b)||(e.u===b&&e.v===a&&(e.d==='U'||dir==='U')));
  if(dup){clearSel();setHint();drawGraph();gmsg(`There is already an edge between ${a} and ${b}. Tap its weight to change it.`);return;}
  sel2=b;drawGraph();
  const P=layout(S.V);
  setHint(`Type the weight of ${a} → ${b} and press Enter (Esc cancels).`);
  edit('w',(P[a].x+P[b].x)/2,(P[a].y+P[b].y)/2,1,val=>addEdge(a,b,val,dir),()=>{clearSel();setHint();drawGraph();});
}
function openFrom(g){
  if(g.classList.contains('ew')){
    clearSel();setHint();
    const i=+g.dataset.e;edit('w',+g.dataset.x,+g.dataset.y,S.E[i].w,v=>setWeight(i,v));
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
