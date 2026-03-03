import express from "express";
import Database from "better-sqlite3";
import nodemailer from "nodemailer";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
    VerticalAlign,
    PageBreak,
    Header,
    Footer,
    TableBorders
} from "docx";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

dotenv.config();

// Vercel specific: use /tmp for SQLite as it's the only writable directory
// Note: This will NOT be persistent across restarts. We need a real DB for production.
const dbPath = process.env.VERCEL ? "/tmp/data.db" : "data.db";

// Copy initial DB if it exists in the project root to /tmp
if (process.env.VERCEL && fs.existsSync(path.join(process.cwd(), "data.db")) && !fs.existsSync(dbPath)) {
    fs.copyFileSync(path.join(process.cwd(), "data.db"), dbPath);
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Initialize database with all fields from the documents
db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'text',
    header_image TEXT,
    original_doc TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS form_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    field_id TEXT,
    label TEXT,
    type TEXT,
    required INTEGER DEFAULT 0,
    options TEXT,
    field_order INTEGER,
    help_text TEXT,
    validation TEXT,
    FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    user_id INTEGER,
    status TEXT DEFAULT 'borrador',
    submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    expedient_number TEXT,
    signature_metadata TEXT,
    data TEXT, 
    photos TEXT,
    email_to TEXT,
    modulo TEXT,
    FOREIGN KEY(template_id) REFERENCES templates(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    module TEXT,
    error_message TEXT,
    stack_trace TEXT,
    status TEXT DEFAULT 'pending',
    resolution TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_email TEXT,
    action TEXT,
    details TEXT
  );
`);

// Migrations
try { db.prepare("ALTER TABLE submissions ADD COLUMN sent_at DATETIME").run(); } catch (e) { }
try { db.prepare("ALTER TABLE submissions ADD COLUMN expedient_number TEXT").run(); } catch (e) { }
try { db.prepare("ALTER TABLE submissions ADD COLUMN signature_metadata TEXT").run(); } catch (e) { }
try { db.prepare("UPDATE submissions SET status = 'borrador' WHERE status IS NULL OR status = 'finalizado'").run(); } catch (e) { }
try { db.prepare("ALTER TABLE form_configs ADD COLUMN help_text TEXT").run(); } catch (e) { }
try { db.prepare("ALTER TABLE form_configs ADD COLUMN validation TEXT").run(); } catch (e) { }
try { db.prepare("ALTER TABLE templates ADD COLUMN header_image TEXT").run(); } catch (e) { }
try { db.prepare("ALTER TABLE templates ADD COLUMN original_doc TEXT").run(); } catch (e) { }

// Seed default config and templates if empty
const seedConfig = () => {
    const defaultConfig = {
        municipios: ['EL PASO', 'SANTA CRUZ DE LA PALMA', 'LOS LLANOS DE ARIDANE', 'FUENCALIENTE', 'TAZACORTE', 'GARAFÍA', 'PUNTAGORDA', 'TIJARAFE', 'VILLA DE MAZO', 'BREÑA BAJA', 'BREÑA ALTA', 'PUNTALLANA', 'SAN ANDRÉS Y SAUCES', 'BARLOVENTO'],
        provincias: ['SANTA CRUZ DE TENERIFE', 'LAS PALMAS'],
        especies: ['CUERVO (Corvus corax canariensis)', 'CERNÍCALO (Falco tinnunculus)', 'AGUILILLA (Buteo buteo)', 'GAVILÁN (Accipiter nisus)', 'HALCÓN TAGAROTE (Falco pelegrinoides)', 'LECHUZA (Tyto alba)', 'BÚHO CHICO (Asio otus)', 'PARDELA CENICIENTA (Calonectris diomedea)', 'PETREL DE BULWER (Bulweria bulwerii)', 'PAÍÑO COMÜN (Hydrobates pelagicus)', 'PALOMA RABICHE (Columba junoniae)', 'PALOMA TURQUÉ (Columba bollii)', 'GUINCHO (Pandion haliaetus)', 'OTRO'],
        envases: ['CAJA CARTÖN', 'BOLSA PLÁSTICO', 'RECIPIENTE CRISTAL', 'TUBO ENSAYO', 'NEVERA PORTÁTIL', 'OTRO'],
        transportes: ['MRW', 'SEUR', 'CORREOS', 'AGENTE PROPIO', 'OTRO'],
        suelos: ['Suelo Rústico de Protección Agraria', 'Suelo Rústico de Protección Paisajística', 'Suelo Rústico de Protección Natural', 'Suelo Rústico de Protección Cultural', 'Suelo Rústico de Protección de Infraestructuras', 'Suelo Urbano', 'Suelo Urbanizable'],
        espacios: ['NO', 'P.N. Caldera de Taburiente', 'P.N. Cumbre Vieja', 'P.N. de Las Nieves', 'R.N.I. del Pino de la Virgen', 'R.N.E. de la Laguna de Barlovento', 'M.N. de los Volcanes de Teneguía', 'M.N. de la Montaña de Azufre', 'P.P. de Tamanca', 'P.P. de El Remo', 'S.I.C. de las Salinas de Fuencaliente', 'OTRO'],
        admin_password: 'Fran002',
    };

    const check = db.prepare("SELECT COUNT(*) as count FROM config").get() as any;
    if (check.count === 0) {
        const stmt = db.prepare("INSERT INTO config (key, value) VALUES (?, ?)");
        Object.entries(defaultConfig).forEach(([key, value]) => {
            stmt.run(key, typeof value === 'string' ? value : JSON.stringify(value));
        });
    }

    db.prepare("DELETE FROM users WHERE email = 'Fran'").run();
    db.prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)").run('Fran', 'Fran002', 'admin');
};
seedConfig();

const app = express();
app.use(express.json({ limit: '50mb' }));

// Helper function to generate Word Document
async function generateWordDoc(data: any) {
    const templateId = data.template_id;
    const template = templateId ? db.prepare("SELECT * FROM templates WHERE id = ?").get(templateId) as any : null;

    if (template?.original_doc) {
        const base64Doc = template.original_doc.split(',')[1] || template.original_doc;
        const buffer = Buffer.from(base64Doc, 'base64');
        const zip = new PizZip(buffer);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '<', end: '>' } });
        doc.render(data);
        return doc.getZip().generate({ type: "nodebuffer" });
    }

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: "INFORME OFICIAL", heading: "Heading1" }),
                new Paragraph({ text: `Fecha: ${data.fecha || 'No especificada'}` })
            ]
        }]
    });
    return await Packer.toBuffer(doc);
}

// ── API ROUTES ──

app.get("/api/templates", (req, res) => {
    try {
        const templates = db.prepare("SELECT * FROM templates ORDER BY name ASC").all();
        res.json(templates);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/templates/:id/config", (req, res) => {
    try {
        const config = db.prepare("SELECT * FROM form_configs WHERE template_id = ? ORDER BY field_order").all(req.params.id);
        res.json(config);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/templates", (req, res) => {
    try {
        const { name, content, type, header_image, original_doc, fields } = req.body;
        const info = db.prepare("INSERT INTO templates (name, content, type, header_image, original_doc) VALUES (?, ?, ?, ?, ?)").run(name, content, type, header_image, original_doc);
        const templateId = info.lastInsertRowid;

        if (fields && Array.isArray(fields)) {
            const stmt = db.prepare("INSERT INTO form_configs (template_id, field_id, label, type, required, options, field_order, help_text, validation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            fields.forEach((f: any, i: number) => {
                stmt.run(templateId, f.id, f.label, f.type, f.required ? 1 : 0, f.options ? JSON.stringify(f.options) : null, i, f.help_text || null, f.validation || null);
            });
        }
        res.json({ success: true, id: templateId });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put("/api/templates/:id", (req, res) => {
    try {
        const { name, content, type, header_image, original_doc, fields } = req.body;
        db.prepare("UPDATE templates SET name = ?, content = ?, type = ?, header_image = ?, original_doc = ? WHERE id = ?").run(name, content, type, header_image, original_doc, req.params.id);

        db.prepare("DELETE FROM form_configs WHERE template_id = ?").run(req.params.id);
        if (fields && Array.isArray(fields)) {
            const stmt = db.prepare("INSERT INTO form_configs (template_id, field_id, label, type, required, options, field_order, help_text, validation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            fields.forEach((f: any, i: number) => {
                stmt.run(req.params.id, f.id, f.label, f.type, f.required ? 1 : 0, f.options ? JSON.stringify(f.options) : null, i, f.help_text || null, f.validation || null);
            });
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete("/api/templates/:id", (req, res) => {
    try {
        const { password } = req.body;
        const config = db.prepare("SELECT value FROM config WHERE key = 'admin_password'").get() as any;
        if (password !== config.value) {
            return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
        }
        db.prepare("DELETE FROM templates WHERE id = ?").run(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
    if (user) {
        db.prepare("INSERT INTO audit_logs (user_email, action, details) VALUES (?, ?, ?)").run(email, 'LOGIN', 'Inicio de sesión exitoso');
        res.json({ success: true, user: { email: user.email, role: user.role } });
    } else {
        res.status(401).json({ success: false, message: "Credenciales inválidas" });
    }
});

app.get("/api/users", (req, res) => {
    try {
        const users = db.prepare("SELECT id, email, role FROM users").all();
        res.json(users);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/users", (req, res) => {
    try {
        const { email, password, role } = req.body;
        db.prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)").run(email, password, role);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/users/:id", (req, res) => {
    try {
        db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/submissions-dynamic", (req, res) => {
    try {
        const subs = db.prepare(`
            SELECT s.*, t.name as template_name, u.email as user_email 
            FROM submissions s 
            LEFT JOIN templates t ON s.template_id = t.id 
            LEFT JOIN users u ON s.user_id = u.id
            ORDER BY s.submission_date DESC
        `).all();
        res.json(subs);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/submissions/:id", (req, res) => {
    try {
        db.prepare("DELETE FROM submissions WHERE id = ?").run(req.params.id);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/audit", (req, res) => {
    try {
        const logs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100").all();
        res.json(logs);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/error-logs", (req, res) => {
    try {
        const logs = db.prepare("SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 50").all();
        res.json(logs);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/system/health", (req, res) => {
    res.json({ status: 'ok', issues: [] });
});

app.post("/api/submit-dynamic", async (req, res) => {
    try {
        const { template_id, user_email, status, expedient_number, data, photos, email_to, modulo } = req.body;
        const user = db.prepare("SELECT id FROM users WHERE email = ?").get(user_email) as any;
        const userId = user?.id || null;

        const info = db.prepare("INSERT INTO submissions (template_id, user_id, status, expedient_number, data, photos, email_to, modulo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
            template_id, userId, status, expedient_number, JSON.stringify(data), JSON.stringify(photos), email_to, modulo
        );

        res.json({ success: true, id: info.lastInsertRowid });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post("/api/system/fix", (req, res) => {
    const { issueId } = req.body;
    db.prepare("INSERT INTO audit_logs (user_email, action, details) VALUES (?, ?, ?)").run('System', 'FIX', `Intento de corrección para issue ${issueId}`);
    res.json({ success: true });
});

app.post("/api/preview", async (req, res) => {
    try {
        const buffer = await generateWordDoc(req.body);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default app;
