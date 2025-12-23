# Quick Start - TypeScript Backend

## Setup (First Time)

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Supabase credentials:
   ```env
   DATABASE_URL=postgresql://postgres:[password]@[host]/postgres
   PORT=3001
   JWT_SECRET=your-secret-key-here
   ```

3. **Build TypeScript:**
   ```bash
   npm run build
   ```

## Development

**Run with auto-reload:**
```bash
npm run dev
```

This uses `ts-node` to run TypeScript directly without building.

## Production

**Build and run:**
```bash
npm run build
npm start
```

## Project Structure

```
backend/
├── src/                    # TypeScript source files
│   ├── app.ts             # Main application
│   ├── types.ts           # Type definitions
│   ├── database/
│   │   └── db.ts          # Database connection
│   ├── middleware/
│   │   └── auth.ts        # JWT authentication
│   └── routes/            # API routes
│       ├── auth.ts
│       ├── routes.ts
│       ├── buses.ts
│       ├── trips.ts
│       ├── stops.ts
│       ├── announcements.ts
│       └── reports.ts
├── dist/                  # Compiled JavaScript (generated)
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies
└── .env                   # Environment variables (create this)
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with auto-reload |
| `npm start` | Production server (requires build) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run init-db` | Initialize database |
| `npm run clean-db` | Clean database |
| `npm run reset-db` | Reset database |

## Testing

**Health check:**
```bash
curl http://localhost:3001/health
```

**Get all routes:**
```bash
curl http://localhost:3001/api/routes
```

## Common Issues

**Port already in use:**
```bash
# Change PORT in .env file
PORT=3002
```

**Database connection error:**
- Verify DATABASE_URL in `.env`
- Check Supabase project is active
- Ensure SSL is enabled in connection string

**TypeScript errors:**
```bash
# Clean build
rm -rf dist/
npm run build
```

## What Changed from JavaScript?

- All `.js` files converted to `.ts`
- Added type annotations
- Added `types.ts` for shared types
- Updated `package.json` scripts
- Added `tsconfig.json`
- Build step now required for production

**API endpoints remain exactly the same!**

---

**Ready to use!** 🚀
