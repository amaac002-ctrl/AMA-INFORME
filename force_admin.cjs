const sqlite = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new sqlite('data.db');

// Admin credentials are sourced from the environment, never hardcoded.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
    console.error('ERROR: Define ADMIN_PASSWORD (y opcionalmente ADMIN_EMAIL) antes de ejecutar este script.');
    process.exit(1);
}

const hashed = bcrypt.hashSync(ADMIN_PASSWORD, 10);
db.prepare('DELETE FROM users WHERE LOWER(email) = LOWER(?)').run(ADMIN_EMAIL);
db.prepare("INSERT INTO users (email, password, role) VALUES (?, ?, 'admin')").run(ADMIN_EMAIL, hashed);

const users = db.prepare('SELECT id, email, role FROM users').all();
console.log('--- Admin actualizado ---');
console.log(JSON.stringify(users, null, 2));
