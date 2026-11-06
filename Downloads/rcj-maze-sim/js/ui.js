"use strict";
const $=id=>document.getElementById(id);
/* Links to the rules PDF, opened at the page of each section */
const RULES_PDF = (typeof window!=="undefined" && window.RULES_PDF_URL) || "rules/RCJRescueMaze2027-draft.pdf";
const RULE_PAGE = {"4.1":16,"4.1.1":16,"4.1.2":16,"4.1.3":16,"4.1.5":16,"4.2":16,"4.4":17,"4.4.1":17,"4.4.2":17,"4.4.3":17,"4.4.4":17,"4.4.5":18,"6.7":23,"6.8":24,"6.8.2":24};
function ruleHref(code){ const p=RULE_PAGE[code]||RULE_PAGE[code.split(".").slice(0,3).join(".")]||RULE_PAGE[code.split(".").slice(0,2).join(".")]||1; return RULES_PDF+"#page="+p; }
function ruleA(code,inner){ return `<a class="rl" href="${ruleHref(code)}" target="_blank" rel="noopener" title="Open rule ${code} in the 2027 rules PDF">${inner||code}</a>`; }
function linkRules(t){ return t.replace(/\((\d\.\d(?:\.\d+)?)\)/g,(m,c)=>"("+ruleA(c)+")"); }
function linkStatic(){
  document.querySelectorAll(".rules code").forEach(el=>{ const c=el.textContent.split(/[–\/ ]/)[0]; const a=document.createElement("span"); a.innerHTML=ruleA(c,el.outerHTML); el.replaceWith(a.firstChild); });
  document.querySelectorAll("[data-rules]").forEach(el=>{ el.innerHTML=linkRules(el.innerHTML); });
  document.querySelectorAll("a[data-rulepdf]").forEach(a=>{ a.href=RULES_PDF+"#page="+(a.dataset.rulepdf||1); });
}
const C={scen:"rampa",dir:"up",dz:false,tol:true,rmode:"ang",th:25,tiles:1,Hh:14,Lh:28,bumps:null,
  sth:25,sh:2,ns:4,land:28,m:1.8,L:13,hcg:4.5,cgf:50,c:1.6,o:3,mat:"silicone",floor:"mdf",D:65,muOn:false,muv:0.9,
  drive:"4wd",mot:"p25",nm:4,ts:6,rpm:290,eta:80,kop:70};
const SL={
  th:{l:"Incline",min:0,max:35,step:0.5,u:"°",d:1},
  tiles:{l:"Ramp tiles (28 cm)",min:1,max:3,step:1,u:"",d:0},
  Hh:{l:"Height gained",min:1,max:30,step:0.5,u:" cm",d:1},
  Lh:{l:"Horizontal length",min:10,max:90,step:1,u:" cm",d:0},
  sth:{l:"Stair incline",min:10,max:35,step:0.5,u:"°",d:1},
  sh:{l:"Step height",min:0.5,max:2.5,step:0.1,u:" cm",d:1},
  ns:{l:"Number of steps",min:1,max:8,step:1,u:"",d:0},
  land:{l:"Top length",min:10,max:40,step:1,u:" cm",d:0},
  m:{l:"Mass",min:0.5,max:4,step:0.05,u:" kg",d:2},
  L:{l:"Wheelbase",min:6,max:25,step:0.5,u:" cm",d:1},
  hcg:{l:"Center of mass height",min:2,max:12,step:0.1,u:" cm",d:1},
  cgf:{l:"CoM ahead of rear axle",min:20,max:80,step:1,u:" %",d:0},
  c:{l:"Ground clearance",min:0.3,max:4,step:0.1,u:" cm",d:1},
  o:{l:"Overhang past axles",min:0,max:8,step:0.5,u:" cm",d:1},
  D:{l:"Wheel diameter",min:30,max:100,step:1,u:" mm",d:0},
  muv:{l:"Measured μ",min:0.1,max:1.6,step:0.01,u:"",d:2},
  nm:{l:"Drive motors",min:1,max:6,step:1,u:"",d:0},
  ts:{l:"Stall torque per motor",min:0.3,max:20,step:0.1,u:" kgf·cm",d:1},
  rpm:{l:"No-load speed",min:20,max:600,step:5,u:" rpm",d:0},
  eta:{l:"Transmission efficiency",min:40,max:98,step:1,u:" %",d:0},
  kop:{l:"Usable fraction of stall",min:20,max:100,step:5,u:" %",d:0}
};
document.querySelectorAll(".ctl").forEach(el=>{
  const k=el.dataset.k, s=SL[k];
  el.className="row"; el.id="w-"+k;
  el.innerHTML=`<label for="in-${k}">${s.l}</label><output id="out-${k}"></output><input type="range" id="in-${k}" min="${s.min}" max="${s.max}" step="${s.step}" value="${C[k]}">`;
  el.querySelector("input").addEventListener("input",e=>{ C[k]=parseFloat(e.target.value); if(k==="ts"||k==="rpm"){ C.mot="custom"; $("mot").value="custom"; } refresh(); });
});
function setOut(k){ const s=SL[k]; $("out-"+k).textContent=fmt(C[k],s.d)+s.u; $("in-"+k).value=C[k]; }
Object.entries(MATS).forEach(([k,v])=>$("mat").insertAdjacentHTML("beforeend",`<option value="${k}">${v.n}</option>`));
Object.entries(FLOORS).forEach(([k,v])=>$("floor").insertAdjacentHTML("beforeend",`<option value="${k}">${v.n}</option>`));
Object.entries(MOTORS).forEach(([k,v])=>$("mot").insertAdjacentHTML("beforeend",`<option value="${k}">${v.n}</option>`));
["rmode","mat","floor","drive"].forEach(k=>{ $(k).value=C[k]; $(k).addEventListener("change",e=>{C[k]=e.target.value; refresh();}); });
$("mot").value=C.mot;
$("mot").addEventListener("change",e=>{ C.mot=e.target.value; const m=MOTORS[C.mot]; if(m.ts){ C.ts=m.ts; C.rpm=m.rpm; } refresh(); });
["dz","tol","muOn"].forEach(k=>{ $(k).checked=C[k]; $(k).addEventListener("change",e=>{C[k]=e.target.checked; refresh();}); });
/* each scenario keeps its own bump count, so switching never adds or removes bumps */
const BUMPS={rampa:[], lombada:[{h:1,shape:"rect"}], escada:[]};
C.bumps=BUMPS[C.scen];
function segBind(id,key){ $(id).querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
  C[key]=b.dataset.v; if(key==="scen"){ C.bumps=BUMPS[C.scen]; renderBumps(); } refresh(); })); }
const MAXB=6;
function renderBumps(){
  const L=C.bumps;
  $("bumps").innerHTML = L.length ? L.map((b,i)=>`<div class="bump">
    <label for="bh-${i}">Bump ${i+1}</label><output id="bo-${i}">${fmt(b.h,1)} cm</output><button class="rm" type="button" data-i="${i}" aria-label="Remove bump ${i+1}">Remove</button>
    <input type="range" id="bh-${i}" data-i="${i}" min="0.2" max="2.5" step="0.1" value="${b.h}" aria-label="Height of bump ${i+1}">
    <select id="bs-${i}" data-i="${i}" aria-label="Profile of bump ${i+1}"><option value="rect"${b.shape==="rect"?" selected":""}>Rectangular strip (2 cm wide)</option><option value="round"${b.shape==="round"?" selected":""}>Half-round (cylindrical)</option></select>
  </div>`).join("") : `<p class="hint">No speed bumps: the ${C.scen==="rampa"?"ramp":"floor"} is clear. Add one to test it.</p>`;
  $("addBump").disabled = L.length>=MAXB;
  $("bumps").querySelectorAll("input[type=range]").forEach(el=>el.addEventListener("input",e=>{ const i=+e.target.dataset.i; L[i].h=parseFloat(e.target.value); $("bo-"+i).textContent=fmt(L[i].h,1)+" cm"; refresh(); }));
  $("bumps").querySelectorAll("select").forEach(el=>el.addEventListener("change",e=>{ L[+e.target.dataset.i].shape=e.target.value; refresh(); }));
  $("bumps").querySelectorAll(".rm").forEach(el=>el.addEventListener("click",e=>{ L.splice(+e.currentTarget.dataset.i,1); renderBumps(); refresh(); }));
}
$("addBump").addEventListener("click",()=>{ const L=C.bumps; if(L.length>=MAXB) return; const last=L[L.length-1]; L.push({h:last?last.h:1, shape:last?last.shape:"rect"}); renderBumps(); refresh(); });
segBind("seg-scen","scen"); segBind("seg-dir","dir");
function slipMu(){ const a=parseFloat($("slipA").value)||0; return Math.tan(a*DEG); }
$("slipA").addEventListener("input",()=>{$("slipMu").textContent=fmt(slipMu(),2);});
$("useSlip").addEventListener("click",()=>{ C.muOn=true; C.muv=Math.min(1.6,Math.max(0.1,+slipMu().toFixed(2))); refresh(); });

/* ---------- scene ---------- */
const NS="http://www.w3.org/2000/svg";
const svg=$("scene");
const mk=(tag,attrs,parent)=>{ const e=document.createElementNS(NS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); (parent||svg).appendChild(e); return e; };
let A={poses:[],i:0,playing:true,stop:-1,hold:0,arc:[],r:3,fail:null,last:0};
let R={};
function buildScene(ev){
  const g=ev.g, P=g.P, r=g.r;
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  const xs=P.map(p=>p.x), ys=P.map(p=>p.y);
  const xmin=Math.min(...xs), xmax=Math.max(...xs), ymax=Math.max(...ys);
  const top=ymax+Math.max(C.hcg*2,8)+r+8, bot=-7;
  const W=xmax-xmin+4; svg.setAttribute("viewBox",`${xmin-2} ${-top} ${W} ${top-bot}`);
  const fs=Math.max(2.2,W/62);
  const gr=mk("g",{stroke:"var(--grid)","stroke-width":0.15});
  for(let x=Math.ceil(xmin/10)*10;x<=xmax;x+=10) mk("line",{x1:x,y1:-top,x2:x,y2:-bot},gr);
  // terrain
  let d=`M ${P[0].x} ${-bot} `; P.forEach(p=>d+=`L ${p.x} ${-p.y} `); d+=`L ${P[P.length-1].x} ${-bot} Z`;
  mk("path",{d,fill:"var(--terrain)",stroke:"var(--terrain-edge)","stroke-width":0.3,"stroke-linejoin":"round"});
  g.full.ob.forEach(o=>{ let dd=""; for(let i=o.iS;i<=o.iE;i++) dd+=(i===o.iS?"M":"L")+` ${P[i].x} ${-P[i].y} `; mk("path",{d:dd+"Z",fill:"var(--bump)",opacity:0.9}); });
  // tiles
  const tk=mk("g",{fill:"var(--bg)","font-size":fs*0.8,"font-family":"IBM Plex Mono, monospace"});
  for(let x=Math.ceil((xmin+5)/28)*28; x<=xmax-5; x+=28){ mk("line",{x1:x,y1:-bot+0.5,x2:x,y2:-bot-1.6,stroke:"var(--muted)","stroke-width":0.2},tk); }
  mk("text",{x:xmin+1,y:-bot-1.8},tk).textContent="ticks every 28 cm (1 tile)";
  g.full.marks.forEach(m=>{ const y=terrainY(P,m.x); if(y<-1e8) return; mk("line",{x1:m.x,y1:-y,x2:m.x,y2:-y-3,stroke:"var(--accent)","stroke-width":0.25,"stroke-dasharray":"0.6 0.5"}); mk("text",{x:m.x+0.6,y:-y-3.4,fill:"var(--accent)","font-size":fs*0.8,"font-family":"IBM Plex Sans, sans-serif"}).textContent=m.t; });
  // failure marker
  R.fail=mk("g",{opacity:0});
  R.failC=mk("circle",{r:r*1.8,fill:"none",stroke:"var(--bad)","stroke-width":0.4,"stroke-dasharray":"1 0.7"},R.fail);
  R.failT=mk("text",{fill:"var(--bad)","font-size":fs,"font-weight":600,"font-family":"IBM Plex Sans, sans-serif"},R.fail);
  // robot
  R.body=mk("polygon",{fill:"var(--robot-fill)",stroke:"var(--robot)","stroke-width":0.35,"stroke-linejoin":"round"});
  R.wheels=[0,1].map(()=>{ const wg=mk("g",{}); const ci=mk("circle",{r,fill:"var(--wheel)",opacity:0.92},wg); mk("circle",{r:r*0.28,fill:"var(--robot-fill)"},wg); const sp=[0,1,2].map(()=>mk("line",{stroke:"var(--robot-fill)","stroke-width":Math.max(0.18,r*0.08)},wg)); return {wg,ci,sp}; });
  R.cg=mk("g",{});
  mk("circle",{r:Math.max(0.6,r*0.22),fill:"var(--accent)"},R.cg);
  R.wArrow=mk("line",{stroke:"var(--accent)","stroke-width":0.35,"marker-end":"url(#ah)"});
  const defs=mk("defs",{}); const mkr=mk("marker",{id:"ah",viewBox:"0 0 10 10",refX:8,refY:5,markerWidth:4,markerHeight:4,orient:"auto-start-reverse"},defs); mk("path",{d:"M0 0 L10 5 L0 10 Z",fill:"var(--accent)"},mkr);
  R.label=mk("text",{x:xmin+1,y:-top+fs*1.3,fill:"var(--ink)","font-size":fs,"font-family":"IBM Plex Mono, monospace"});
  A.poses=g.poses; A.r=r; A.arc=[0];
  for(let i=1;i<g.poses.length;i++){ const a=g.poses[i-1], b=g.poses[i]; A.arc.push(A.arc[i-1]+Math.hypot(b.xr-a.xr,b.yr-a.yr)); }
  // stop point
  let stop=-1, fail=null;
  for(const it of ev.items){
    if(it.st!=="bad") continue; let idx=-1;
    if(it.k==="gap") idx=it.scrapeIdx;
    else { const xs=it.xStop; idx=g.poses.findIndex(p=>p.xf>=xs); }
    if(idx>=0 && (stop<0 || idx<stop)){ stop=idx; fail=it; }
  }
  A.stop=stop; A.fail=fail; A.i=0; A.hold=0;
  R.fs=fs; R.top=top;
}
function drawPose(i,spin){
  const p=A.poses[Math.max(0,Math.min(A.poses.length-1,Math.round(i)))], r=A.r;
  const L=Math.hypot(p.xf-p.xr,p.yf-p.yr), ux=(p.xf-p.xr)/L, uy=(p.yf-p.yr)/L, vx=-uy, vy=ux;
  const lo=-(r-C.c), hi=Math.max(C.hcg*2,6)-r;
  const pt=(s,k)=>`${p.xr+s*ux+k*vx},${-(p.yr+s*uy+k*vy)}`;
  R.body.setAttribute("points",[pt(-C.o,lo),pt(L+C.o,lo),pt(L+C.o,hi),pt(-C.o,hi)].join(" "));
  const ang=-(A.arc[Math.round(i)]||0)/r + (spin||0);
  [[p.xr,p.yr],[p.xf,p.yf]].forEach(([x,y],j)=>{ const w=R.wheels[j]; w.ci.setAttribute("cx",x); w.ci.setAttribute("cy",-y); w.wg.children[1].setAttribute("cx",x); w.wg.children[1].setAttribute("cy",-y);
    w.sp.forEach((ln,k)=>{ const a=ang+k*Math.PI/3; ln.setAttribute("x1",x+r*0.9*Math.cos(a)); ln.setAttribute("y1",-(y+r*0.9*Math.sin(a))); ln.setAttribute("x2",x-r*0.9*Math.cos(a)); ln.setAttribute("y2",-(y-r*0.9*Math.sin(a))); }); });
  const ar=C.cgf/100*L, gx=p.xr+ar*ux+(C.hcg-r)*vx, gy=p.yr+ar*uy+(C.hcg-r)*vy;
  R.cg.setAttribute("transform",`translate(${gx},${-gy})`);
  R.wArrow.setAttribute("x1",gx); R.wArrow.setAttribute("y1",-gy); R.wArrow.setAttribute("x2",gx); R.wArrow.setAttribute("y2",-gy+Math.max(4,C.hcg*0.9));
  const pitch=Math.atan2(uy,ux)/DEG;
  R.label.textContent=`robot pitch ${fmt(pitch,1)}° · clearance ${fmt(p.gap,2)} cm`;
}
function frame(ts){
  const dt=Math.min(0.05,(ts-(A.last||ts))/1000); A.last=ts;
  if(A.playing && A.poses.length){
    const end = A.stop>=0 ? A.stop : A.poses.length-1;
    if(A.i<end){ A.i=Math.min(end,A.i+dt*55); drawPose(A.i,0); R.fail.setAttribute("opacity",0); }
    else {
      A.hold+=dt;
      if(A.stop>=0){
        const p=A.poses[A.stop]; drawPose(A.i, A.hold*14);
        const f=A.fail; let cx=p.xf, cy=p.yf;
        if(f.k==="gap"){ cx=(p.xr+p.xf)/2; cy=(p.yr+p.yf)/2-A.r; } else if(f.k==="plain"){ cx=(p.xr+p.xf)/2; cy=(p.yr+p.yf)/2; }
        R.failC.setAttribute("cx",cx); R.failC.setAttribute("cy",-cy);
        R.failT.setAttribute("x",cx+A.r*2); R.failT.setAttribute("y",-cy-A.r*2); R.failT.textContent=REASON[f.reason]||"failure";
        R.fail.setAttribute("opacity",1);
      } else drawPose(A.i,0);
      if(A.hold>2.2){ A.i=0; A.hold=0; }
    }
  }
  requestAnimationFrame(frame);
}
$("play").addEventListener("click",()=>{ A.playing=!A.playing; $("play").textContent=A.playing?"Pause":"Resume"; });
$("restart").addEventListener("click",()=>{ A.i=0; A.hold=0; A.playing=true; $("play").textContent="Pause"; });

/* ---------- panels ---------- */
function itemDetail(it,ph){
  const a=it.a;
  if(it.k==="gap") return it.st==="bad" ? `touches the terrain: ${it.where}` : `minimum clearance ${fmt(it.gap,2)} cm (${it.where})`;
  if(a.reason==="face") return `${it.sub}: height ≥ wheel radius (${fmt(C.D/20,2)} cm)`;
  if(a.reason==="tomb_tras"||a.reason==="tomb_frente") return `${it.sub?it.sub+": ":""}a wheel normal force goes negative`;
  const mu = `μ required ${fmt(a.muReq,2)} · available ${fmt(ph.mu,2)}`;
  const tq = isFinite(a.Treq) ? ` · torque ${fmt(a.Treq,3)} of ${fmt(ph.Tf+ph.Tr,3)} N·m` : "";
  return (it.sub?it.sub+": ":"")+mu+tq;
}
function renderChecks(ev){
  $("checks").innerHTML=ev.items.map(it=>{
    const mv = it.k==="gap" ? (it.st==="bad"?"scrapes":fmt(it.gap,2)+" cm") : (it.reason && it.reason!=="slip" && it.reason!=="torque" ? "fail" : fmt(it.margin,2)+"×");
    const lab = it.reason ? it.label+" — "+REASON[it.reason] : it.label;
    return `<div class="chk st-${it.st}"><span class="dot"></span><div><b>${lab}</b><small>${itemDetail(it,ev.ph)}</small></div><div class="mv">${mv}</div></div>`;
  }).join("");
  const rc=rulesCheck(C);
  $("rulechecks").innerHTML=rc.map(x=>`<div class="chk st-${x.st}"><span class="dot"></span><div><b>${linkRules(x.t)}</b><small>${x.st==="ok"?"within the rules":(x.st==="warn"?"above nominal, within the 10 % tolerance":"outside the rules")}</small></div><div class="mv">${x.v}</div></div>`).join("");
  const v=$("verdict"); v.className="verdict v-"+ev.st; v.textContent= ev.st==="ok"?"Passes":(ev.st==="warn"?"Marginal":"Fails");
}
function renderKV(ev){
  const ph=ev.ph, r=C.D/20, ar=C.cgf/100*C.L, af=C.L-ar;
  const smax1 = r*(1-1/Math.sqrt(1+ph.mu*ph.mu));
  const ms=maxStep(C);
  const tipB=Math.atan(ar/C.hcg)/DEG, tipF=Math.atan(af/C.hcg)/DEG;
  let rampInfo="";
  if(C.scen==="rampa"){
    const th=rampTh(C)*DEG, Ls=rampLh(C)/Math.cos(th);
    const F=ph.W*(Math.sin(th)+ph.crr*Math.cos(th)), tm=F*r/100/(C.nm*C.eta/100), tmkg=tm/KGCM;
    const om=C.rpm*(1-tmkg/C.ts); const v=om>0? om*2*Math.PI/60*r : 0;
    rampInfo = C.dir==="up" ? `<div><span>Torque per motor on ramp</span><strong>${fmt(tmkg,2)} kgf·cm</strong></div><div><span>Uphill speed</span><strong>${v>0?fmt(v,1)+" cm/s":"stalled"}</strong></div><div><span>Time on ramp (${fmt(Ls,0)} cm)</span><strong>${v>0?fmt(Ls/v,1)+" s":"—"}</strong></div>` : "";
  }
  $("kv").innerHTML=`
  <div><span>Weight</span><strong>${fmt(ph.W,2)} N</strong></div>
  <div><span>μ in use (${C.muOn?"measured":MATS[C.mat].n.replace(/ \(.*\)/,"")+" on "+FLOORS[C.floor].n.toLowerCase()})</span><strong>${fmt(ph.mu,2)}</strong></div>
  <div><span>Wheel radius</span><strong>${fmt(r,2)} cm</strong></div>
  <div><span>Total available torque</span><strong>${fmt(ph.Tt,3)} N·m</strong></div>
  <div><span>Max ramp by grip (μ, ideal 4WD)</span><strong>${fmt(Math.atan(ph.mu)/DEG,1)}°</strong></div>
  <div><span>Backward tip-over</span><strong>${fmt(tipB,1)}°</strong></div>
  <div><span>Forward flip</span><strong>${fmt(tipF,1)}°</strong></div>
  <div><span>Max step, single driven wheel</span><strong>${fmt(smax1,2)} cm</strong></div>
  <div><span>Largest step the wheels climb (flat floor, ignoring chassis)</span><strong>${fmt(ms,2)} cm</strong></div>
  <div><span>Breakover angle (crest, ≈2·atan(2c/L))</span><strong>${fmt(2*Math.atan(2*C.c/C.L)/DEG,1)}°</strong></div>
  ${rampInfo}`;
}
function battery(){
  const k=C.tol?1.1:1, rows=[
    {n:`Ramp ${fmt(25*k,1)}°, 1 tile`, d:"uphill", o:{scen:"rampa",dir:"up",rmode:"ang",th:25*k,tiles:1,nb:0}},
    {n:`Ramp ${fmt(25*k,1)}°, 1 tile`, d:"downhill", o:{scen:"rampa",dir:"down",rmode:"ang",th:25*k,tiles:1,nb:0}},
    {n:`HZ ramp ${fmt(30*k,1)}°, 1 tile`, d:"uphill", o:{scen:"rampa",dir:"up",rmode:"ang",th:30*k,tiles:1,nb:0,dz:true}},
    {n:`HZ ramp ${fmt(30*k,1)}°, 1 tile`, d:"downhill", o:{scen:"rampa",dir:"down",rmode:"ang",th:30*k,tiles:1,nb:0,dz:true}},
    {n:`HZ ramp ${fmt(30*k,1)}° with 2 bumps of ${fmt(2*k,1)} cm`, d:"uphill", o:{scen:"rampa",dir:"up",rmode:"ang",th:30*k,tiles:1,nb:2,bh:2*k,dz:true}},
    {n:`HZ ramp ${fmt(30*k,1)}° with 2 bumps of ${fmt(2*k,1)} cm`, d:"downhill", o:{scen:"rampa",dir:"down",rmode:"ang",th:30*k,tiles:1,nb:2,bh:2*k,dz:true}},
    {n:`${fmt(1*k,1)} cm floor bump`, d:"crossing", o:{scen:"lombada",dir:"up",nb:1,bh:1*k}},
    {n:`${fmt(2*k,1)} cm floor bump (HZ)`, d:"crossing", o:{scen:"lombada",dir:"up",nb:1,bh:2*k,dz:true}},
    {n:`Stairs, ${fmt(2*k,1)} cm steps, ${fmt(25*k,1)}°`, d:"uphill", o:{scen:"escada",dir:"up",sh:2*k,sth:25*k,ns:4}},
    {n:`Stairs, ${fmt(2*k,1)} cm steps, ${fmt(25*k,1)}°`, d:"downhill", o:{scen:"escada",dir:"down",sh:2*k,sth:25*k,ns:4}},
    {n:`HZ stairs, ${fmt(2*k,1)} cm steps, ${fmt(30*k,1)}°`, d:"uphill", o:{scen:"escada",dir:"up",sh:2*k,sth:30*k,ns:4,dz:true}},
    {n:`HZ stairs, ${fmt(2*k,1)} cm steps, ${fmt(30*k,1)}°`, d:"downhill", o:{scen:"escada",dir:"down",sh:2*k,sth:30*k,ns:4,dz:true}}
  ];
  let html=`<thead><tr><th>Element</th><th>Direction</th><th class="num">Margin</th><th>Result</th><th>Critical check</th></tr></thead><tbody>`;
  rows.forEach(rw=>{
    const ev=evaluate({...C, bumps:undefined, bshape:"rect", land:28, ...rw.o}, true);
    const w=ev.worst; const cls=ev.st==="ok"?"c-ok":(ev.st==="warn"?"c-warn":"c-bad");
    const crit = w ? (w.label+(w.reason?" — "+REASON[w.reason]:"")) : "—";
    const mm = ev.st==="bad" ? "fail" : fmt(ev.minMargin,2)+"×";
    html+=`<tr><td>${rw.n}</td><td>${rw.d}</td><td class="num"><span class="cell ${cls}">${mm}</span></td><td><span class="pill ${cls}">${ev.st==="ok"?"passes":(ev.st==="warn"?"marginal":"fails")}</span></td><td style="color:var(--muted);font-size:12.5px">${crit}</td></tr>`;
  });
  $("battery").innerHTML=html+"</tbody>";
}
const DIAMS=[40,50,60,65,70,80,90,100];
function matrix(){
  let html=`<thead><tr><th>Material (${FLOORS[C.floor].n})</th><th class="num">μ</th>${DIAMS.map(d=>`<th class="num">${d} mm</th>`).join("")}</tr></thead><tbody>`;
  Object.entries(MATS).forEach(([k,v])=>{
    const mu=v.mu[C.floor];
    html+=`<tr><td>${v.n}</td><td class="num">${fmt(mu,2)}</td>`;
    DIAMS.forEach(d=>{
      const ev=evaluate({...C,mat:k,muOn:false,D:d},true);
      const cls=ev.st==="ok"?"c-ok":(ev.st==="warn"?"c-warn":"c-bad");
      const cur = (!C.muOn && C.mat===k && C.D===d) ? " cur":"";
      html+=`<td class="num"><span class="cell ${cls}${cur}" title="${ev.worst?ev.worst.label:''}">${ev.st==="bad"?(ev.worst&&ev.worst.reason?short(ev.worst.reason):"✗"):fmt(ev.minMargin,2)+"×"}</span></td>`;
    });
    html+="</tr>";
  });
  $("matrix").innerHTML=html+"</tbody>";
}
function short(r){ return {slip:"slips",torque:"torque",tomb_tras:"tips",tomb_frente:"flips",face:"step",raspa:"scrapes"}[r]||"✗"; }

/* ---------- map ---------- */
const HM={D0:30,D1:100,nD:29,m0:0.2,m1:1.4,nM:25,data:null};
function heatCompute(){
  const out=[];
  for(let i=0;i<HM.nD;i++){ const D=Math.round(HM.D0+(HM.D1-HM.D0)*i/(HM.nD-1)); const col=[];
    for(let j=0;j<HM.nM;j++){ const mu=HM.m0+(HM.m1-HM.m0)*j/(HM.nM-1); const ev=evaluate({...C,D,muOn:true,muv:mu},true);
      const rs = ev.st==="bad" ? (ev.items.find(o=>o.st==="bad").reason) : null; col.push({st:ev.st,m:ev.minMargin,rs}); }
    out.push({D,col}); }
  HM.data=out;
}
function cssv(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function heatDraw(){
  const cv=$("heat"), dpr=window.devicePixelRatio||1, Wc=cv.clientWidth||760, Hc=Math.round(Wc*0.5);
  cv.width=Wc*dpr; cv.height=Hc*dpr; cv.style.height=Hc+"px";
  const x=cv.getContext("2d"); x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,Wc,Hc);
  const padL=46, padB=34, padT=8, padR=10, pw=Wc-padL-padR, phh=Hc-padT-padB;
  const cw=pw/HM.nD, chh=phh/HM.nM;
  const col={ok:cssv("--ok"),warn:cssv("--warn"),slip:cssv("--bad"),torque:"#d9762b",tomb:"#8a4fc4",geo:cssv("--muted")};
  HM.data.forEach((c,i)=>c.col.forEach((v,j)=>{
    let fill; if(v.st==="ok") fill=col.ok; else if(v.st==="warn") fill=col.warn; else fill = v.rs==="slip"?col.slip:(v.rs==="torque"?col.torque:(v.rs&&v.rs.startsWith("tomb")?col.tomb:col.geo));
    x.globalAlpha = v.st==="ok" ? Math.min(1,0.45+0.25*Math.log2(Math.max(1,v.m))) : 0.8;
    x.fillStyle=fill; x.fillRect(padL+i*cw, padT+(HM.nM-1-j)*chh, cw+0.5, chh+0.5);
  }));
  x.globalAlpha=1;
  x.strokeStyle=cssv("--line"); x.strokeRect(padL,padT,pw,phh);
  x.fillStyle=cssv("--muted"); x.font="11px IBM Plex Mono, monospace"; x.textAlign="center";
  for(let D=30; D<=100; D+=10){ const px=padL+(D-HM.D0)/(HM.D1-HM.D0)*(pw-cw)+cw/2; x.fillText(D,px,padT+phh+14); }
  x.fillText("wheel diameter (mm)", padL+pw/2, padT+phh+29);
  x.textAlign="right";
  for(let m=0.2; m<=1.41; m+=0.2){ const py=padT+(HM.nM-1-(m-HM.m0)/(HM.m1-HM.m0)*(HM.nM-1))*chh+chh/2+4; x.fillText(fmt(m,1),padL-6,py); }
  x.save(); x.translate(12,padT+phh/2); x.rotate(-Math.PI/2); x.textAlign="center"; x.fillText("wheel–floor μ",0,0); x.restore();
  const mu=muOf(C), cx=padL+(C.D-HM.D0)/(HM.D1-HM.D0)*(pw-cw)+cw/2, cy=padT+(HM.nM-1-(mu-HM.m0)/(HM.m1-HM.m0)*(HM.nM-1))*chh+chh/2;
  x.strokeStyle=cssv("--ink"); x.lineWidth=2; x.beginPath(); x.arc(cx,cy,6,0,2*Math.PI); x.stroke();
  x.lineWidth=1; x.setLineDash([3,3]); x.beginPath(); x.moveTo(cx,padT); x.lineTo(cx,padT+phh); x.moveTo(padL,cy); x.lineTo(padL+pw,cy); x.stroke(); x.setLineDash([]);
  HM.geom={padL,padT,pw,phh,cw,chh};
  $("heat-legend").innerHTML=[["Passes (stronger = more margin)",col.ok],["Marginal (1.0–1.2×)",col.warn],["Slips",col.slip],["Not enough torque",col.torque],["Tips / flips",col.tomb],["Geometry: scrapes or step ≥ radius",col.geo]].map(([t,c])=>`<span><i style="background:${c}"></i>${t}</span>`).join("");
}
$("heat").addEventListener("click",e=>{
  const g=HM.geom; if(!g) return; const rc=e.target.getBoundingClientRect(); const px=e.clientX-rc.left, py=e.clientY-rc.top;
  const i=Math.floor((px-g.padL)/g.cw), j=HM.nM-1-Math.floor((py-g.padT)/g.chh);
  if(i<0||i>=HM.nD||j<0||j>=HM.nM) return;
  C.D=HM.data[i].D; C.muOn=true; C.muv=+(HM.m0+(HM.m1-HM.m0)*j/(HM.nM-1)).toFixed(2); refresh();
});

/* ---------- equations ---------- */
const EQ=[
  ["Ramp: axle normal forces (CoM at a<sub>r</sub> from the rear axle, height h)", "N_f=\\dfrac{W\\,(a_r\\cos\\theta-h\\sin\\theta)}{L},\\qquad N_r=W\\cos\\theta-N_f"],
  ["Ramp: required force and capacity per driven axle", "W(\\sin\\theta+C_{rr}\\cos\\theta)\\;\\le\\;\\sum_{i}\\min\\!\\left(\\mu N_i,\\;\\dfrac{T_i}{r}\\right)"],
  ["Static tip-over (N<sub>f</sub> = 0)", "\\tan\\theta_{\\text{tip}}=\\dfrac{a_r}{h},\\qquad \\tan\\theta_{\\text{flip}}=\\dfrac{L-a_r}{h}"],
  ["Contact angle at the edge", "\\cos\\varphi=\\dfrac{r-s}{r}\\;\\text{(strip)},\\qquad \\cos\\varphi=\\dfrac{r}{r+s}\\;\\text{(half-round)}"],
  ["Single driven wheel against a step", "s_{\\max}=r\\left(1-\\dfrac{1}{\\sqrt{1+\\mu^{2}}}\\right)"],
  ["Equilibrium at the critical instant (front wheel on the edge)", "\\sum F_x=0,\\;\\sum F_y=0,\\;\\sum M_{P_r}=0;\\quad |F_i|\\le\\mu N_i,\\;|F_i|\\,r\\le T_i,\\;N_i\\ge0"],
  ["Stairs: tread depth from the incline", "t=\\dfrac{s}{\\tan\\theta_e}"],
  ["DC motor: torque–speed line and available torque", "\\omega=\\omega_0\\!\\left(1-\\dfrac{\\tau}{\\tau_s}\\right),\\;v=\\omega r,\\qquad T=n_m\\,\\tau_s\\,\\eta\\,k_{op}"]
];
function renderEqs(){
  $("eqs").innerHTML=EQ.map(([p,t],i)=>`<div class="eq"><p>${p}</p><div class="m" id="eq${i}"></div></div>`).join("");
  EQ.forEach(([p,t],i)=>{ const el=$("eq"+i); try{ el.innerHTML=window.katex.renderToString(t,{output:"mathml",throwOnError:false,displayMode:true}); }catch(e){ el.textContent=t; el.style.fontFamily="var(--f-mono)"; el.style.fontSize="12px"; } });
}

/* ---------- update ---------- */
let tHeavy=null;
function refresh(){
  Object.keys(SL).forEach(setOut);
  $("seg-scen").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===C.scen));
  $("seg-dir").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===C.dir));
  ["dz","tol","muOn"].forEach(k=>$(k).checked=C[k]);
  ["rmode","mat","floor","drive","mot"].forEach(k=>$(k).value=C[k]);
  $("g-rampa").hidden=C.scen!=="rampa"; $("g-escada").hidden=C.scen!=="escada"; $("g-bump").hidden=C.scen==="escada";
  $("bump-hint").textContent = C.scen==="rampa" ? "Bumps are spread evenly along the ramp, in this order from the bottom. Each one can have its own height and profile." : "Bumps sit 15 cm apart on the floor, in this order. Each one can have its own height and profile.";
  $("lg-bump").textContent=C.scen==="rampa"?"Speed bumps along the ramp":"Floor speed bumps";
  $("w-th").hidden=$("w-tiles").hidden=C.rmode!=="ang"; $("w-Hh").hidden=$("w-Lh").hidden=C.rmode!=="hl";
  $("w-muv").hidden=!C.muOn;
  const th=rampTh(C), Lh=rampLh(C);
  $("ramp-derived").textContent = C.rmode==="ang" ? `Height ${fmt(Lh*Math.tan(th*DEG),1)} cm · ramp surface ${fmt(Lh/Math.cos(th*DEG),1)} cm long` : `Resulting incline ${fmt(th,1)}° · ramp surface ${fmt(Math.hypot(C.Hh,C.Lh),1)} cm`;
  const t=C.sh/Math.tan(C.sth*DEG);
  $("stair-derived").textContent=`Tread ${fmt(t,2)} cm · total height ${fmt(C.sh*C.ns,1)} cm · a ${C.D} mm wheel rests on ${t<C.D/10?"more than one step (rolls over the nosings)":"one step at a time"}`;
  const names={rampa:"Ramp",escada:"Stairs",lombada:"Floor speed bumps"};
  $("scene-title").textContent=`${names[C.scen]} · ${C.dir==="up"?"uphill":"downhill"}${C.dz?" · Hazard Zone":""}`;
  const ev=evaluate(C,false);
  buildScene(ev); drawPose(0,0);
  renderChecks(ev); renderKV(ev);
  const w=ev.worst;
  $("scene-note").textContent = ev.st==="ok" ? "The robot completes the course with margin on every check." : (w? `Critical check: ${w.label}${w.reason?" — "+REASON[w.reason]:" (margin "+fmt(w.margin,2)+"×)"}.`:"");
  clearTimeout(tHeavy);
  tHeavy=setTimeout(()=>{ battery(); matrix(); heatCompute(); heatDraw(); },120);
}
linkStatic(); renderEqs(); renderBumps(); refresh();
window.addEventListener("resize",()=>{ if(HM.data) heatDraw(); });
try{ const mq=matchMedia("(prefers-color-scheme: dark)"); mq.addEventListener("change",()=>HM.data&&heatDraw()); }catch(e){}
new MutationObserver(()=>HM.data&&heatDraw()).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
requestAnimationFrame(frame);
