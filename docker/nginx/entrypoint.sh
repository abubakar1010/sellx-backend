#!/bin/sh
set -eu

CERT_DIR="/etc/nginx/certs"
CERT_FILE="$CERT_DIR/localhost.crt"
KEY_FILE="$CERT_DIR/localhost.key"
CERT_CN="${CERT_CN:-localhost}"
CERT_SANS="${CERT_SANS:-DNS:localhost,IP:127.0.0.1}"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 -sha256 -days 825 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=$CERT_CN" \
    -addext "subjectAltName=$CERT_SANS"
fi

exec nginx -g "daemon off;"
