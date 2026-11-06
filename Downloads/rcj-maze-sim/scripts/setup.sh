#!/usr/bin/env bash
# Creates the GitHub repository and pushes the project (Linux, macOS or Git Bash on Windows).
# Usage: ./scripts/setup.sh [repo-name]
# Requires: git, Node 18+ and GitHub CLI (gh) signed in with "gh auth login".
set -euo pipefail
REPO="${1:-rcj-maze-sim}"
cd "$(dirname "$0")/.."

for cmd in git node gh; do
  command -v "$cmd" >/dev/null || { echo "Missing: $cmd"; exit 1; }
done
gh auth status >/dev/null 2>&1 || { echo "Run 'gh auth login' first."; exit 1; }

echo "1/4 Testing the physics model..."
npm test

echo "2/4 Creating the local repository..."
[ -d .git ] || git init -b main
git add .
git commit -m "RCJ Maze terrain simulator 2027" || echo "(nothing new to commit)"

echo "3/4 Creating $REPO on GitHub and pushing..."
if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin main
else
  gh repo create "$REPO" --public --source=. --remote=origin --push
fi

echo "4/4 Enabling GitHub Pages (via Actions)..."
OWNER="$(gh api user --jq .login)"
gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
  || gh api -X PUT "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 || true

echo
echo "Done. Repository: https://github.com/$OWNER/$REPO"
echo "Site (after ~1 min): https://$OWNER.github.io/$REPO/"
