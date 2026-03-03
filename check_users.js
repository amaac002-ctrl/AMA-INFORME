const sqlite = require('better-sqlite3');
const db = new sqlite('database.sqlite');
const users = db.prepare('SELECT * FROM users').all();
console.log(JSON.stringify(users, null, 2));
