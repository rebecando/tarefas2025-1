"use strict";
const DEG = Math.PI/180, G0 = 9.81, KGCM = 0.0980665;
const MATS = {
  silicone:{n:"Soft silicone (Shore 20–30A)", mu:{mdf:1.10, lino:1.00, carp:0.90}},
  borracha:{n:"Rubber (O-ring / nitrile)", mu:{mdf:0.85, lino:0.80, carp:0.85}},
  pu:{n:"Polyurethane / foam", mu:{mdf:0.75, lino:0.70, carp:0.80}},
  lego:{n:"LEGO tire", mu:{mdf:0.70, lino:0.65, carp:0.75}},
  tpu:{n:"Printed TPU 95A", mu:{mdf:0.62, lino:0.58, carp:0.72}},
  omni:{n:"Omni wheel (rollers)", mu:{mdf:0.45, lino:0.40, carp:0.50}},
  pla:{n:"Bare PLA/ABS", mu:{mdf:0.35, lino:0.30, carp:0.55}}
};
const FLOORS = {mdf:{n:"Painted MDF / plywood", crr:0.02}, lino:{n:"Linoleum", crr:0.025}, carp:{n:"Carpet", crr:0.06}};
const MOTORS = {
  p25:{n:"Pololu 25D HP 34:1 · 12 V", ts:6.0, rpm:290},
  jga:{n:"JGA25-370 · 12 V · 200 rpm", ts:4.5, rpm:200},
  p37:{n:"Pololu 37D 30:1 · 12 V", ts:14, rpm:330},
  n20:{n:"N20 · 6 V · 300 rpm", ts:0.9, rpm:300},
  ev3:{n:"LEGO EV3 Large", ts:4.0, rpm:170},
  xl430:{n:"Dynamixel XL430-W250", ts:14.3, rpm:57},
  custom:{n:"Custom", ts:null, rpm:null}
};

function muOf(c){ return c.muOn ? c.muv : MATS[c.mat].mu[c.floor]; }
function rampTh(c){ return c.rmode==="ang" ? c.th : Math.atan(c.Hh/c.Lh)/DEG; }
function rampLh(c){ return c.rmode==="ang" ? 28*c.tiles : c.Lh; }

/* list of speed bumps: c.bumps = [{h, shape}], or the older nb/bh/bshape form (n identical bumps) */
function bumpList(c){ return Array.isArray(c.bumps) ? c.bumps : Array.from({length:c.nb||0},()=>({h:c.bh,shape:c.bshape})); }
function rot(x,y,t){ const C=Math.cos(t), S=Math.sin(t); return [x*C-y*S, x*S+y*C]; }
function bumpPts(s, shape){
  if(shape==="round"){ const pts=[]; const K=12; for(let i=0;i<=K;i++){ const a=Math.PI*(1-i/K); pts.push([s+s*Math.cos(a), s*Math.sin(a)]); } return pts; }
  return [[0,0],[0,s],[2,s],[2,0]];
}

function buildProfile(c, withObst){
  const P=[], ob=[]; const PRE=40, POST=45;
  const add=(x,y)=>{ const l=P[P.length-1]; if(l && Math.abs(l.x-x)<1e-9 && Math.abs(l.y-y)<1e-9) return P.length-1; P.push({x,y}); return P.length-1; };
  add(-PRE,0); let slope=null, marks=[];
  if(c.scen==="rampa"){
    const th=rampTh(c)*DEG, Lh=rampLh(c), H=Lh*Math.tan(th), Ls=Lh/Math.cos(th);
    add(0,0);
    const bl=bumpList(c);
    if(withObst && bl.length>0){
      for(let i=0;i<bl.length;i++){
        const sh=bumpPts(bl[i].h,bl[i].shape), w=sh[sh.length-1][0];
        const u0=Ls*(i+1)/(bl.length+1)-w/2; let iS=-1, iE=-1;
        sh.forEach((p,j)=>{ const q=rot(u0+p[0],p[1],th); const k=add(q[0],q[1]); if(j===0) iS=k; iE=k; });
        ob.push({iS,iE,label:"bump "+(i+1)});
      }
    }
    add(Lh,H); add(Lh+POST,H); slope={x0:0,x1:Lh}; marks=[{x:0,t:"start"},{x:Lh,t:"top"}];
  } else if(c.scen==="lombada"){
    add(0,0);
    const bl=bumpList(c); let end=0;
    for(let i=0;i<bl.length;i++){
      const sh=bumpPts(bl[i].h,bl[i].shape), w=sh[sh.length-1][0];
      const x0=i*15; let iS=-1,iE=-1;
      sh.forEach((p,j)=>{ const k=add(x0+p[0],p[1]); if(j===0) iS=k; iE=k; });
      ob.push({iS,iE,label:"bump "+(i+1)}); end=x0+w;
    }
    add(end+POST,0);
  } else {
    const s=c.sh, t=s/Math.tan(c.sth*DEG), N=c.ns;
    add(0,0);
    for(let i=0;i<N;i++){
      const iS=P.length-1; const iE=add(i*t,(i+1)*s); ob.push({iS,iE,label:"step "+(i+1)});
      if(i<N-1) add((i+1)*t,(i+1)*s);
    }
    const xt=(N-1)*t; add(xt+Math.max(c.land,10)+POST,N*s);
    slope = N>1 ? {x0:0,x1:xt} : null; marks=[{x:xt,t:"top"},{x:xt+c.land,t:"end of top"}];
  }
  return {P,ob,slope,marks};
}
function mirror(pr){
  const xs=pr.P.map(p=>p.x), S=Math.min(...xs)+Math.max(...xs), n=pr.P.length;
  return {
    P:pr.P.map(p=>({x:S-p.x,y:p.y})).reverse(),
    ob:pr.ob.map(o=>({iS:n-1-o.iE,iE:n-1-o.iS,label:o.label})).reverse(),
    slope: pr.slope ? {x0:S-pr.slope.x1, x1:S-pr.slope.x0} : null,
    marks: pr.marks.map(m=>({x:S-m.x,t:m.t}))
  };
}
/* height of the center of a wheel of radius r centered at x, resting on the polygon (points p0..p1, segments s0..s1) */
function hcD(P,x,r,p0,p1,s0,s1){
  let by=-1e9, px=0, py=0;
  for(let i=p0;i<=p1;i++){ const p=P[i], dx=x-p.x; if(Math.abs(dx)<=r){ const y=p.y+Math.sqrt(r*r-dx*dx); if(y>by){by=y;px=p.x;py=p.y;} } }
  for(let i=s0;i<=s1;i++){
    const a=P[i], b=P[i+1], ddx=b.x-a.x, ddy=b.y-a.y; if(ddx<=1e-9) continue;
    const len=Math.hypot(ddx,ddy), ux=ddx/len, uy=ddy/len, nx=-uy, ny=ux;
    const t=(x-a.x-r*nx)/ux;
    if(t>=0 && t<=len){ const y=a.y+r*ny+t*uy; if(y>by){by=y;px=a.x+t*ux;py=a.y+t*uy;} }
  }
  return {y:by, px, py, nx:(x-px)/r, ny:(by-py)/r};
}
function terrainY(P,x){
  let best=-1e9;
  for(let i=0;i<P.length-1;i++){ const a=P[i], b=P[i+1]; if(b.x-a.x<=1e-9) continue; if(x>=a.x && x<=b.x){ const y=a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x); if(y>best) best=y; } }
  return best;
}
function poseFromRear(P,xr,r,L,R){
  const yr=hcD(P,xr,r,...R).y; let xf=xr+L, yf=yr;
  for(let k=0;k<10;k++){ yf=hcD(P,xf,r,...R).y; const dy=yf-yr; xf=xr+Math.sqrt(Math.max(L*L-dy*dy,1e-6)); }
  yf=hcD(P,xf,r,...R).y; return {xr,yr,xf,yf};
}
function rearFromFront(P,xf,yf,r,L,R){
  let xr=xf-L, yr=0;
  for(let k=0;k<12;k++){ yr=hcD(P,xr,r,...R).y; const dy=yf-yr; xr=xf-Math.sqrt(Math.max(L*L-dy*dy,1e-6)); }
  return xr;
}
function chassisGap(P,ps,r,c){
  const L=Math.hypot(ps.xf-ps.xr, ps.yf-ps.yr), ux=(ps.xf-ps.xr)/L, uy=(ps.yf-ps.yr)/L, vx=-uy, vy=ux;
  let g=1e9, where="";
  for(let s=-c.o; s<=L+c.o+1e-9; s+=0.5){
    const bx=ps.xr+s*ux-(r-c.c)*vx, by=ps.yr+s*uy-(r-c.c)*vy;
    const ty=terrainY(P,bx); const d=by-ty;
    if(d<g){ g=d; where = s<0 ? "rear overhang" : (s>L ? "front overhang" : "chassis belly"); }
  }
  return {g,where};
}

const GEO=new Map();
function geomKey(c){ return [c.scen,c.dir,rampTh(c).toFixed(4),rampLh(c),JSON.stringify(bumpList(c)),c.sth,c.sh,c.ns,c.land,c.D,c.L,c.c,c.o].join("|"); }
function geomFor(c){
  const key=geomKey(c); if(GEO.has(key)) return GEO.get(key);
  const r=c.D/20, L=c.L;
  let full=buildProfile(c,true), base=buildProfile(c,false);
  if(c.dir==="down"){ full=mirror(full); base=mirror(base); }
  const P=full.P, n=P.length, ALL=[0,n-1,0,n-2];
  const climbs=[];
  for(const o of full.ob){
    if(!(P[o.iS+1].y > P[o.iS].y+1e-6)) continue;
    const LOW=[0,o.iS,0,o.iS-1], OBS=[o.iS+1,o.iE,o.iS,o.iE-1];
    const f=x=>hcD(P,x,r,...OBS).y - hcD(P,x,r,...LOW).y;
    let xa=P[o.iS].x-r-1, xb=null;
    for(let x=xa; x<=P[o.iS].x+2*r; x+=0.02){ if(f(x)>1e-7){ xb=x; break; } xa=x; }
    if(xb===null) continue;
    for(let k=0;k<32;k++){ const m=(xa+xb)/2; if(f(m)>1e-7) xb=m; else xa=m; }
    const xf=xa, lo=hcD(P,xf,r,...LOW), ok=hcD(P,xb,r,...OBS);
    const Cf={x:xf,y:lo.y};
    let n1x=Cf.x-ok.px, n1y=Cf.y-ok.py; const nl=Math.hypot(n1x,n1y); n1x/=nl; n1y/=nl;
    const xr=rearFromFront(P,Cf.x,Cf.y,r,L,LOW), rc=hcD(P,xr,r,...LOW);
    const b0=P[o.iS-1], b1=P[o.iS], bl=Math.hypot(b1.x-b0.x,b1.y-b0.y), nbx=-(b1.y-b0.y)/bl, nby=(b1.x-b0.x)/bl;
    let hob=0; for(let i=o.iS+1;i<=o.iE;i++) hob=Math.max(hob,(P[i].x-b1.x)*nbx+(P[i].y-b1.y)*nby);
    climbs.push({label:o.label, Cr:{x:xr,y:rc.y}, Cf, Pr:{x:rc.px,y:rc.py}, n2:{x:rc.nx,y:rc.ny}, P1:{x:ok.px,y:ok.py}, n1:{x:n1x,y:n1y}, face:hob>=r*0.995, xf, xObs:P[o.iS].x});
  }
  let plain=null;
  if(base.slope){
    const Pb=base.P, RB=[0,Pb.length-1,0,Pb.length-2];
    const mid=(base.slope.x0+base.slope.x1)/2;
    const ps=poseFromRear(Pb,mid-L/2,r,L,RB);
    const rc=hcD(Pb,ps.xr,r,...RB), fc=hcD(Pb,ps.xf,r,...RB);
    plain={label:"plain", Cr:{x:ps.xr,y:ps.yr}, Cf:{x:ps.xf,y:ps.yf}, Pr:{x:rc.px,y:rc.py}, n2:{x:rc.nx,y:rc.ny}, P1:{x:fc.px,y:fc.py}, n1:{x:fc.nx,y:fc.ny}, x0:base.slope.x0, x1:base.slope.x1};
  }
  const x0=P[0].x+r+c.o+1, x1=P[n-1].x-L-c.o-r-1, NS=240, poses=[];
  let minGap=1e9, gapWhere="", scrapeIdx=-1;
  for(let i=0;i<=NS;i++){
    const ps=poseFromRear(P,x0+(x1-x0)*i/NS,r,L,ALL);
    const cg=chassisGap(P,ps,r,c); ps.gap=cg.g;
    if(cg.g<minGap){ minGap=cg.g; gapWhere=cg.where; }
    if(cg.g< -0.02 && scrapeIdx<0) scrapeIdx=i;
    poses.push(ps);
  }
  const res={P, full, base, climbs, plain, poses, minGap, gapWhere, scrapeIdx, r};
  if(GEO.size>400) GEO.clear();
  GEO.set(key,res); return res;
}

function phys(c){
  const Tt=c.nm*c.ts*KGCM*(c.eta/100)*(c.kop/100);
  const Tf = c.drive==="4wd"?Tt/2 : (c.drive==="fwd"?Tt:0);
  const Tr = c.drive==="4wd"?Tt/2 : (c.drive==="rwd"?Tt:0);
  return {W:c.m*G0, Tt, Tf, Tr, crr:FLOORS[c.floor].crr, mu:muOf(c)};
}
/* quasi-static equilibrium with front contact (P1,n1) and rear contact (Pr,n2) */
function analyze(it, c, ph, useCrr){
  const r=c.D/20, d=Math.hypot(it.Cf.x-it.Cr.x, it.Cf.y-it.Cr.y), ux=(it.Cf.x-it.Cr.x)/d, uy=(it.Cf.y-it.Cr.y)/d, vx=-uy, vy=ux;
  const ar=c.cgf/100*c.L, Gx=it.Cr.x+ar*ux+(c.hcg-r)*vx, Gy=it.Cr.y+ar*uy+(c.hcg-r)*vy;
  const r1x=it.P1.x-it.Pr.x, r1y=it.P1.y-it.Pr.y, rGx=Gx-it.Pr.x;
  const n1x=it.n1.x, n1y=it.n1.y, t1x=n1y, t1y=-n1x, n2x=it.n2.x, n2y=it.n2.y, t2x=n2y, t2y=-n2x;
  const W=ph.W, R=useCrr?ph.crr*W*n2y:0, det=n2x*t2y-t2x*n2y;
  const fDr=c.drive!=="rwd", rDr=c.drive!=="fwd", rm=r/100;
  function at(q){
    const ax=n1x+q*t1x, ay=n1y+q*t1y, den=r1x*ay-r1y*ax; if(den<=1e-9) return null;
    const N1=W*rGx/den, h1=-N1*ax, h2=W-N1*ay;
    const N2=(h1*t2y-t2x*h2)/det, F2=(n2x*h2-n2y*h1)/det+R;
    return {N1,N2,F1:q*N1,F2,q};
  }
  function ok(s,mu,Ts){
    if(!s) return false; const tol=1e-6*W;
    if(s.N1<-tol || s.N2<-tol) return false;
    if(rDr){ if(Math.abs(s.F2)>mu*Math.max(s.N2,0)+tol) return false; if(Math.abs(s.F2)*rm>ph.Tr*Ts+1e-12) return false; }
    else if(Math.abs(s.F2)>1e-3*W) return false;
    if(fDr && Math.abs(s.F1)*rm>ph.Tf*Ts+1e-12) return false;
    return true;
  }
  function feas(mu,Ts){
    if(!fDr) return ok(at(0),mu,Ts);
    if(!rDr){
      const K=60; let pq=-mu, ps=at(pq);
      for(let i=1;i<=K;i++){ const q=-mu+2*mu*i/K, s=at(q); if(ps&&s&&((ps.F2<=0&&s.F2>=0)||(ps.F2>=0&&s.F2<=0))){ let a=pq,b=q; for(let k=0;k<26;k++){ const m=(a+b)/2, sm=at(m), sa=at(a); if(!sm||!sa) break; if((sa.F2<=0)===(sm.F2<=0)) a=m; else b=m; } if(ok(at((a+b)/2),mu,Ts)) return true; } pq=q; ps=s; }
      return false;
    }
    const K=60; for(let i=0;i<=K;i++){ if(ok(at(-mu+2*mu*i/K),mu,Ts)) return true; } return false;
  }
  const s0=at(0);
  let reason=null, muReq=Infinity, TsReq=Infinity;
  if(!feas(3,1e9)){
    reason = (s0 && (s0.N1<0||s0.N2<0)) ? (s0.N1<0?"tomb_tras":"tomb_frente") : "slip";
  } else {
    let a=0,b=3; for(let k=0;k<22;k++){ const m=(a+b)/2; if(feas(m,1e9)) b=m; else a=m; } muReq=b;
    if(muReq>ph.mu) reason="slip";
    else {
      let lo=0, hi=1;
      if(!feas(ph.mu,1)){ lo=1; hi=400; if(!feas(ph.mu,hi)){ hi=Infinity; } }
      if(isFinite(hi)){ for(let k=0;k<22;k++){ const m=(lo+hi)/2; if(feas(ph.mu,m)) hi=m; else lo=m; } TsReq=hi; }
      if(TsReq>1) reason="torque";
    }
  }
  const mMu = isFinite(muReq)? ph.mu/muReq : 0, mT = isFinite(TsReq)&&TsReq>0 ? 1/TsReq : (TsReq===0?99:0);
  const margin = reason==="tomb_tras"||reason==="tomb_frente" ? 0 : Math.min(mMu, reason==="slip"?mMu:mT);
  return {reason, muReq, TsReq, margin, mMu, mT, s0, G:{x:Gx,y:Gy}, Treq: isFinite(TsReq)? TsReq*(ph.Tf+ph.Tr):Infinity};
}
function stOf(a){ return a.reason ? "bad" : (a.margin<1.2 ? "warn" : "ok"); }
const REASON={slip:"wheels slip (not enough friction)", torque:"not enough torque", tomb_tras:"tips over backward", tomb_frente:"flips forward", face:"wheel hits the vertical face (step ≥ radius)", raspa:"chassis scrapes / high-centers"};

function evaluate(c, light){
  const g=geomFor(c), ph=phys(c), out=[];
  let worst=null;
  const push=(o)=>{ out.push(o); if(o.st==="bad" || o.st==="warn"){ if(!worst || (o.st==="bad" && worst.st!=="bad") || (o.st===worst.st && o.margin<worst.margin)) worst=o; } };
  if(g.plain){
    const a=analyze(g.plain,c,ph,true);
    push({k:"plain", label: c.scen==="escada" ? "Stairs: resting on nosings" : (c.dir==="up"?"Ramp: uphill":"Ramp: downhill and braking"), a, st:stOf(a), margin:a.margin, reason:a.reason, xStop:g.plain.x0+0.45*(g.plain.x1-g.plain.x0)});
  }
  if(g.climbs.length){
    let wc=null, wa=null;
    for(const cl of g.climbs){
      if(cl.face){ wc=cl; wa={reason:"face",margin:0,muReq:Infinity,TsReq:Infinity}; break; }
      const a=analyze(cl,c,ph,false);
      if(!wa || a.margin<wa.margin || (a.reason && !wa.reason)){ wa=a; wc=cl; }
      if(light && a.reason) break;
    }
    const kind = c.scen==="escada" ? "Steps" : "Speed bumps";
    push({k:"climb", label: kind+" ("+g.climbs.length+")", sub: wc.label, a:wa, st: wa.reason?"bad":(wa.margin<1.2?"warn":"ok"), margin:wa.margin, reason:wa.reason, xStop:wc.xf, climb:wc});
  }
  const gst = g.minGap< -0.02 ? "bad" : (g.minGap<0.1 ? "warn":"ok");
  push({k:"gap", label:"Chassis clearance along the path", st:gst, margin: gst==="bad"?0:(gst==="warn"?1.05:9), reason: gst==="bad"?"raspa":null, gap:g.minGap, where:g.gapWhere, scrapeIdx:g.scrapeIdx});
  let st="ok"; for(const o of out){ if(o.st==="bad") st="bad"; else if(o.st==="warn" && st!=="bad") st="warn"; }
  let minMargin=Infinity; for(const o of out) if(o.k!=="gap") minMargin=Math.min(minMargin,o.margin);
  if(!isFinite(minMargin)) minMargin = st==="bad"?0:9;
  if(out.find(o=>o.k==="gap"&&o.st==="bad")) minMargin=0;
  return {g, ph, items:out, st, worst, minMargin};
}

function rulesCheck(c){
  const R=[]; const dz=c.dz;
  const lim=(v,max,strict)=> (strict? v<max : v<=max+1e-9) ? "ok" : (v<=max*1.1+1e-9 ? "warn":"bad");
  if(c.scen==="rampa"){
    const th=rampTh(c); R.push({t:"Ramp incline ≤ "+(dz?"30":"25")+"° (4.4.4)", v:fmt(th,1)+"°", st:lim(th,dz?30:25)});
    const bl=bumpList(c);
    if(bl.length>0){
      const hm=Math.max(...bl.map(b=>b.h));
      R.push({t:"Bumps on ramps only in the Hazard Zone (4.4.1)", v:dz?"HZ":"outside HZ", st:dz?"ok":"bad"});
      R.push({t:"Tallest bump ≤ "+(dz?"2":"1")+" cm (4.4.1)", v:fmt(hm,1)+" cm", st:lim(hm,dz?2:1)});
    }
    const Lh=rampLh(c); if(c.rmode==="hl" && Math.abs(Lh/28-Math.round(Lh/28))>0.05) R.push({t:"Ramp spans whole 28 cm tiles (4.1.2)", v:fmt(Lh,0)+" cm", st:"warn"});
  } else if(c.scen==="lombada"){
    const bl=bumpList(c);
    if(bl.length>0){ const hm=Math.max(...bl.map(b=>b.h)); R.push({t:"Tallest bump ≤ "+(dz?"2":"1")+" cm (4.4.1)", v:fmt(hm,1)+" cm", st:lim(hm,dz?2:1)}); }
  } else {
    R.push({t:"Step ≤ 2 cm (4.4.5)", v:fmt(c.sh,1)+" cm", st:lim(c.sh,2)});
    R.push({t:"Stair incline ≤ "+(dz?"30":"25")+"° (4.4.5)", v:fmt(c.sth,1)+"°", st:lim(c.sth,dz?30:25)});
    R.push(c.land>=28 ? {t:"Stairs end on a horizontal tile (4.4.5)", v:fmt(c.land,0)+" cm", st:"ok"} : {t:"Peak-like top step 15 cm to < 28 cm (4.4.5)", v:fmt(c.land,0)+" cm", st:c.land>=15?"ok":(c.land>=13.5?"warn":"bad")});
  }
  return R;
}
function fmt(x,d){ if(!isFinite(x)) return "∞"; return x.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d}); }

function maxStep(c){
  let lo=0, hi=c.D/20*0.995;
  const base={...c, scen:"lombada", dir:"up", bumps:undefined, nb:1, bshape:"rect"};
  const pass=s=>{ const e=evaluate({...base,bh:s},true); const it=e.items.find(o=>o.k==="climb"); return it && !it.reason; };
  if(!pass(0.05)) return 0;
  for(let k=0;k<14;k++){ const m=(lo+hi)/2; if(pass(m)) lo=m; else hi=m; }
  return lo;
}

/* Export functions for the Node tests (in the browser they stay global) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { bumpList, DEG, G0, KGCM, MATS, FLOORS, MOTORS, muOf, rampTh, rampLh, buildProfile, mirror,
    hcD, terrainY, geomFor, phys, analyze, evaluate, rulesCheck, maxStep, fmt };
}

