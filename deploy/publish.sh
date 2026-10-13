#!/usr/bin/env bash
# Publish immutable frontend/API releases; keep old versions and roll back on failure.
set -euo pipefail
release_id=${1:?Usage: bash deploy/publish.sh YYYYMMDD-name}
[[ "$release_id" =~ ^[a-zA-Z0-9-]+$ ]] || exit 2
repo_dir=$(cd "$(dirname "$0")/.." && pwd)
cd "$repo_dir"
test -f dist/index.html
stage_dir=$(mktemp -d)
trap 'rm -rf "$stage_dir"' EXIT
mkdir -p "$stage_dir/site" "$stage_dir/api"
cp -R dist/. "$stage_dir/site/"
cp server/stats.mjs "$stage_dir/api/"
cp deploy/nginx-https.conf "$stage_dir/nginx.conf"
cp deploy/tidemyst-stats.service "$stage_dir/stats.service"
python3 - "$stage_dir" <<'PY'
import sys, pathlib, hashlib
root = pathlib.Path(sys.argv[1])
lines = [hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + str(p.relative_to(root)) for p in sorted(root.rglob('*')) if p.is_file()]
(root/'SHA256SUMS').write_text('\n'.join(lines)+'\n')
PY
tar -czf "$stage_dir/release.tar.gz" -C "$stage_dir" site api nginx.conf stats.service SHA256SUMS
scp -o BatchMode=yes -o StrictHostKeyChecking=yes "$stage_dir/release.tar.gz" "root@124.220.195.160:/tmp/tidemyst-$release_id.tar.gz"
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes root@124.220.195.160 bash -s -- "$release_id" <<'REMOTE'
set -euo pipefail
release_id=$1
app=/var/www/tidemyst-haven
api=/opt/tidemyst-stats
stage=/tmp/tidemyst-$release_id-stage
config=/etc/nginx/sites-available/dankecxmj.guaguahub.cn
old_front=$(readlink "$app/current")
old_api=""
if systemctl is-active --quiet tidemyst-stats; then old_api=$(readlink "$api/current"); fi
backup=$app/nginx-$release_id.backup
test ! -e "$app/releases/$release_id"
test ! -e "$api/releases/$release_id"
mkdir -p "$stage"
tar -xzf "/tmp/tidemyst-$release_id.tar.gz" -C "$stage"
(cd "$stage" && sha256sum -c SHA256SUMS)
cp "$config" "$backup"
rollback() {
  trap - ERR
  cp "$backup" "$config"
  ln -s "$old_front" "$app/current.rollback"
  mv -Tf "$app/current.rollback" "$app/current"
  if [ -n "$old_api" ]; then
    ln -s "$old_api" "$api/current.rollback"
    mv -Tf "$api/current.rollback" "$api/current"
    systemctl restart tidemyst-stats || true
  else
    systemctl disable --now tidemyst-stats || true
  fi
  nginx -t && systemctl reload nginx
  echo 'Deployment failed; previous frontend/config restored' >&2
}
trap rollback ERR
mkdir -p "$app/releases" "$api/releases"
mv "$stage/site" "$app/releases/$release_id"
mv "$stage/api" "$api/releases/$release_id"
chmod -R a+rX "$app/releases/$release_id" "$api/releases/$release_id"
ln -s "releases/$release_id" "$api/current.next"
mv -Tf "$api/current.next" "$api/current"
install -m 644 "$stage/stats.service" /etc/systemd/system/tidemyst-stats.service
systemctl daemon-reload
systemctl enable tidemyst-stats
systemctl restart tidemyst-stats
for attempt in 1 2 3 4 5; do
  if curl --fail --silent http://127.0.0.1:3009/api/stats; then break; fi
  sleep 1
done
curl --fail --silent http://127.0.0.1:3009/api/stats > /dev/null
install -m 644 "$stage/nginx.conf" "$config"
nginx -t
ln -s "releases/$release_id" "$app/current.next"
mv -Tf "$app/current.next" "$app/current"
systemctl reload nginx
public_ready=0
for attempt in 1 2 3 4 5; do
  if curl --fail --silent https://dankecxmj.guaguahub.cn/api/stats | /usr/bin/node -e 'let b=""; process.stdin.on("data",c=>b+=c); process.stdin.on("end",()=>{try {const v=JSON.parse(b); if(!Number.isSafeInteger(v.online)||!Number.isSafeInteger(v.totalCompleted))process.exit(1); console.log(b);} catch {process.exit(1);}})'; then
    public_ready=1
    break
  fi
  sleep 1
done
test "$public_ready" = 1
curl --fail --silent https://dankecxmj.guaguahub.cn/ > /dev/null
trap - ERR
cp "$stage/SHA256SUMS" "$app/releases/$release_id/DEPLOYMENT_SHA256SUMS"
rm -rf "$stage" "/tmp/tidemyst-$release_id.tar.gz"
printf '\nPublished %s; rollback frontend: %s; nginx backup: %s\n' "$release_id" "$old_front" "$backup"
REMOTE
