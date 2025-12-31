# syntax=docker/dockerfile:1
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json ./
RUN yarn install --network-timeout 1000000
COPY frontend/webpack* frontend/tsconfig.json ./
COPY frontend/assets assets
COPY frontend/src src
COPY frontend/theme theme
RUN yarn run build
RUN yarn run build:server

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
    libmariadb-dev \
    libmariadb-dev-compat \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Poetry
RUN pip install --no-cache-dir poetry==1.8.3

# Copy dependency files
COPY backend/pyproject.toml ./

# Configure Poetry to create venv in /venv
RUN poetry config virtualenvs.path /venv && \
    poetry config virtualenvs.in-project false

# Install dependencies (will generate poetry.lock)
RUN poetry lock --no-update && \
    poetry install --no-dev --no-ansi --no-interaction

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

FROM gcr.io/distroless/python3-debian12:nonroot AS backend

ENV APP_DIST_STORAGE=file:///app-dist
ENV PYTHONUNBUFFERED=1

# Copy Python virtual environment
COPY --from=build-backend /venv /venv

# Copy application
COPY --from=build-backend /app /app

# Copy app-dist
COPY --from=build-backend /app-dist /app-dist

# Copy MariaDB client libraries
COPY --from=build-backend /usr/lib/x86_64-linux-gnu/libmariadb.so.3 /usr/lib/x86_64-linux-gnu/
COPY --from=build-backend /usr/lib/x86_64-linux-gnu/libssl.so.3 /usr/lib/x86_64-linux-gnu/
COPY --from=build-backend /usr/lib/x86_64-linux-gnu/libcrypto.so.3 /usr/lib/x86_64-linux-gnu/

# Copy entrypoint script
COPY backend/entrypoint.py /app/

WORKDIR /app

# Set Python path to find venv
ENV PATH="/venv/lib/python3.12/site-packages:$PATH"
ENV PYTHONPATH="/venv/lib/python3.12/site-packages"

# Run as non-root user (distroless default)
USER nonroot

ENTRYPOINT ["/venv/bin/python3.12", "/app/entrypoint.py"]
