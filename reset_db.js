const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = "postgresql://postgres:AutQQibUFhzMfUmisJiyQzutkCkHpJuZ@centerbeam.proxy.rlwy.net:24359/railway";

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function reset() {
    try {
        const hashedPassword = await bcrypt.hash('12345678', 10);
        console.log('--- REPAIRING CLOUD DATABASE ---');

        // 1. Ensure columns exist
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)');
        await pool.query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)');
        await pool.query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)');

        // 2. Clean up old entries IF needed (I will just update them to be safe)
        console.log('Resetting "lalo" to password 12345678...');
        const laloRes = await pool.query(
            "UPDATE users SET password_hash = $1, full_name = 'lalo' WHERE phone_number = '4444444444' RETURNING id",
            [hashedPassword]
        );

        if (laloRes.rows.length === 0) {
            console.log('lalo not found, creating afresh...');
            const newUser = await pool.query(
                "INSERT INTO users (phone_number, full_name, password_hash, role) VALUES ('4444444444', 'lalo', $1, 'DOCTOR') RETURNING id",
                [hashedPassword]
            );
            await pool.query(
                "INSERT INTO doctors (user_id, full_name, specialty, hospital, location) VALUES ($1, 'lalo', 'General', 'Main Hospital', 'City Center')",
                [newUser.rows[0].id]
            );
        }

        console.log('RESET COMPLETE!');
        console.log('Use phone: 4444444444');
        console.log('Use password: 12345678');
        process.exit(0);
    } catch (err) {
        console.error('Error during reset:', err);
        process.exit(1);
    }
}

reset();
