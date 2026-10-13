#!/bin/sh
set -eu
# Certbot invokes this only after a successful renewal. Keep other lineages untouched.
if [ "${RENEWED_LINEAGE:-}" = "/etc/letsencrypt/live/dankecxmj.guaguahub.cn" ]; then
    /usr/sbin/nginx -t
    /usr/bin/systemctl reload nginx
fi
