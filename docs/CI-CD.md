# CI/CD

## Pipeline Overview

The frontend and the Firebase-owned pieces deploy through two independent paths:

```
Push or PR
    │
    ▼
CI (ci.yml)
├── Lint + Typecheck
├── Frontend unit tests
├── Backend unit tests
├── Firestore rules tests (emulator)
└── Security scan (pnpm audit --audit-level=high)
    │
    ▼ (CI passed on main)
Deploy (deploy.yml, triggered by workflow_run)
├── Firestore rules  (scripts/deploy-rules.mjs, Admin SDK)
└── Frontend         (vercel pull, vercel build, vercel deploy --prebuilt --prod)
```

Deploy only starts when every CI job passed on `main`, so a red build never ships. Rules go first so the live app never runs against older rules.

**Why the frontend deploys to Vercel:** this app is server-rendered (Server Actions, `/api/auth/session`, `proxy.ts`), so it needs a server host, not static Firebase Hosting. Vercel's free Hobby tier runs Next.js SSR natively with no billing account required. Firebase Hosting could also do this via its `frameworksBackend` integration, but that runs on Cloud Functions/Cloud Run, which requires the paid Blaze plan.

**Why rules deploy through the Admin SDK:** `firebase deploy` first checks that the Firestore API is enabled, and the default firebase-adminsdk service account is not allowed to make that check. The Admin SDK call only needs permission to release rules, which that account already has.

## Vercel Setup (Frontend)

1. [vercel.com](https://vercel.com) → **Add New Project** → import this GitHub repo
2. **Root Directory**: set to `frontend` (this is a pnpm workspace monorepo — Vercel auto-detects the Next.js app once the root directory is set)
3. **Environment Variables** — add these in the Vercel project settings (Production, and Preview if you want PR previews to work):

   | Variable                                   | Value                                                                                     |
   | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_FIREBASE_API_KEY`             | from `firebaseConfig`                                                                     |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | from `firebaseConfig`                                                                     |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | from `firebaseConfig` — same name as in your root `.env`                                  |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | from `firebaseConfig`                                                                     |
   | `NEXT_PUBLIC_FIREBASE_APP_ID`              | from `firebaseConfig`                                                                     |
   | `NEXT_PUBLIC_APP_NAME`                     | app display name                                                                          |
   | `NEXT_PUBLIC_APP_URL`                      | your Vercel production URL, once known                                                    |
   | `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64`      | base64-encoded service account JSON (server-only — do **not** prefix with `NEXT_PUBLIC_`) |

4. Do not connect the Git integration. `deploy.yml` deploys the frontend with the Vercel CLI after CI passes, so a failing build never reaches production.
5. If you later add the `backend/` Express API and need the frontend to call it cross-origin, set `CORS_ORIGIN` in the backend's env to your Vercel production URL.

## GitHub Actions Secrets Required (for `deploy.yml`)

Add these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret                                | Description                                               |
| ------------------------------------- | --------------------------------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` | Base64-encoded service account JSON                       |
| `VERCEL_TOKEN`                        | Vercel access token for the account that owns the project |
| `VERCEL_ORG_ID`                       | Vercel team id (`team_...`)                               |
| `VERCEL_PROJECT_ID`                   | Vercel project id (`prj_...`)                             |

Both deploy jobs use the `production` GitHub environment.

### Getting the service account key

1. Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key** → download the JSON file
3. Encode it:

```bash
# macOS (BSD base64 — no -w flag)
base64 -i service-account.json | tr -d '\n'

# Linux (GNU base64)
base64 -w 0 service-account.json

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

4. Add the output as `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` in both GitHub secrets and Vercel's environment variables.

> **Note:** `firebase login:ci` tokens are deprecated. This project uses `GOOGLE_APPLICATION_CREDENTIALS` via the service account key, which is the current recommended approach.

## Manual Deployment

```bash
# Authenticate locally (one-time) — no install needed, npx runs the CLI on demand
npx firebase-tools login

# Firestore rules — free, no Blaze needed
npx firebase-tools deploy --only firestore:rules
npx firebase-tools deploy --only firestore:indexes

# Backend Cloud Function — optional, requires the Blaze plan
npx firebase-tools deploy --only functions
```

The frontend has no manual `firebase deploy` equivalent — it deploys via Vercel (dashboard push, or `vercel --prod` with the Vercel CLI if installed).

## Environments

| Environment                | Branch                         | Auto-deploy                           |
| -------------------------- | ------------------------------ | ------------------------------------- |
| Production frontend        | `main`                         | Yes, via `deploy.yml` after CI passes |
| Production Firestore rules | `main`                         | Yes, via `deploy.yml` after CI passes |
| Staging                    | _set up per project_           | Optional                              |
| Local                      | your own free Firebase project | `pnpm run dev`                        |
