const { Pool } = require('pg');

const connectionString = "postgresql://postgres:AutQQibUFhzMfUmisJiyQzutkCkHpJuZ@centerbeam.proxy.rlwy.net:24359/railway";

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function fix() {
    try {
        console.log('Fixing Database Schema...');

        // 1. Add full_name to users if missing
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)');

        // 2. Clear old test data to avoid confusion (Optional - I will just update them)
        console.log('Updating lalo...');
        await pool.query("UPDATE users SET full_name = 'lalo' WHERE phone_number = '4444444444'");

        console.log('Database Refined!');
        process.exit(0);
    } catch (err) {
        console.error('Error during fix:', err);
        process.exit(1);
    }
}

fix();
