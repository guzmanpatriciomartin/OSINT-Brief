
import React, { useState, useEffect } from 'react';
import { fetchDigest } from '../services/api';
import { NewsItem } from '../types';
import { Zap, RefreshCw, AlertTriangle, ShieldAlert, ExternalLink, Calendar, PlusCircle, Loader2 } from 'lucide-react';

interface DigestTabProps {
  onCreateRisk: (newsItem: NewsItem) => void;
}

export const DigestTab: React.FC<DigestTabProps> = ({ onCreateRisk }) => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical'>('all');

  const loadDigest = async () => {
    setLoading(true);
    try {
      const data = await fetchDigest(3); // Últimos 3 días para el digest rápido
      setItems(data);
    } catch (error) {
      console.error("Error loading digest", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDigest();
  }, []);

  const isCritical = (title: string, desc: string) => {
    const keywords = ['ransomware', 'critical', 'zero-day', '0-day', 'exploit', 'breach', 'attack'];
    const content = (title + ' ' + desc).toLowerCase();
    return keywords.some(k => content.includes(k));
  };

  const filteredItems = filter === 'critical' 
    ? items.filter(i => isCritical(i.title, i.description || ''))
    : items;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
          <h2 className="text-xl font-bold text-gray-800">Intelligence Digest</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-1 flex shadow-sm">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Todo
            </button>
            <button 
              onClick={() => setFilter('critical')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filter === 'critical' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Crítico
            </button>
          </div>
          <button 
            onClick={loadDigest}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Sincronizando fuentes globales...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron noticias relevantes en las últimas 72 horas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item, idx) => {
            const critical = isCritical(item.title, item.description || '');
            return (
              <div 
                key={idx} 
                className={`group bg-white rounded-xl border-2 transition-all hover:shadow-lg flex flex-col ${critical ? 'border-red-100 hover:border-red-200' : 'border-gray-100 hover:border-indigo-100'}`}
              >
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${critical ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {item.feedTitle}
                    </span>
                    {critical && <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />}
                  </div>
                  <h3 className="font-bold text-gray-900 leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {item.description?.replace(/<[^>]*>?/gm, '') || 'Sin descripción disponible.'}
                  </p>
                </div>
                <div className="px-5 py-3 bg-gray-50 rounded-b-xl border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(item.pubDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                      title="Abrir fuente"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button 
                      onClick={() => onCreateRisk(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Riesgo
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
