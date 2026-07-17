import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// Mock the Gemini SDK so we can drive the "AI is configured" branches of the
// service deterministically, without any network access.
const generateContent = vi.fn();
const getGenerativeModel = vi.fn(() => ({ generateContent }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({ getGenerativeModel })),
}));

const okResponse = (text: string) => ({ response: { text: () => text } });

type GeminiService = typeof import('@/src/services/geminiService');
let service: GeminiService;

beforeAll(async () => {
  // getAI() reads the key at import time, so it must be set before importing.
  process.env.GEMINI_API_KEY = 'test-key';
  service = await import('@/src/services/geminiService');
});

beforeEach(() => {
  generateContent.mockReset();
});

describe('improveText with a configured client', () => {
  it('returns the model-improved text', async () => {
    generateContent.mockResolvedValue(okResponse('Texto mejorado y profesional.'));
    const result = await service.improveText('nota');
    expect(result).toBe('Texto mejorado y profesional.');
    expect(generateContent).toHaveBeenCalledOnce();
    // The original note is embedded into the prompt.
    expect(String(generateContent.mock.calls[0][0])).toContain('nota');
  });

  it('falls back to the original text when the model returns nothing', async () => {
    generateContent.mockResolvedValue(okResponse(''));
    expect(await service.improveText('nota')).toBe('nota');
  });

  it('returns the original text when the API throws', async () => {
    generateContent.mockRejectedValue(new Error('boom'));
    expect(await service.improveText('nota')).toBe('nota');
  });

  it('short-circuits blank input without calling the API', async () => {
    expect(await service.improveText('   ')).toBe('   ');
    expect(generateContent).not.toHaveBeenCalled();
  });
});

describe('askAi with a configured client', () => {
  it('returns the model answer', async () => {
    generateContent.mockResolvedValue(okResponse('Respuesta técnica.'));
    expect(await service.askAi('pregunta', 'contexto')).toBe('Respuesta técnica.');
  });

  it('returns a default message when the model returns nothing', async () => {
    generateContent.mockResolvedValue(okResponse(''));
    expect(await service.askAi('pregunta', 'contexto')).toBe(
      'No se pudo obtener una respuesta.'
    );
  });

  it('returns an error message when the API throws', async () => {
    generateContent.mockRejectedValue(new Error('boom'));
    expect(await service.askAi('pregunta', 'contexto')).toBe(
      'Error al consultar a la IA.'
    );
  });
});

describe('analyzeImage with a configured client', () => {
  it('parses a plain JSON response', async () => {
    generateContent.mockResolvedValue(
      okResponse('{"especie":"CUERVO","clima":"soleado","entorno":"monte","observaciones":"ok"}')
    );
    const result = await service.analyzeImage('data:image/jpeg;base64,AAAA');
    expect(result).toEqual({
      especie: 'CUERVO',
      clima: 'soleado',
      entorno: 'monte',
      observaciones: 'ok',
    });
  });

  it('strips markdown code fences before parsing', async () => {
    generateContent.mockResolvedValue(
      okResponse('```json\n{"especie":"LECHUZA"}\n```')
    );
    const result = await service.analyzeImage('data:image/jpeg;base64,AAAA');
    expect(result).toEqual({ especie: 'LECHUZA' });
  });

  it('returns an empty object for empty model output', async () => {
    generateContent.mockResolvedValue(okResponse(''));
    expect(await service.analyzeImage('data:image/jpeg;base64,AAAA')).toEqual({});
  });

  it('returns an empty object when the response is not valid JSON', async () => {
    generateContent.mockResolvedValue(okResponse('no soy json'));
    expect(await service.analyzeImage('data:image/jpeg;base64,AAAA')).toEqual({});
  });

  it('returns an empty object when the API throws', async () => {
    generateContent.mockRejectedValue(new Error('boom'));
    expect(await service.analyzeImage('data:image/jpeg;base64,AAAA')).toEqual({});
  });
});
