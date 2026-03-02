#!/usr/bin/env node
/**
 * migrate.js  —  runs all SQL migration files in order against DATABASE_URL
 * Usage:  node migrate.js
 * The script is idempotent — each migration uses IF NOT EXISTS / IF EXISTS guards.
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ssl = process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false };

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

(async () => {
    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort(); // lexicographic order: 000_, 001_, 002_

    for (const file of files) {
        // Skip the data export helper — it's not a migration
        if (file.includes('data_export')) {
            console.log(`⏭  Skipping  ${file}`);
            continue;
        }

        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
        console.log(`▶  Running   ${file}`);
        try {
            await pool.query(sql);
            console.log(`✅  Done      ${file}`);
        } catch (err) {
            console.error(`❌  Failed   ${file}:`, err.message);
            process.exit(1);
        }
    }

    await pool.end();
    console.log('\n🎉 All migrations applied successfully.');
})();
