import express from "express";
import { createServer as createViteServer } from "vite";
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
  AlignmentType,
  VerticalAlign,
} from "docx";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

dotenv.config();

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

const app = express();
app.use(express.json({ limit: '50mb' }));

// Helper function to generate Word Document
async function generateWordDoc(data: any, photos: string[] | null) {
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

// API Routes
app.get("/api/templates", (req, res) => {
  const templates = db.prepare("SELECT * FROM templates").all();
  res.json(templates);
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
  if (user) {
    res.json({ success: true, user: { email: user.email, role: user.role } });
  } else {
    res.status(401).json({ success: false, message: "Credenciales inválidas" });
  }
});

// Final handler to serve frontend
if (!process.env.VERCEL) {
  app.listen(3000, () => console.log("Server local running on port 3000"));
}

export default app;
