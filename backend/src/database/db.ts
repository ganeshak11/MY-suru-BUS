import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../logger';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  // Connection pool limits
  max: 20,                    // max simultaneous connections
  idleTimeoutMillis: 30000,   // close idle connections after 30s
  connectionTimeoutMillis: 5000, // fail fast if no connection available within 5s
  allowExitOnIdle: false,     // keep pool alive (Ctrl+C handled by graceful shutdown)
});

pool.on('connect', () => {
  logger.debug('PostgreSQL: new client connected');
});

pool.on('error', (err) => {
  logger.error({ err }, 'PostgreSQL pool error');
});

pool.on('remove', () => {
  logger.debug('PostgreSQL: client removed from pool');
});

export default pool;
