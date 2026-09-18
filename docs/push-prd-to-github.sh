#!/usr/bin/env bash
# Push updated MemorableDay PRD to github.com/sandeepdolai/NewMemorableday
# Usage: ./push-prd-to-github.sh <GITHUB_TOKEN>
set -euo pipefail

TOKEN="${1:?Usage: push-prd-to-github.sh <GITHUB_TOKEN>}"
REPO="sandeepdolai/NewMemorableday"
WORKDIR="/tmp/NewMemorableday-push"

echo "==> Cloning $REPO ..."
rm -rf "$WORKDIR"
git clone "https://sandeepdolai:${TOKEN}@github.com/${REPO}.git" "$WORKDIR"
cd "$WORKDIR"

# Unset the remote URL so the token never persists in .git/config
git remote set-url origin "https://github.com/${REPO}.git"

# Locate the PRD file in the repo (name may vary slightly)
PRD_FILE="$(find . -maxdepth 2 -name "MemorableDay_docs_prd_ALL_32_FILES*" -not -path "./.git/*" | head -1)"
if [ -z "$PRD_FILE" ]; then
  PRD_FILE="$(find . -maxdepth 2 -iname "*prd*" -not -path "./.git/*" | head -1)"
fi
echo "==> Repo PRD file: $PRD_FILE"

echo "==> Copying updated PRD ..."
cp "/home/z/my-project/docs/MemorableDay_PRD.md" "$PRD_FILE"

echo "==> Adding design reference images ..."
mkdir -p "design-reference"
cp /home/z/my-project/docs/design-reference/color-palette-exact-codes.jpg "design-reference/"
cp /home/z/my-project/docs/design-reference/ui-reference-main-page.png "design-reference/"

git add -A
git -c user.name="sandeepdolai" -c user.email="sandeepdolai@users.noreply.github.com" \
  commit -m "Update PRD: Dodo Payments (was Lemon Squeezy), memorableday.in domain (was .online), exact color palette (#007AFF/#1D1D1F/#AAAAAA/#F5F5F7), reference UI/UX spec" || echo "Nothing to commit"

echo "==> Pushing ..."
git push "https://sandeepdolai:${TOKEN}@github.com/${REPO}.git" HEAD:main
echo "==> DONE. PRD pushed to GitHub."
