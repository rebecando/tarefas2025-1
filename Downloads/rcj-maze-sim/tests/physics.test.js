// Physics model tests. Run with: npm test  (Node 18 or newer)
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../js/physics.js");

const BASE = {
  scen: "rampa", dir: "up", dz: false, tol: true, rmode: "ang", th: 25, tiles: 1, Hh: 14, Lh: 30,
  nb: 0, bh: 1, bshape: "rect", sth: 25, sh: 2, ns: 4, land: 28,
  m: 1.8, L: 13, hcg: 4.5, cgf: 50, c: 1.6, o: 3,
  mat: "silicone", floor: "mdf", D: 65, muOn: false, muv: 0.9,
  drive: "4wd", mot: "p25", nm: 4, ts: 6, rpm: 290, eta: 80, kop: 70
};
const cfg = (o = {}) => ({ ...BASE, ...o });
const item = (ev, k) => ev.items.find(i => i.k === k);

test("ramp: required μ ≈ tanθ + Crr (4WD)", () => {
  const a = item(P.evaluate(cfg()), "plain").a;
  const expected = Math.tan(25 * P.DEG) + 0.02;
  assert.ok(Math.abs(a.muReq - expected) < 0.02, `muReq=${a.muReq}`);
});

test("ramp: bare PLA wheels slip at 25°", () => {
  assert.equal(item(P.evaluate(cfg({ mat: "pla" })), "plain").reason, "slip");
});

test("ramp: rear-wheel drive needs more friction than 4WD", () => {
  const a4 = item(P.evaluate(cfg()), "plain").a.muReq;
  const ar = item(P.evaluate(cfg({ drive: "rwd" })), "plain").a.muReq;
  assert.ok(ar > a4);
});

test("ramp: high, rearward CoM tips over backward", () => {
  assert.equal(item(P.evaluate(cfg({ hcg: 12, cgf: 25 })), "plain").reason, "tomb_tras");
});

test("ramp: weak motor fails on torque", () => {
  assert.equal(item(P.evaluate(cfg({ ts: 0.9, nm: 2 })), "plain").reason, "torque");
});

test("step: front-wheel drive matches r(1 − 1/√(1+μ²))", () => {
  const c = cfg({ drive: "fwd" });
  const r = c.D / 20, mu = P.muOf(c);
  const theory = r * (1 - 1 / Math.sqrt(1 + mu * mu));
  const s = P.maxStep(c);
  assert.ok(Math.abs(s - theory) < 0.05, `sim=${s} theory=${theory}`);
});

test("step: 4WD climbs a taller step than rear-wheel drive", () => {
  assert.ok(P.maxStep(cfg()) > P.maxStep(cfg({ drive: "rwd" })));
});

test("step ≥ radius is a geometric failure", () => {
  const ev = P.evaluate(cfg({ scen: "lombada", nb: 1, bh: 3.4 }));
  assert.equal(item(ev, "climb").reason, "face");
});

test("2 cm bump with 1.6 cm clearance scrapes the chassis", () => {
  const ev = P.evaluate(cfg({ scen: "lombada", nb: 1, bh: 2 }));
  assert.equal(item(ev, "gap").reason, "raspa");
});

test("rules: bump on a ramp outside the Hazard Zone is illegal", () => {
  const r = P.rulesCheck(cfg({ nb: 2 }));
  assert.ok(r.some(x => x.st === "bad"));
});

test("rules: 28° stairs are allowed only in the Hazard Zone", () => {
  const outside = P.rulesCheck(cfg({ scen: "escada", sth: 28 }));
  const zp = P.rulesCheck(cfg({ scen: "escada", sth: 28, dz: true }));
  assert.ok(outside.some(x => x.st !== "ok"));
  assert.ok(zp.every(x => x.st === "ok"));
});

test("rules: 28° ramp is allowed only in the Hazard Zone (2027)", () => {
  const outside = P.rulesCheck(cfg({ th: 28 }));
  const hz = P.rulesCheck(cfg({ th: 28, dz: true }));
  assert.ok(outside.some(x => x.st !== "ok"));
  assert.ok(hz.every(x => x.st === "ok"));
});

test("ramp tiles are 28 cm (2027)", () => {
  assert.equal(P.rampLh(cfg({ tiles: 2 })), 56);
});

test("floor scenario with zero bumps is a flat floor that passes", () => {
  const ev = P.evaluate(cfg({ scen: "lombada", nb: 0 }));
  assert.equal(ev.items.find(i => i.k === "climb"), undefined);
  assert.equal(ev.st, "ok");
});

test("mixed bumps: the tallest one decides the climb and the rule check", () => {
  const bumps = [{ h: 0.5, shape: "round" }, { h: 1.8, shape: "rect" }, { h: 1.0, shape: "rect" }];
  const ev = P.evaluate(cfg({ scen: "lombada", bumps, c: 3 }));
  const cl = ev.items.find(i => i.k === "climb");
  assert.equal(cl.label, "Speed bumps (3)");
  assert.equal(cl.sub, "bump 2");
  const r = P.rulesCheck(cfg({ scen: "lombada", bumps }));
  assert.ok(r.some(x => x.st === "bad" && x.v.startsWith("1.8")));
});
