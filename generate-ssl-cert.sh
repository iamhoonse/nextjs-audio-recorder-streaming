#!/bin/bash

# Generate self-signed SSL certificates for local development
# These certificates should NOT be used in production

echo "Generating self-signed SSL certificates for development..."

# Create nginx/ssl directory if it doesn't exist
mkdir -p nginx/ssl

# Generate private key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/OU=Development/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "✅ SSL certificates generated successfully!"
echo "📁 Location: nginx/ssl/"
echo ""
echo "⚠️  Note: These are self-signed certificates for development only."
echo "   Your browser will show a security warning - this is expected."
echo "   Click 'Advanced' and 'Proceed to localhost' to continue."
