#!/usr/bin/env python3
"""
Entrypoint script for Tabby Web in distroless container.
Replaces start.sh with Python-based initialization.
"""
import os
import sys
import time
import socket
import subprocess
from urllib.parse import urlparse


def wait_for_service(host: str, port: int, timeout: int = 30) -> bool:
    """Wait for a TCP service to become available."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection((host, port), timeout=5):
                print(f"✓ Service {host}:{port} is ready", flush=True)
                return True
        except (socket.timeout, ConnectionRefusedError, OSError):
            time.sleep(1)
    print(f"✗ Timeout waiting for {host}:{port}", file=sys.stderr, flush=True)
    return False


def wait_for_database() -> bool:
    """Wait for database if DATABASE_URL is configured."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return True

    # Parse DATABASE_URL (format: postgres://user:pass@host:port/db or mysql://...)
    try:
        parsed = urlparse(database_url)
        if parsed.hostname and parsed.port:
            print(f"Waiting for database at {parsed.hostname}:{parsed.port}...", flush=True)
            return wait_for_service(parsed.hostname, parsed.port, timeout=60)
        elif parsed.hostname:
            # Default ports
            default_ports = {
                "postgres": 5432,
                "postgresql": 5432,
                "mysql": 3306,
                "mariadb": 3306,
            }
            port = default_ports.get(parsed.scheme, 5432)
            print(f"Waiting for database at {parsed.hostname}:{port}...", flush=True)
            return wait_for_service(parsed.hostname, port, timeout=60)
    except Exception as e:
        print(f"Warning: Could not parse DATABASE_URL: {e}", file=sys.stderr, flush=True)

    return True


def run_migrations():
    """Run Django migrations."""
    print("Running database migrations...", flush=True)
    # Use system python with PYTHONPATH set to venv site-packages
    # In debian-slim images, python3 is at /usr/local/bin
    system_python = "/usr/local/bin/python3"
    result = subprocess.run(
        [system_python, "manage.py", "migrate", "--noinput"],
        cwd="/app",
        check=False
    )
    if result.returncode != 0:
        print(f"✗ Migrations failed with code {result.returncode}", file=sys.stderr, flush=True)
        sys.exit(result.returncode)
    print("✓ Migrations completed successfully", flush=True)


def start_gunicorn():
    """Start Gunicorn server."""
    print("Starting Gunicorn...", flush=True)
    # Use gunicorn from venv via system python -m
    # In debian-slim images, python3 is at /usr/local/bin
    system_python = "/usr/local/bin/python3"
    os.chdir("/app")
    # Execute gunicorn module via python -m
    os.execv(system_python, [system_python, "-m", "gunicorn"])


def main():
    """Main entrypoint logic."""
    print("=" * 60, flush=True)
    print("Tabby Web - Distroless Container Entrypoint", flush=True)
    print("=" * 60, flush=True)

    # Wait for database if configured
    if not wait_for_database():
        print("Failed to connect to database", file=sys.stderr, flush=True)
        sys.exit(1)

    # Run migrations
    run_migrations()

    # Start Gunicorn (this replaces current process)
    start_gunicorn()


if __name__ == "__main__":
    main()
