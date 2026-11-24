# Deploying BM Booking to Render

This repo includes a [`render.yaml`](./render.yaml) Blueprint, so Render can build and
run the app without any manual configuration.

## One-time setup

1. Push the repo to GitHub (remote: `https://github.com/mekdelawitworku6-lgtm/bmbooking-portfolio.git`).
2. Go to <https://dashboard.render.com> → **New +** → **Blueprint**.
3. Connect the GitHub account/repo above. Render detects `render.yaml` automatically.
4. Name the project (e.g. `bmbooking-portfolio`) and click **Apply**.
5. Render installs dependencies, runs `npm run build`, and starts the app.
   Your public URL will look like `https://bmbooking-portfolio.onrender.com`.

## What the Blueprint configures

| Setting | Value |
| --- | --- |
| Runtime | Node (Node 22) |
| Build | `npm ci && npm run build` |
| Start | `./node_modules/.bin/next start -p $PORT` |
| Region | Frankfurt |
| Plan | Free |
| Health check | `/login` |

Environment variables (already set in the Blueprint):

- `NEXT_PUBLIC_API_URL=https://bmbookingapi.possibletechplc.com`
- `NEXT_PUBLIC_TELEBIRR_URL=https://bmtelebirr.possibletechplc.com`

The app rewrites `/api/*` and `/uploads/*` to the API, so the browser stays on the
same origin — no CORS setup is needed.

## Notes for a demo

- The free plan sleeps after ~15 minutes of inactivity, so the first request after a
  pause can take 30–60 seconds. Ping the URL shortly before showing it.
- All data comes from the live API. If the API is down, pages will load but lists
  will be empty or show errors.
- To use a different API (for example a staging backend), change `NEXT_PUBLIC_API_URL`
  in Render → your service → **Environment**, then redeploy. `NEXT_PUBLIC_*` values are
  baked into the build, so a rebuild is required.
- After the first deploy, every push to `main` triggers a new deploy automatically.
