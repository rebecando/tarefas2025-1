# RCJ Maze Terrain Simulator

Quasi-static 2D simulator for ramps, stairs and speed bumps in **RoboCupJunior Rescue Maze 2027**. It checks per-axle traction, motor torque, tip-over and chassis scraping for different wheel materials and diameters.

## Run locally

There is no build step. Pick one:

- Open `index.html` directly in a browser (works offline except fonts and KaTeX).
- Local server with Node: `npm start` → http://localhost:5173
- Local server with Python: `python -m http.server 5173`

Physics model tests (Node 18+):

```bash
npm test
```

## Publish to GitHub

Requirements: [git](https://git-scm.com), [Node 18+](https://nodejs.org) and [GitHub CLI](https://cli.github.com) signed in (`gh auth login`).

```bash
# Linux / macOS / Git Bash
./scripts/setup.sh rcj-maze-sim

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 -Repo rcj-maze-sim
```

The script runs the tests, creates the repository, pushes the code and enables GitHub Pages. On every `git push` to `main`, the workflow in `.github/workflows/pages.yml` reruns the tests and redeploys the site to `https://<user>.github.io/rcj-maze-sim/`.

Without GitHub CLI: create an empty repository on github.com and run

```bash
git init -b main && git add . && git commit -m "RCJ Maze simulator"
git remote add origin https://github.com/<user>/rcj-maze-sim.git
git push -u origin main
```

Then, under **Settings → Pages**, set **Source: GitHub Actions**.

## Structure

```
index.html            page
css/style.css         styles (light and dark themes)
js/physics.js         physics model, geometry and rules (no DOM, testable)
js/ui.js              controls, SVG animation, tables and map
tests/                tests with node:test
scripts/              repository creation and push to GitHub
```

## Model

- Two-axle robot in the vertical plane, rigid wheels, accelerations neglected.
- At each obstacle, it analyzes the instant the front wheel touches the edge while still resting on the floor: ΣFx = ΣFy = ΣM = 0 with |Fᵢ| ≤ μNᵢ and |Fᵢ|·r ≤ Tᵢ.
- Chassis clearance and resting on stair nosings are checked along the whole path.
- Validation: with front-wheel drive, the maximum step matches r·(1 − 1/√(1+μ²)).

Friction coefficients and motor data are typical values. Measure the real μ with a tilt test (μ = tan of the slip angle) and use your motor's datasheet.

## Rules referenced

The draft rules PDF is included in `rules/` and every rule number in the simulator links to its page there (`#page=N`). When the final 2027 rules are released, replace the PDF and update `RULE_PAGE` in `js/ui.js`. The rules are published by the RoboCupJunior Rescue Committee under CC BY-NC-SA 4.0.

RoboCupJunior Rescue Maze Rules 2027 (draft of 2026-10-30): sections 4.1 (layout and ±10 % tolerance), 4.2 (Hazard Zone), 4.4.1 (speed bumps), 4.4.3 (debris), 4.4.4 (ramps), 4.4.5 (stairs), 6.7 and 6.8 (scoring).

Main changes from 2026 that affect this simulator: tiles are now 28 × 28 cm, ramps may reach 30° inside the Hazard Zone (formerly Dangerous Zone), and stairs end on a horizontal tile, with the 15 cm top only for peak-like stairs.
