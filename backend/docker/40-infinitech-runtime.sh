#!/bin/sh
set -eu

OUTPUT_DIR="${OUTPUT_DIR:-/usr/share/nginx/html}"

trim_trailing_slash() {
  value="$1"
  value="${value%/}"
  printf '%s' "$value"
}

resolve_origin() {
  provided="$(trim_trailing_slash "${1:-}")"
  if [ -n "$provided" ]; then
    printf '%s' "$provided"
    return
  fi

  fallback_domain="$(trim_trailing_slash "${2:-}")"
  if [ -n "$fallback_domain" ]; then
    printf 'https://%s' "$fallback_domain"
    return
  fi

  printf '%s' "$(trim_trailing_slash "${3:-}")"
}

escape_js() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

site_origin="$(resolve_origin "${SITE_WEB_BASE_URL:-}" "${PUBLIC_DOMAIN:-}" "http://127.0.0.1:1888")"
admin_origin="$(resolve_origin "${ADMIN_WEB_BASE_URL:-}" "${ADMIN_DOMAIN:-}" "http://127.0.0.1:8888")"
invite_origin="$(resolve_origin "${PUBLIC_LANDING_BASE_URL:-}" "" "http://127.0.0.1:1788")"
public_domain="$(trim_trailing_slash "${PUBLIC_DOMAIN:-}")"
admin_domain="$(trim_trailing_slash "${ADMIN_DOMAIN:-}")"
timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cat > "${OUTPUT_DIR}/runtime-config.js" <<EOF
window.__INFINITECH_RUNTIME_CONFIG__ = Object.assign({}, window.__INFINITECH_RUNTIME_CONFIG__ || {}, {
  siteOrigin: "$(escape_js "$site_origin")",
  adminOrigin: "$(escape_js "$admin_origin")",
  inviteOrigin: "$(escape_js "$invite_origin")",
  publicDomain: "$(escape_js "$public_domain")",
  adminDomain: "$(escape_js "$admin_domain")"
});
EOF

cat > "${OUTPUT_DIR}/robots.txt" <<EOF
User-agent: *
Allow: /

Sitemap: ${site_origin}/sitemap.xml
EOF

cat > "${OUTPUT_DIR}/sitemap.xml" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site_origin}/</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${site_origin}/news</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${site_origin}/about</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${site_origin}/expose</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${site_origin}/coop</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${site_origin}/privacy-policy</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${site_origin}/disclaimer</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
EOF

if [ -f "${OUTPUT_DIR}/index.html" ]; then
  tmp_index="${OUTPUT_DIR}/index.html.tmp"
  sed "s|<link rel=\"canonical\" href=\"[^\"]*\" />|<link rel=\"canonical\" href=\"${site_origin}/\" />|" "${OUTPUT_DIR}/index.html" > "${tmp_index}"
  mv "${tmp_index}" "${OUTPUT_DIR}/index.html"
fi
