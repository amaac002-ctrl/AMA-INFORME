const sqlite = require('better-sqlite3');
const db = new sqlite('data.db');

// Mission Critical: Ensure Fran is the only high-level admin and has the correct case
db.prepare("DELETE FROM users WHERE LOWER(email) = 'fran'").run();
db.prepare("INSERT INTO users (email, password, role) VALUES ('Fran', 'Fran002', 'admin')").run();

const users = db.prepare('SELECT * FROM users').all();
console.log('--- MISSION COMPLETE: USER PRIVILEGES UPDATED ---');
console.log(JSON.stringify(users, null, 2));
console.log('--------------------------------------------------');
