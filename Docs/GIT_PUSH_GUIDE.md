# Git Workflow — MY(suru) BUS

## Branches

| Branch | Purpose |
|---|---|
| `main` | Stable MVP (legacy — archived) |
| `dev` | Active development (custom backend — live on Render) |

> ⚠️ All new work goes on `dev`. `main` is preserved as the legacy MVP baseline.

---

## Daily Workflow (dev branch)

### Push changes using push.sh

```bash
# From repo root
./push.sh
```

The script will:
1. Show you what files changed
2. Ask for a commit message
3. Ask for commit type (feat/fix/refactor/docs/chore)
4. Add, commit, and push to origin/dev
5. Auto-triggers Vercel deployment for admin dashboard

### Commit Types
| Type | Use when |
|---|---|
| `feat` | Adding a new feature |
| `fix` | Fixing a bug |
| `refactor` | Restructuring code, no behavior change |
| `docs` | Documentation changes only |
| `chore` | Config, tooling, build changes |

---

## Branch Switching

The post-checkout hook (`/.git/hooks/post-checkout`) automatically copies the correct `.env` file when you switch branches:

```bash
git checkout main    # → copies .env.main to each module's .env
git checkout dev     # → copies .env.dev to each module's .env
```

---

## Environment Files per Module

```
module/
  .env              ← active (managed by hook — never commit)
  .env.example      ← template (committed)
  .env.dev          ← dev branch PROD config (committed)
  .env.main         ← main branch config (committed)
```

---

## Mobile App Builds

APKs are built by GitHub Actions with Gradle on every push to `main` that touches an app,
or by hand from **Actions → Android APKs**. See [ANDROID_BUILDS.md](ANDROID_BUILDS.md).

---

## Triggering Deployments

| Action | Effect |
|---|---|
| Push to `dev` | Vercel auto-deploys admin dashboard |
| Push to `dev` with Dockerfile/render.yaml changes | Render auto-deploys backend |
| Push to `main` touching `driver-app/` or `passenger-app/` | GitHub Actions builds both APKs |

---

**Last Updated:** March 2026
