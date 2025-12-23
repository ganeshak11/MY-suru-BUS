# Git Push Guide - Collaborator Account

## Step 1: Configure Git with New Account

```bash
# Set your new account credentials (run in MY-suru-BUS directory)
git config user.name "Your New Name"
git config user.email "your-new-email@example.com"
```

## Step 2: Check Current Status

```bash
# See what files have changed
git status

# See current remote
git remote -v
```

## Step 3: Stage All Changes

```bash
# Add all changes
git add .

# Or add specific files/folders
git add backend/
git add admin-dashboard/
git add driver-app/
```

## Step 4: Commit Changes

```bash
git commit -m "Migrated to custom TypeScript backend with PostgreSQL"
```

## Step 5: Push to Repository

```bash
# Push to main branch
git push origin main

# Or if you're on a different branch
git push origin <branch-name>
```

## Troubleshooting

### If push is rejected (authentication):
```bash
# GitHub will prompt for credentials
# Use Personal Access Token (PAT) instead of password
# Generate PAT at: https://github.com/settings/tokens
```

### If you need to pull first:
```bash
git pull origin main --rebase
git push origin main
```

### If you want to create a new branch:
```bash
git checkout -b backend-migration
git push origin backend-migration
```

## Quick Commands Summary

```bash
cd c:\projects\MY-suru-BUS
git config user.name "Your Name"
git config user.email "your@email.com"
git add .
git commit -m "Backend migration complete"
git push origin main
```

## What Was Changed Today

- ✅ Created custom TypeScript backend API
- ✅ Migrated all apps from Supabase to custom API
- ✅ Added JWT authentication
- ✅ Created admin user system
- ✅ Added drivers route endpoint
- ✅ Fixed admin dashboard login
- ✅ Migrated all CRUD operations to API client
