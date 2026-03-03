import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process.env as any).GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("ADVERTENCIA: No se ha configurado la clave GEMINI_API_KEY. Las funciones de IA estarán desactivadas.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const ai = getAI();

export async function improveText(text: string): Promise<string> {
  if (!text.trim() || !ai) return text;

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(`Eres un experto Agente de Medio Ambiente. Mejora, DETALLA y profesionaliza la siguiente nota de campo para un informe oficial. 
             Expande el texto para que sea una descripción técnica formal y detallada (mínimo 2-3 frases), utilizando terminología técnica medioambiental. 
             No inventes hechos externos, pero redacta con precisión lo indicado.
             Responde SOLO con el texto mejorado:
             
             "${text}"`);

    const response = await result.response;
    return response.text() || text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return text;
  }
}

export async function askAi(question: string, context: string): Promise<string> {
  if (!ai) return "IA no configurada.";
  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(`Asistente para Agentes de Medio Ambiente. Contexto: ${context}. Pregunta: ${question}. Responde de forma técnica y detallada.`);
    const response = await result.response;
    return response.text() || "No se pudo obtener una respuesta.";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Error al consultar a la IA.";
  }
}

export async function analyzeImage(base64Image: string): Promise<any> {
  if (!ai) return {};
  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image.split(',')[1],
        },
      },
      {
        text: `Analiza esta imagen tomada por un Agente de Medio Ambiente en una intervención de campo. 
              Identifica:
              1. Especie animal u objeto principal (si hay veneno, cebos, etc).
              2. Climatología observable (sol, nubes, lluvia, etc).
              3. Elementos del entorno relevantes.
              
              Responde estrictamente en formato JSON con las siguientes claves:
              {
                "especie": "nombre de la especie u objeto",
                "clima": "descripción del clima",
                "entorno": "descripción del entorno",
                "observaciones": "breve descripción de lo que se ve"
              }`
      },
    ]);

    const response = await result.response;
    const text = response.text();
    // Limpiar posibles bloques de código markdown injectados por la IA
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr || "{}");
  } catch (error) {
    console.error("Error analyzing image:", error);
    return {};
  }
}
