# Tabby Web

## Note on project status

> [!IMPORTANT]  
> At this time I don't have the time to work on `tabby-web` and won't be able to provide help or support for it. I'm still happy to merge any fixes/improvement PRs. :v:


![](docs/screenshot.png)

This is the Tabby terminal, served as a web app. It also provides the config sync service for the Tabby app.

# How it works

Tabby Web serves the [Tabby Terminal](https://github.com/Eugeny/tabby) as a web application while managing multiple config files, authentication, and providing TCP connections via a [separate gateway service](https://github.com/Eugeny/tabby-connection-gateway).

# Requirements

## Runtime Requirements

* **Python 3.12+** (updated from 3.7 for security and performance)
* **Node.js 22 LTS** (for frontend)
* A database server supported by Django (MariaDB, Postgres, SQLite, etc.)
* Storage for distribution files - local, S3, GCS or others supported by `fsspec`

## Docker Build Requirements

Building the Docker image requires significant resources due to the frontend compilation:

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 2 GB | 4 GB |
| CPU | 2 cores | 4 cores |
| Disk | 5 GB | 10 GB |

**Note:** The frontend build (webpack/Angular) is memory-intensive. If building on constrained systems (like Oracle Cloud Always Free tier with 1GB RAM), consider:
- Using pre-built images from a CI/CD pipeline
- Building on a larger machine and pushing to a registry
- Adding swap space (not recommended for production)

## Security Features

This version uses:
- **Google Distroless** base images for minimal attack surface
- **Non-root user** execution
- **Updated dependencies** with all known CVEs patched:
  - Django 5.1 (previously 3.2 EOL)
  - cryptography 44.x (previously 37.0.4 with 5+ CVEs)
  - Twisted 24.x (previously 20.3.0 with HTTP smuggling CVEs)

# Quickstart (using `docker-compose`)

You'll need:

* OAuth credentials from GitHub, GitLab, Google or Microsoft for authentication.
* For SSH and Telnet: a [`tabby-connection-gateway`](https://github.com/Eugeny/tabby-connection-gateway) to forward traffic.
* Docker BuildKit: `export DOCKER_BUILDKIT=1`

```bash
    docker-compose up -e SOCIAL_AUTH_GITHUB_KEY=xxx -e SOCIAL_AUTH_GITHUB_SECRET=yyy
```

will start Tabby Web on port 9090 with MariaDB as a storage backend.

For SSH and Telnet, once logged in, enter your connection gateway address and auth token in the settings.

## Environment variables

* `DATABASE_URL` (required).
* `APP_DIST_STORAGE`: a `file://`, `s3://`, or `gcs://` URL to store app distros in.
* `SOCIAL_AUTH_*_KEY` & `SOCIAL_AUTH_*_SECRET`: social login credentials, supported providers are `GITHUB`, `GITLAB`, `MICROSOFT_GRAPH` and `GOOGLE_OAUTH2`.

## Adding Tabby app versions

* `docker-compose run tabby /manage.sh add_version 1.0.163`

You can find the available version numbers [here](https://www.npmjs.com/package/tabby-web-container).

# Development setup

Put your environment vars (`DATABASE_URL`, etc.) in the `.env` file in the root of the repo.

For the frontend:

```shell
cd frontend
yarn
yarn run build # or yarn run watch
```

For the backend:

```shell
cd backend
poetry install
./manage.py migrate # set up the database
./manage.py add_version 1.0.156-nightly.2 # install an app distribution
PORT=9000 poetry run gunicorn # optionally with --reload
```

# Security

* When using Tabby Web for SSH/Telnet connectivity, your traffic will pass through a hosted gateway service. It's encrypted in transit (HTTPS) and the gateway servers authenticate themselves with a certificate before connections are made. However there's a non-zero risk of a MITM if a gateway service is compromised and the attacker gains access to the service's private key.
* You can alleviate this risk by [hosting your own gateway service](https://github.com/Eugeny/tabby-connection-gateway), or your own copy of Tabby Web altogether.
