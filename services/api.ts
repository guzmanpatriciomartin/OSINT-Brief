
import { NewsItem, RiskTicket, RssFeedConfig } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const API_BASE_URL = '/api';

// Inicialización de la IA siguiendo las guías de @google/genai
const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY) as string;
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

let authToken: string | null = localStorage.getItem('authToken');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
}

const handleResponse = async (response: Response): Promise<ApiResponse> => {
  try {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    if (response.status === 401 || response.status === 403) setAuthToken(null);
    if (isJson) {
      const data = await response.json();
      return { success: response.ok, data: data.data || data, message: data.message };
    }
    return { success: response.ok, data: null };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const fetchResource = async <T>(endpoint: string): Promise<T[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, { headers: getAuthHeaders() });
    const result = await handleResponse(response);
    return result.success ? (result.data as T[]) : [];
  } catch { return []; }
};

export const createResource = async <T>(endpoint: string, data: T): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (e: any) { return { success: false, message: e.message }; }
};

export const updateResource = async <T>(endpoint: string, id: string, data: T): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  } catch (e: any) { return { success: false, message: e.message }; }
};

export const deleteResource = async (endpoint: string, id: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders(), 'Accept': 'application/json' }
    });
    if (response.status === 204) return { success: true };
    return handleResponse(response);
  } catch (e: any) { return { success: false, message: e.message }; }
};

export const fetchRssFeeds = async (): Promise<RssFeedConfig[]> => fetchResource<RssFeedConfig>('rss-feeds');
export const saveRssFeed = async (feed: RssFeedConfig): Promise<ApiResponse> => createResource('rss-feeds', feed);
export const deleteRssFeed = async (id: string): Promise<ApiResponse> => deleteResource('rss-feeds', id);
export const fetchDigest = async (days: number): Promise<NewsItem[]> => fetchResource<NewsItem>(`digest?days=${days}`);

// --- IA LOGIC ---

export const getAIBriefing = async (newsItems: NewsItem[]): Promise<string> => {
  if (!ai) return "IA no configurada (API Key faltante).";
  const newsContent = newsItems.slice(0, 15).map(item => `- [${item.feedTitle}] ${item.title}: ${item.description?.substring(0, 150)}`).join('\n');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Resume estas noticias CTI en un informe ejecutivo estratégico. Usa markdown:\n\n${newsContent}`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  return response.text || "No summary available.";
};

export const performAITriage = async (url: string, newsItem?: NewsItem): Promise<{ type: string; data: any }> => {
  if (!ai) throw new Error("IA no configurada (API Key faltante).");
  // 1. SCRAPING STEP
  let scrapedContent = "";
  try {
    const scrapeRes = await fetch(`${API_BASE_URL}/scrape`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ url })
    });
    const scrapeData = await scrapeRes.json();
    scrapedContent = scrapeData.content || "";
  } catch (e) {
    console.warn("Scraping failed, falling back to basic context");
  }

  const context = `Contexto Base (RSS): ${newsItem?.title || ''}. ${newsItem?.description || ''}\n\nContenido Real de la Web (Full Text Scraped):\n${scrapedContent.substring(0, 8000)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analiza este texto de ciberseguridad y extrae un objeto JSON estructurado que encaje perfectamente con nuestros modelos de base de datos.
    
    URL de origen: ${url}
    
    Información a procesar:
    ${context}`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { 
            type: Type.STRING, 
            description: "Tipo de entidad detectada: incidente, exploit, zeroday, cve, alerta, fuente, mitigacion" 
          },
          data: {
            type: Type.OBJECT,
            description: "Objeto de datos mapeado exactamente al esquema de Mongoose correspondiente",
            properties: {
              // Campos comunes en varios esquemas
              fecha: { type: Type.STRING, description: "Fecha del evento (formato YYYY-MM-DD)" },
              url: { type: Type.STRING, description: "URL original de la fuente" },
              descripcion: { type: Type.STRING, description: "Descripción detallada del hallazgo" },
              
              // Específicos de Incidente
              tipo: { type: Type.STRING, description: "Categoría de incidente (e.g., DataBreach, Ransomware)" },
              entidad: { type: Type.STRING, description: "Organización o entidad afectada" },
              pais: { type: Type.STRING, description: "País afectado" },
              sector: { type: Type.STRING, description: "Sector industrial afectado" },
              datosComprometidos: { type: Type.STRING, description: "Información filtrada o comprometida" },
              actor: { type: Type.STRING, description: "Grupo de amenaza o actor responsable" },
              
              // Específicos de Exploit
              nombre: { type: Type.STRING, description: "Nombre del exploit o vulnerabilidad" },
              plataforma: { type: Type.STRING, description: "Software o sistema afectado" },
              cve: { type: Type.STRING, description: "CVE asociado (e.g., CVE-2023-1234)" },
              
              // Específicos de ZeroDay
              idZD: { type: Type.STRING, description: "Identificador interno de Zero Day si aplica" },
              cvss: { type: Type.NUMBER, description: "Puntuación de severidad 0-10" },
              estado: { type: Type.STRING, description: "Estado actual (e.g., Activo, Parcheado)" },
              
              // Específicos de Alerta
              titulo: { type: Type.STRING, description: "Título descriptivo" },
              criticidad: { type: Type.STRING, description: "Nivel: Informacional, Baja, Media, Alta, Critica" },
              
              // Específicos de Mitigacion
              categoria: { type: Type.STRING, description: "Categoría de defensa (e.g., Parches, Configuración)" },
              prioridad: { type: Type.STRING, description: "Prioridad: Baja, Media, Alta" },
              
              // Específicos de CVE
              cveId: { type: Type.STRING, description: "Identificador CVE (formato CVE-YYYY-NNNNN)" },
              aplicativo: { type: Type.STRING, description: "Aplicación o vendor afectado" },
              
              // Específicos de Fuente
              // (Reutiliza 'nombre' y 'tipo' arriba)
            }
          }
        },
        required: ["type", "data"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const generateCtiReport = async (cveId: string): Promise<{ html: string; markdown: string }> => {
  const res = await fetch(`${API_BASE_URL}/generate-cti`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ cveId })
  });
  const result = await handleResponse(res);
  if (result.success) return result.data;
  throw new Error(result.message || "Error al generar el reporte CTI");
};

export const fetchTickets = async (): Promise<RiskTicket[]> => fetchResource<RiskTicket>('riesgos');

export const saveTicket = async (ticket: RiskTicket): Promise<ApiResponse> => {
  if (ticket.id) return updateResource('riesgos', String(ticket.id), ticket);
  else return createResource('riesgos', ticket);
};

export const deleteTicket = async (id: string | number): Promise<ApiResponse> => deleteResource('riesgos', String(id));

export const addTicketComment = async (ticketId: string | number, text: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/riesgos/${ticketId}`, { headers: getAuthHeaders() });
    const result = await handleResponse(response);
    if (!result.success) return result;
    
    const ticket = result.data as RiskTicket;
    const updatedActivity = [...(ticket.activity || []), { 
      type: 'comment' as const, 
      timestamp: Date.now(), 
      text: text 
    }];
    return updateResource('riesgos', String(ticketId), { ...ticket, activity: updatedActivity });
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export const askAI = async (query: string): Promise<{ response: string }> => {
  const res = await fetch(`${API_BASE_URL}/ai/analyze`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ query })
  });
  const result = await handleResponse(res);
  return result.success ? result.data : { response: "Error AI" };
};
