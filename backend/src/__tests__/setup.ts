// This runs BEFORE any test file imports, so JWT_SECRET is set
// before auth.ts middleware is loaded
process.env.JWT_SECRET = 'test-secret-minimum-32-chars-for-jest-only';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.NODE_ENV = 'test';
