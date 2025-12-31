# Migration Guide: Dependency Updates & Distroless

This document outlines the breaking changes and migration steps for the major dependency update.

## Summary of Changes

### Infrastructure
- **Base Images**: Alpine Linux → Debian-based distroless
- **Python**: 3.7 → 3.12
- **Node.js**: 12 → 22 LTS
- **Container**: Now runs as non-root user
- **Entrypoint**: Shell script replaced with Python entrypoint

### Backend Dependencies

| Package | Old Version | New Version | Breaking Changes |
|---------|-------------|-------------|------------------|
| Django | 3.2.x (EOL) | 5.1.x | Yes - see Django docs |
| djangorestframework | - | 3.15.x | Minimal |
| cryptography | 37.0.4 (5+ CVEs) | 44.x | API changes |
| Twisted | 20.3.0 (CVEs) | 24.11.x | API changes |
| social-auth-app-django | 4.x | 5.4.x | Configuration changes |
| websockets | 10.x | 14.x | API changes |
| gunicorn | 20.x | 23.x | Minimal |

### Frontend Dependencies

| Package | Old Version | New Version | Breaking Changes |
|---------|-------------|-------------|------------------|
| Angular | 12.x | 18.x (LTS) | Yes - major |
| TypeScript | 4.3.x | 5.5.x | Yes |
| Webpack | 5.61.x | 5.97.x | Minimal |
| Bootstrap | 5.0.x | 5.3.x | Minimal |
| FontAwesome | 5.x | 6.x | Icon names changed |
| ESLint | 7.x | 9.x | Config changes |

## Critical Breaking Changes

### 1. Django 3.2 → 5.1

**Database Migrations:**
```bash
# Backup your database first!
# New migrations will be created for Django 5.1
python manage.py migrate
```

**Settings Changes:**
- `USE_L10N` deprecated (now always True)
- `DEFAULT_AUTO_FIELD` required for all models
- Updated middleware order may be required

**See:** https://docs.djangoproject.com/en/5.1/releases/

### 2. Angular 12 → 18

**Major Changes:**
- Standalone components (now preferred)
- Updated router configuration
- Dependency injection changes
- RxJS 7.8 compatibility
- TypeScript 5.5 required

**Build Configuration:**
- Webpack config may need updates
- `@angular-devkit/build-angular` replaces `@ngtools/webpack`

**Migration Steps:**
```bash
cd frontend
rm -rf node_modules yarn.lock
yarn install
yarn build  # Fix any errors that appear
```

### 3. Distroless Container

**No Shell Access:**
- Can't `docker exec -it container sh` anymore
- Use `docker exec -it container /venv/bin/python3.12` for Python REPL
- Debug via logs or Python debugger

**No Package Manager:**
- All dependencies must be bundled at build time
- Can't `apt-get install` at runtime

**Non-Root User:**
- Container runs as user `nonroot` (UID 65532)
- File permissions must allow non-root write access
- Volume mounts need correct ownership

### 4. Removed dockerize

The `dockerize` binary is replaced with Python-based dependency waiting.

**Old behavior:**
```bash
DOCKERIZE_ARGS="-wait tcp://db:3306 -timeout 60s"
```

**New behavior:**
The entrypoint automatically detects and waits for `DATABASE_URL` host:port.

For custom wait logic, modify `/app/entrypoint.py`.

## Testing Checklist

Before deploying:

- [ ] Lock files regenerated (`poetry.lock`, `yarn.lock`)
- [ ] Docker image builds successfully
- [ ] Container starts without errors
- [ ] Database migrations run cleanly
- [ ] Frontend loads in browser
- [ ] OAuth login works (GitHub/GitLab/etc.)
- [ ] Config sync functionality works
- [ ] WebSocket connections work
- [ ] File uploads work with non-root user

## Regenerating Lock Files

### Backend
```bash
cd backend
poetry lock --no-update
poetry install
```

### Frontend
```bash
cd frontend
rm -rf node_modules yarn.lock
yarn install
```

## Rollback Plan

If issues occur:

1. Revert to previous Docker image tag
2. Roll back database migrations (if compatible)
3. Check logs for specific error messages

## Known Issues

### Angular 12 → 18 Migration

Angular went through 6 major versions. Expect:
- Template syntax changes
- Component lifecycle changes
- Router configuration updates
- Dependency injection API changes

**Recommendation:** Test thoroughly in staging before production.

### Django 5.1 Changes

Some third-party packages may not be compatible yet. Check:
- `social-auth-app-django` compatibility
- Custom middleware
- Database backend support

## Support

For issues:
1. Check container logs: `docker logs <container>`
2. Check entrypoint output for migration errors
3. Verify environment variables are set correctly
4. Ensure volumes have correct permissions for UID 65532

## Security Improvements

This update patches:
- **CVE-2023-50782**: Cryptography Bleichenbacher timing oracle
- **CVE-2023-0286**: Cryptography/OpenSSL type confusion
- **CVE-2020-10109**: Twisted HTTP request smuggling
- **CVE-2022-39348**: Twisted XSS via Host header
- Multiple Django security issues (3.2 was EOL)

All dependencies are now on actively maintained versions.
