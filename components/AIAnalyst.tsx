import React, { useState } from 'react';
import { askAI } from '../services/api';
import { Bot, Send, Loader2, Sparkles, Terminal } from 'lucide-react';
import { parse } from 'marked';

export const AIAnalyst: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const predefinedQueries = [
    "Resumen de los riesgos de prioridad alta",
    "¿Cuáles son los últimos incidentes de ransomware?",
    "Lista de alertas críticas recientes",
    "¿Hay vulnerabilidades Zero-Day activas?"
  ];

  const handleSearch = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setResponse('');
    try {
      const result = await askAI(text);
      setResponse(result.response);
    } catch (error: any) {
      setResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-tr from-purple-600 to-indigo-600 p-2 rounded-lg shadow-md">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Analista de Ciberseguridad IA</h2>
            <p className="text-sm text-gray-500">Consulta el estado de tu seguridad utilizando lenguaje natural</p>
          </div>
        </div>

        {/* Input Area */}
        <div className="relative mb-6">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pregunta sobre incidentes, riesgos o vulnerabilidades..."
            className="w-full p-4 pr-14 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] resize-none text-gray-700 bg-gray-50 focus:bg-white transition-colors"
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSearch(query);
                }
            }}
          />
          <button
            onClick={() => handleSearch(query)}
            disabled={loading || !query.trim()}
            className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-8">
          {predefinedQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => { setQuery(q); handleSearch(q); }}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-600 text-xs rounded-full transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              {q}
            </button>
          ))}
        </div>

        {/* Response Area */}
        {response && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 mb-2 text-gray-700 font-semibold text-sm">
                    <Terminal className="w-4 h-4 text-purple-600" />
                    Respuesta del Analista
                </div>
                <div 
                    className="prose prose-sm prose-indigo max-w-none bg-slate-50 border border-slate-200 p-6 rounded-xl shadow-inner font-sans text-slate-800"
                    dangerouslySetInnerHTML={{ __html: parse(response) as string }}
                />
            </div>
        )}
        
        {!response && !loading && (
             <div className="text-center py-12 text-gray-400">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>La IA analizará tus datos de MongoDB para responder.</p>
             </div>
        )}
      </div>
    </div>
  );
};