# Dependency Upgrade Progress

## Overview
Complete dependency overhaul from legacy versions to latest stable with distroless containers.

## Versions Upgraded

### Backend (Python)
- **Python**: 3.7 → 3.12
- **Django**: 3.2 → 5.1
- **cryptography**: 37.0.4 → 44.0 (fixes CVE-2023-50782, CVE-2023-0286)
- **Twisted**: 20.3.0 → 24.11 (fixes CVE-2020-10109)
- **Container**: Alpine → Debian + Google Distroless

### Frontend (Node.js/Angular)
- **Node.js**: 12 → 22 LTS
- **Angular**: 12 → 18 LTS
- **TypeScript**: ~4.0 → ~5.5
- **Webpack**: 4 → 5
- **Bootstrap**: 4 → 5
- **Container**: Alpine → Debian + Google Distroless

## Completed Changes

### ✅ Dockerfile Modernization
- Multi-stage build with separate frontend/backend stages
- Google Distroless runtime (gcr.io/distroless/python3-debian12:nonroot)
- Python 3.12 with Poetry 1.8.3
- Node 22 with Yarn
- Non-root user (UID 65532)
- Python entrypoint.py replaces start.sh (no shell in distroless)

### ✅ Angular 18 Migration
- Removed deprecated `@nguniversal/express-engine` → `@angular/ssr`
- Removed `BrowserTransferStateModule` and `ServerTransferStateModule`
- Added `@ngtools/webpack` v18
- Updated to `CommonEngine` for SSR
- Fixed zone.js import: `zone.js/dist/zone-node` → `zone.js/node`
- Replaced deprecated `import * as express` with `import express`
- Created `main.server.ts` bootstrap file

### ✅ Backend Dependencies
- Updated all Python packages to latest stable
- Fixed Dockerfile to include libffi-dev for cryptography
- Updated Poetry command to use `--only main` instead of deprecated `--no-dev`
- Poetry lockfile regeneration on build

### ✅ TypeScript Fixes
- Fixed null safety in `settingsModal.component.ts`
- Removed unused imports in `server.ts` and `main.server.ts`
- Updated `ssr-polyfills.ts` to use `(global as any)` casts

### ✅ Package Updates
- Replaced `@nguniversal/common` with native Angular SSR
- Updated font packages: `source-sans-pro` → `@fontsource/source-sans-pro`
- Added peer dependencies: `@angular/localize`, `@popperjs/core`
- Generated fresh `yarn.lock` with all dependencies

## Remaining Issues

### ❌ Bootstrap 5 SCSS Compatibility
**Error**: `Undefined variable: $utilities-border-colors`
- Bootstrap 5 expects additional SCSS variables
- Need to add missing Bootstrap utility variables

**Error**: SCSS deprecation warnings
- Sass `@import` deprecated → need `@use`
- Color functions deprecated → need modern syntax

### ❌ TypeScript Errors

**1. server.ts bootstrap type mismatch**
```
Type '() => Promise<typeof AppServerModule>' is not assignable to
type '(context: BootstrapContext) => Promise<ApplicationRef>'
```
- CommonEngine expects ApplicationRef, not Module
- Need to update bootstrap function signature

**2. ssr-polyfills.ts errors**
```
Object.defineProperty(win.document.body.style, 'z-index', {...})
Cannot invoke an object which is possibly 'null'
```
- TypeScript strict mode issues
- Need type guards or assertions

## Files Modified

### Dockerfile Changes
- `/home/brian/repos/tabby-web/Dockerfile` - Complete rewrite for distroless

### Backend Changes
- `/home/brian/repos/tabby-web/backend/pyproject.toml` - Updated all dependencies
- `/home/brian/repos/tabby-web/backend/entrypoint.py` - **NEW**: Python entrypoint
- `/home/brian/repos/tabby-web/backend/poetry.lock` - Regenerated in Docker

### Frontend Changes
- `/home/brian/repos/tabby-web/frontend/package.json` - Angular 18 + dependencies
- `/home/brian/repos/tabby-web/frontend/yarn.lock` - Regenerated with all deps
- `/home/brian/repos/tabby-web/frontend/src/app.module.ts` - Removed Universal modules
- `/home/brian/repos/tabby-web/frontend/src/app.server.module.ts` - Removed TransferState
- `/home/brian/repos/tabby-web/frontend/src/server.ts` - CommonEngine migration
- `/home/brian/repos/tabby-web/frontend/src/main.server.ts` - **NEW**: Bootstrap file
- `/home/brian/repos/tabby-web/frontend/src/ssr-polyfills.ts` - Type safety fixes
- `/home/brian/repos/tabby-web/frontend/src/app/components/settingsModal.component.ts` - Null check
- `/home/brian/repos/tabby-web/frontend/theme/vars.scss` - Added `$theme-colors-rgb`
- `/home/brian/repos/tabby-web/frontend/webpack.config.js` - Updated for Angular 18
- `/home/brian/repos/tabby-web/frontend/webpack.config.base.js` - @ngtools/webpack

### Documentation
- `/home/brian/repos/tabby-web/README.md` - Updated requirements
- `/home/brian/repos/tabby-web/MIGRATION.md` - Migration guide
- `/home/brian/repos/tabby-web/UPGRADE_PROGRESS.md` - **THIS FILE**

## Security Fixes

### CVEs Addressed
- **CVE-2023-50782**: cryptography 37.0.4 → 44.0 (Bleichenbacher timing attack)
- **CVE-2023-0286**: OpenSSL type confusion via cryptography upgrade
- **CVE-2020-10109**: Twisted HTTP request smuggling (20.3.0 → 24.11)
- Multiple Django security issues (3.2 EOL → 5.1 active support)

## Next Steps

1. **Fix Bootstrap 5 SCSS variables**
   - Add `$utilities-border-colors` to `theme/vars.scss`
   - Consider migrating from `@import` to `@use` syntax

2. **Fix server.ts bootstrap type**
   - Update `main.server.ts` to return ApplicationRef
   - Or adjust CommonEngine usage pattern

3. **Fix ssr-polyfills.ts**
   - Add type assertions for domino
   - Handle null cases properly

4. **Test full Docker build**
   - Complete frontend build
   - Complete backend build with poetry.lock
   - Test multi-stage build
   - Test distroless runtime

5. **Test Application**
   - Verify SSR functionality
   - Test Auth0 integration
   - Verify all frontend features
   - Test database connectivity

## Branch Status
- **Branch**: `chore/dependency-security-updates`
- **Remote**: Not pushed (local only, awaiting successful build)
- **Base**: main

## Build Status

### Frontend Build
- ✅ Package installation
- ✅ Webpack configuration
- ✅ TypeScript compilation (partial)
- ❌ SCSS compilation (Bootstrap 5 variables)
- ❌ Final build

### Backend Build
- ✅ Python 3.12 base image
- ✅ Build dependencies (including libffi-dev)
- ✅ Poetry installation
- ⏸️ Poetry lock generation (pending frontend completion)
- ⏸️ Dependency installation
- ⏸️ Static file collection
- ⏸️ Distroless runtime

## Rollback Plan

If needed, revert with:
```bash
cd /home/brian/repos/tabby-web
git checkout main
git branch -D chore/dependency-security-updates
```

Original versions are preserved in git history.
