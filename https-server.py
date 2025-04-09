#!/usr/bin/env python3
"""
Simple HTTPS server with self-signed certificate generation
"""

import http.server
import ssl
import os
import sys
from pathlib import Path

PORT = 8443  # Standard HTTPS port is 443, but we use 8443 to avoid requiring admin privileges

def generate_self_signed_cert():
    """Generate a self-signed certificate if one doesn't exist"""
    cert_file = 'server.crt'
    key_file = 'server.key'

    if os.path.exists(cert_file) and os.path.exists(key_file):
        print(f"Certificate files already exist: {cert_file} and {key_file}")
        return cert_file, key_file

    print("Generating self-signed certificate...")

    # Create openssl command
    cmd = f'openssl req -x509 -newkey rsa:2048 -keyout {key_file} -out {cert_file} -days 365 -nodes -subj "/CN=localhost"'

    # Execute command
    result = os.system(cmd)

    if result != 0:
        print("Failed to generate certificate.")
        sys.exit(1)

    print(f"Certificate generated: {cert_file} and {key_file}")
    return cert_file, key_file

def run_server():
    """Run the HTTPS server"""
    cert_file, key_file = generate_self_signed_cert()

    # Set up a simple HTTP server
    handler = http.server.SimpleHTTPRequestHandler

    # Create HTTPS server
    httpd = http.server.HTTPServer(('localhost', PORT), handler)

    # Add SSL context
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile=cert_file, keyfile=key_file)
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

    print(f"Server running at https://localhost:{PORT}/")
    print("Note: You'll need to accept the self-signed certificate warning in your browser.")
    print("Press Ctrl+C to stop the server.")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == "__main__":
    run_server()
