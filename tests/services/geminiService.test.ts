import { describe, it, expect, beforeAll, vi } from 'vitest';

// These tests exercise the "AI not configured" fallback paths, which are the
// deterministic, side-effect-free behaviours of the service. With no API key
// available, getAI() returns null and every exported function must degrade
// gracefully instead of throwing.
type GeminiService = typeof import('@/src/services/geminiService');
let service: GeminiService;

beforeAll(async () => {
  // Ensure no key is picked up from the environment when the module initialises.
  delete process.env.GEMINI_API_KEY;
  vi.stubEnv('VITE_GEMINI_API_KEY', '');
  service = await import('@/src/services/geminiService');
});

describe('geminiService without an API key', () => {
  it('improveText returns the original text unchanged', async () => {
    const input = 'Nota de campo sin procesar';
    await expect(service.improveText(input)).resolves.toBe(input);
  });

  it('improveText returns empty/whitespace input without touching the API', async () => {
    await expect(service.improveText('')).resolves.toBe('');
    await expect(service.improveText('   ')).resolves.toBe('   ');
  });

  it('askAi reports that the AI is not configured', async () => {
    await expect(service.askAi('¿Qué especie es?', 'contexto')).resolves.toBe(
      'IA no configurada.'
    );
  });

  it('analyzeImage returns an empty object', async () => {
    await expect(
      service.analyzeImage('data:image/jpeg;base64,AAAA')
    ).resolves.toEqual({});
  });

  it('exposes the expected public functions', () => {
    expect(typeof service.improveText).toBe('function');
    expect(typeof service.askAi).toBe('function');
    expect(typeof service.analyzeImage).toBe('function');
  });
});
