const { Pool } = require('pg');

const connectionString = "postgresql://postgres:AutQQibUFhzMfUmisJiyQzutkCkHpJuZ@centerbeam.proxy.rlwy.net:24359/railway";

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        console.log('--- CHECKING RAILWAY USERS ---');
        const res = await pool.query('SELECT phone_number, full_name, role FROM users');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
}

check();
