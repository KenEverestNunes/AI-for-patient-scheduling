const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

let pool = null;

function isNeonConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

function getPool() {
  if (!isNeonConfigured()) {
    return null;
  }
  if (!pool) {
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: true
      });
    } catch (err) {
      console.error('Failed to initialize Neon connection pool:', err);
      pool = null;
    }
  }
  return pool;
}

async function query(text, params = []) {
  const p = getPool();
  if (!p) {
    throw new Error('Neon database is not configured. Set DATABASE_URL in environment.');
  }
  const client = await p.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function initSchema() {
  if (!isNeonConfigured()) {
    return false;
  }
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, 'utf8');
      await query(sqlContent);
      console.log('✅ Neon PostgreSQL schema tables initialized successfully');
      return true;
    }
  } catch (err) {
    console.error('⚠️ Failed to initialize Neon database schema:', err.message);
  }
  return false;
}

module.exports = {
  isNeonConfigured,
  getPool,
  query,
  initSchema
};
