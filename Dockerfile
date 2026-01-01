# syntax=docker/dockerfile:1
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 1000000
COPY frontend/webpack* frontend/tsconfig.json ./
COPY frontend/assets assets
COPY frontend/src src
COPY frontend/theme theme
RUN NODE_ENV=production yarn run build
RUN NODE_ENV=production yarn run build:server
# Replace {{backendURL}} template variable with empty string for same-origin API calls
RUN sed -i 's/{{backendURL}}//' /app/build/index.html

FROM node:22-alpine AS frontend
WORKDIR /app
COPY --from=frontend-build /app/build build
COPY --from=frontend-build /app/build-server build-server
COPY frontend/package.json .

CMD ["npm", "start"]

# ----

FROM python:3.12-slim AS build-backend
ARG EXTRA_DEPS

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    libffi-dev \
    libmariadb-dev \
    libmariadb-dev-compat \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Poetry
RUN pip install --no-cache-dir poetry==1.8.3

# Copy dependency files
COPY backend/pyproject.toml backend/poetry.lock* ./

# Configure Poetry to create venv in /venv
RUN poetry config virtualenvs.path /venv && \
    poetry config virtualenvs.in-project false

# Install dependencies (always regenerate lock to ensure consistency)
RUN poetry lock --no-update && \
    poetry install --only main --no-ansi --no-interaction

# Copy venv contents to fixed locations (glob requires shell)
RUN /bin/bash -c 'cp -r /venv/tabby-web-*/lib/python3.12/site-packages /venv/site-packages' && \
    /bin/bash -c 'cp -r /venv/tabby-web-*/bin /venv/bin'

# Install additional deps (psycopg2-binary, python-jose for Auth0/OIDC)
RUN poetry run pip install --no-cache-dir psycopg2-binary python-jose[cryptography] $EXTRA_DEPS

# Copy application code
COPY backend/manage.py backend/gunicorn.conf.py ./
COPY backend/tabby tabby
COPY --from=frontend /app/build /frontend

# Build static assets and bundle Tabby version
ARG BUNDLED_TABBY=1.0.187-nightly.1
RUN FRONTEND_BUILD_DIR=/frontend /venv/*/bin/python ./manage.py collectstatic --noinput
RUN APP_DIST_STORAGE=file:///app-dist /venv/*/bin/python ./manage.py add_version ${BUNDLED_TABBY}

# ----

FROM python:3.12-slim AS backend

ENV APP_DIST_STORAGE=file:///app-dist
ENV PYTHONUNBUFFERED=1
ENV VIRTUAL_ENV=/venv

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash appuser

# Copy Python virtual environment
COPY --from=build-backend --chown=appuser:appuser /venv /venv

# Poetry venv is at /venv/tabby-web-HASH-py3.12/ with copied bin and site-packages

# Copy application
COPY --from=build-backend --chown=appuser:appuser /app /app

# Copy app-dist
COPY --from=build-backend --chown=appuser:appuser /app-dist /app-dist

# Copy MariaDB client libraries and SSL dependencies
COPY --from=build-backend /usr/lib/x86_64-linux-gnu/libmariadb.so.3 /usr/lib/x86_64-linux-gnu/
COPY --from=build-backend /usr/lib/x86_64-linux-gnu/libssl.so.3 /usr/lib/x86_64-linux-gnu/
COPY --from=build-backend /usr/lib/x86_64-linux-gnu/libcrypto.so.3 /usr/lib/x86_64-linux-gnu/
COPY --from=build-backend /usr/lib/x86_64-linux-gnu/libzstd.so.1 /usr/lib/x86_64-linux-gnu/

# Copy entrypoint script
COPY --chown=appuser:appuser backend/entrypoint.py /app/

WORKDIR /app

# Set Python path to find venv packages (copied during build)
ENV PYTHONPATH="/venv/site-packages:/app"

# Run as non-root user
USER appuser

# Use system python3 (in slim images, it's at /usr/local/bin)
ENTRYPOINT ["/usr/local/bin/python3", "/app/entrypoint.py"]
