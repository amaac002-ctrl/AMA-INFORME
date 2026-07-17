import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Express } from 'express';

// api/index.ts creates a SQLite database named "data.db" relative to the
// current working directory and seeds it on import. To keep the suite hermetic
// we switch into a throwaway temp directory before importing the module so the
// test database never touches the repository.
let app: Express;
let tmpDir: string;
let originalCwd: string;

const ADMIN_PASSWORD = 'Fran002';

beforeAll(async () => {
  originalCwd = process.cwd();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ama-api-test-'));
  process.chdir(tmpDir);
  const mod = await import('@/api/index');
  app = mod.default;
});

afterAll(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('GET /api/system/health', () => {
  it('reports a healthy status', async () => {
    const res = await request(app).get('/api/system/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', issues: [] });
  });
});

describe('POST /api/login', () => {
  it('authenticates the seeded admin user', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'Fran', password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toEqual({ email: 'Fran', role: 'admin' });
  });

  it('rejects invalid credentials with 401', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'Fran', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Credenciales inválidas');
  });

  it('records an audit log entry on successful login', async () => {
    await request(app)
      .post('/api/login')
      .send({ email: 'Fran', password: ADMIN_PASSWORD });
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(200);
    const loginEntries = res.body.filter((l: any) => l.action === 'LOGIN');
    expect(loginEntries.length).toBeGreaterThan(0);
  });
});

describe('templates CRUD', () => {
  it('creates a template with form fields and reads its config back', async () => {
    const create = await request(app)
      .post('/api/templates')
      .send({
        name: 'Plantilla de prueba',
        content: 'contenido',
        type: 'text',
        fields: [
          { id: 'especie', label: 'Especie', type: 'select', required: true, options: ['A', 'B'] },
          { id: 'notas', label: 'Notas', type: 'text', required: false },
        ],
      });
    expect(create.status).toBe(200);
    expect(create.body.success).toBe(true);
    const id = create.body.id;
    expect(id).toBeTruthy();

    const list = await request(app).get('/api/templates');
    expect(list.status).toBe(200);
    expect(list.body.some((t: any) => t.id === id)).toBe(true);

    const config = await request(app).get(`/api/templates/${id}/config`);
    expect(config.status).toBe(200);
    expect(config.body).toHaveLength(2);
    // field_order should be preserved.
    expect(config.body[0].field_id).toBe('especie');
    expect(config.body[0].required).toBe(1);
    expect(JSON.parse(config.body[0].options)).toEqual(['A', 'B']);
    expect(config.body[1].field_id).toBe('notas');
    expect(config.body[1].required).toBe(0);
  });

  it('updates a template and replaces its field config', async () => {
    const create = await request(app)
      .post('/api/templates')
      .send({ name: 'Original', fields: [{ id: 'a', label: 'A', type: 'text' }] });
    const id = create.body.id;

    const update = await request(app)
      .put(`/api/templates/${id}`)
      .send({ name: 'Actualizada', fields: [{ id: 'b', label: 'B', type: 'text' }] });
    expect(update.status).toBe(200);
    expect(update.body.success).toBe(true);

    const config = await request(app).get(`/api/templates/${id}/config`);
    expect(config.body).toHaveLength(1);
    expect(config.body[0].field_id).toBe('b');
  });

  it('refuses to delete a template with a wrong admin password', async () => {
    const create = await request(app).post('/api/templates').send({ name: 'Borrable' });
    const id = create.body.id;
    const res = await request(app)
      .delete(`/api/templates/${id}`)
      .send({ password: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);

    const list = await request(app).get('/api/templates');
    expect(list.body.some((t: any) => t.id === id)).toBe(true);
  });

  it('deletes a template with the correct admin password', async () => {
    const create = await request(app).post('/api/templates').send({ name: 'Borrable OK' });
    const id = create.body.id;
    const res = await request(app)
      .delete(`/api/templates/${id}`)
      .send({ password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const list = await request(app).get('/api/templates');
    expect(list.body.some((t: any) => t.id === id)).toBe(false);
  });
});

describe('users CRUD', () => {
  it('lists users including the seeded admin', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body.some((u: any) => u.email === 'Fran' && u.role === 'admin')).toBe(true);
  });

  it('creates and then deletes a user', async () => {
    const create = await request(app)
      .post('/api/users')
      .send({ email: 'agente@example.com', password: 'secret', role: 'user' });
    expect(create.status).toBe(200);
    expect(create.body.success).toBe(true);

    let list = await request(app).get('/api/users');
    const created = list.body.find((u: any) => u.email === 'agente@example.com');
    expect(created).toBeTruthy();

    const del = await request(app).delete(`/api/users/${created.id}`);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);

    list = await request(app).get('/api/users');
    expect(list.body.some((u: any) => u.email === 'agente@example.com')).toBe(false);
  });

  it('returns 500 when creating a user with a duplicate email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'Fran', password: 'x', role: 'user' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBeTruthy();
  });
});

describe('submissions', () => {
  it('stores a dynamic submission and returns it with joined names', async () => {
    const tpl = await request(app).post('/api/templates').send({ name: 'Para envío' });
    const templateId = tpl.body.id;

    const submit = await request(app)
      .post('/api/submit-dynamic')
      .send({
        template_id: templateId,
        user_email: 'Fran',
        status: 'borrador',
        expedient_number: 'EXP-1',
        data: { especie: 'CUERVO' },
        photos: ['data:image/jpeg;base64,AAAA'],
        email_to: 'destino@example.com',
        modulo: 'fauna',
      });
    expect(submit.status).toBe(200);
    expect(submit.body.success).toBe(true);
    const submissionId = submit.body.id;

    const list = await request(app).get('/api/submissions-dynamic');
    expect(list.status).toBe(200);
    const found = list.body.find((s: any) => s.id === submissionId);
    expect(found).toBeTruthy();
    expect(found.template_name).toBe('Para envío');
    expect(found.user_email).toBe('Fran');
    expect(JSON.parse(found.data)).toEqual({ especie: 'CUERVO' });
  });

  it('deletes a single submission by id', async () => {
    const submit = await request(app)
      .post('/api/submit-dynamic')
      .send({ user_email: 'Fran', status: 'borrador', data: {}, photos: [] });
    const id = submit.body.id;
    const del = await request(app).delete(`/api/submissions/${id}`);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
  });

  it('refuses to bulk-delete submissions without the admin password', async () => {
    const res = await request(app).delete('/api/submissions').send({ password: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('bulk-deletes submissions with the correct admin password', async () => {
    await request(app)
      .post('/api/submit-dynamic')
      .send({ user_email: 'Fran', status: 'borrador', data: {}, photos: [] });
    const res = await request(app)
      .delete('/api/submissions')
      .send({ password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const list = await request(app).get('/api/submissions-dynamic');
    expect(list.body).toHaveLength(0);
  });
});

describe('logs and system endpoints', () => {
  it('returns error logs as an array', async () => {
    const res = await request(app).get('/api/error-logs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('records an audit entry when fixing a system issue', async () => {
    const res = await request(app).post('/api/system/fix').send({ issueId: 42 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const audit = await request(app).get('/api/audit');
    expect(
      audit.body.some((l: any) => l.action === 'FIX' && l.details.includes('42'))
    ).toBe(true);
  });
});

describe('POST /api/preview', () => {
  it('generates a Word document buffer for a submission without a template', async () => {
    const res = await request(app)
      .post('/api/preview')
      .send({ fecha: '2026-01-01' })
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBeGreaterThan(0);
    // .docx files are zip archives starting with the "PK" magic bytes.
    expect(res.body.subarray(0, 2).toString('latin1')).toBe('PK');
  });
});
