# Creates the GitHub repository and pushes the project (Windows PowerShell).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 [-Repo name]
# Requires: git, Node 18+ and GitHub CLI (gh) signed in with "gh auth login".
param([string]$Repo = "rcj-maze-sim")
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

foreach ($c in "git","node","gh") {
  if (-not (Get-Command $c -ErrorAction SilentlyContinue)) { Write-Error "Missing: $c" }
}
gh auth status *> $null
if ($LASTEXITCODE -ne 0) { Write-Error "Run 'gh auth login' first." }

Write-Host "1/4 Testing the physics model..."
npm test
if ($LASTEXITCODE -ne 0) { Write-Error "Tests failed." }

Write-Host "2/4 Creating the local repository..."
if (-not (Test-Path .git)) { git init -b main }
git add .
git commit -m "RCJ Maze terrain simulator 2027"

Write-Host "3/4 Creating $Repo on GitHub and pushing..."
git remote get-url origin *> $null
if ($LASTEXITCODE -eq 0) { git push -u origin main }
else { gh repo create $Repo --public --source=. --remote=origin --push }

Write-Host "4/4 Enabling GitHub Pages (via Actions)..."
$Owner = gh api user --jq .login
gh api -X POST "repos/$Owner/$Repo/pages" -f build_type=workflow *> $null
if ($LASTEXITCODE -ne 0) { gh api -X PUT "repos/$Owner/$Repo/pages" -f build_type=workflow *> $null }

Write-Host ""
Write-Host "Done. Repository: https://github.com/$Owner/$Repo"
Write-Host "Site (after ~1 min): https://$Owner.github.io/$Repo/"
