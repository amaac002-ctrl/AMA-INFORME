
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

try {
    const info = db.prepare('DELETE FROM submissions').run();
    console.log(`Eliminados ${info.changes} informes correctamente.`);
} catch (e) {
    console.error('Error al borrar los informes:', e.message);
} finally {
    db.close();
}
