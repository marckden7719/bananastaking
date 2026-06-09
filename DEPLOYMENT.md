# Banana Staking — Vercel Deployment Guide

## Root Cause

The `@lovable.dev/vite-tanstack-config` package has a critical behavior:
when NOT running inside a Lovable sandbox, it **skips the Nitro deploy plugin**
unless `nitro: true` or `nitro: { preset: "..." }` is explicitly set.

Without Nitro:
- Build produces only `dist/client` + `dist/server` (raw Vite SSR output)
- Vercel receives this but has **no serverless function** to handle SSR
- Vercel falls back to static file serving
- `dist/client/index.html` doesn't exist as a static file (SPA)
- **Every route returns 404**

## Fix Applied

1. **vite.config.ts** — Added `nitro: { preset: "vercel" }` to force Nitro
   to generate Vercel-compatible serverless function output
   (`.vercel/output/functions/` + `.vercel/output/static/`)

2. **vercel.json** — Added rewrite rules so all routes hit the SSR function

3. **package.json** — Increased Node heap to 4096 MB to prevent OOM
   during Nitro bundling (framer-motion + reown + wagmi are large)

## Project Settings on Vercel

- Framework Preset: **TanStack Start** (or "Other" — vercel.json overrides it)
- Build Command: `npm run build`  (runs `NODE_OPTIONS='--max-old-space-size=4096' vite build`)
- Output Directory: `dist/client` (Vercel ignores this when .vercel/output exists)
- Install Command: `npm install`

## Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

```
VITE_REOWN_PROJECT_ID=14a6012ffc42d98b14cc3637e1c3c924
```

## Build Output Structure

After a successful build, you should see:

```
.vercel/
  output/
    functions/
      __server.func/     ← Serverless function (SSR handler)
        index.js
        middleware.js
    static/              ← Static assets (from dist/client)
      assets/
      robots.txt
dist/
  client/                ← Client bundle (also copied to .vercel/output/static)
  server/                ← Server bundle (bundled into __server.func)
```

## Verification Checklist

- [ ] `npm run build` completes without errors
- [ ] `.vercel/output/functions/__server.func/` directory exists and is non-empty
- [ ] `.vercel/output/static/` contains `assets/` and HTML files
- [ ] `vercel.json` exists at project root
- [ ] `vite.config.ts` has `nitro: { preset: "vercel" }`
- [ ] Vercel project has `VITE_REOWN_PROJECT_ID` env var set
- [ ] Framework preset is "TanStack Start" or "Other"
- [ ] Production URL returns 200 (not 404)

## Common Issues

### OOM during build
Symptom: `FATAL ERROR: Reached heap limit Allocation failed`
Fix: Ensure `NODE_OPTIONS='--max-old-space-size=4096'` is in the build command.
On Vercel's default 8GB RAM plan this should work. If not, upgrade to Pro.

### 404 on all routes after deploy
Symptom: Build succeeds but every page returns 404
Fix: Ensure `.vercel/output/functions/__server.func/index.js` exists.
If missing, the Nitro plugin didn't run — check vite config.

### `vercel.json` not being respected
Symptom: Rewrites don't work
Fix: Ensure `vercel.json` is at the project root (same level as package.json).

### Environment variables not available in browser
Symptom: `VITE_REOWN_PROJECT_ID` is undefined
Fix: Only vars prefixed with `VITE_` are exposed to the client by Vite.
Ensure they're set in Vercel Dashboard, not just in a local .env file.

## Rollback

If you need to revert to the old non-Nitro build:
1. Remove `nitro: { preset: "vercel" }` from vite.config.ts
2. Remove vercel.json
3. This will go back to 404 until Nitro is re-enabled
