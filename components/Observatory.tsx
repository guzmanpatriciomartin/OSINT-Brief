

import React, { useState, useEffect } from 'react';
import { fetchDigest, fetchRssFeeds, saveRssFeed, deleteRssFeed } from '../services/api';
import { NewsItem, RssFeedConfig } from '../types';
import { Newspaper, Loader2, ExternalLink, ShieldAlert, CheckCircle, EyeOff, Inbox, History, RotateCcw, Settings, Plus, Trash2, X, Rss, Radio } from 'lucide-react';

interface ObservatoryProps {
  onCreateRisk: (newsItem: NewsItem) => void;
}

const READ_NEWS_STORAGE_KEY = 'readNewsIds_v1';

export const Observatory: React.FC<ObservatoryProps> = ({ onCreateRisk }) => {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [readNewsIds, setReadNewsIds] = useState<Set<string>>(new Set());
  
  // Nuevo estado para manejar las pestañas
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');

  // Estado para gestión de Feeds
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [feeds, setFeeds] = useState<RssFeedConfig[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [newFeedTitle, setNewFeedTitle] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(READ_NEWS_STORAGE_KEY);
    if (stored) {
      try {
        setReadNewsIds(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error("Error loading read news", e);
      }
    }
  }, []);

  const markAsRead = (link: string) => {
    const newSet = new Set(readNewsIds);
    newSet.add(link);
    setReadNewsIds(newSet);
    localStorage.setItem(READ_NEWS_STORAGE_KEY, JSON.stringify(Array.from(newSet)));
  };

  const markAsUnread = (link: string) => {
    const newSet = new Set(readNewsIds);
    newSet.delete(link);
    setReadNewsIds(newSet);
    localStorage.setItem(READ_NEWS_STORAGE_KEY, JSON.stringify(Array.from(newSet)));
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await fetchDigest(days);
      setNews(data);
      // Al generar nuevo, volver a la pestaña de no leídos si hay resultados
      if (data.length > 0) setActiveTab('unread');
    } catch (error) {
      console.error("Failed to fetch digest", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = (item: NewsItem) => {
    markAsRead(item.link);
    onCreateRisk(item);
    setSelectedNews(null);
  };

  const handleToggleReadStatus = (link: string, currentStatusIsRead: boolean) => {
    if (currentStatusIsRead) {
        markAsUnread(link);
    } else {
        markAsRead(link);
    }
    setSelectedNews(null);
  };

  // --- Feed Management Logic ---

  const loadFeeds = async () => {
    setLoadingFeeds(true);
    const data = await fetchRssFeeds();
    setFeeds(data);
    setLoadingFeeds(false);
  };

  const handleOpenConfig = () => {
    setIsConfigModalOpen(true);
    loadFeeds();
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedTitle || !newFeedUrl) return;
    
    const res = await saveRssFeed({ title: newFeedTitle, url: newFeedUrl });
    if (res.success) {
        setNewFeedTitle('');
        setNewFeedUrl('');
        loadFeeds();
    } else {
        alert("Error al guardar el feed");
    }
  };

  const handleDeleteFeed = async (id: string) => {
    if (confirm("¿Eliminar este feed?")) {
        const res = await deleteRssFeed(id);
        if (res.success) {
            loadFeeds();
        } else {
            alert("Error al eliminar");
        }
    }
  };


  // Filtrado de noticias según la pestaña activa
  const unreadNews = news.filter(item => !readNewsIds.has(item.link));
  const readNews = news.filter(item => readNewsIds.has(item.link));
  
  const displayedNews = activeTab === 'unread' ? unreadNews : readNews;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-purple-600" />
                Observatorio de Ciberseguridad
            </h2>
            <button 
                onClick={handleOpenConfig}
                className="text-gray-500 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
            >
                <Settings className="w-4 h-4" /> Configurar Feeds
            </button>
        </div>
        
        {/* Controles de Generación */}
        <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-gray-600">Buscar noticias de los últimos (días)</label>
            <input 
              type="number" 
              value={days} 
              onChange={(e) => setDays(parseInt(e.target.value))}
              min={1} 
              max={30}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
          </div>
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Radio className="w-4 h-4"/> Generar Digest RSS</>}
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-gray-200 mb-4">
            <button
                onClick={() => setActiveTab('unread')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'unread' 
                    ? 'border-purple-600 text-purple-600 bg-purple-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
                <Inbox className="w-4 h-4" />
                No Leídas
                <span className="ml-1 bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs">
                    {unreadNews.length}
                </span>
            </button>
            <button
                onClick={() => setActiveTab('read')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'read' 
                    ? 'border-purple-600 text-purple-600 bg-purple-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
                <History className="w-4 h-4" />
                Leídas / Historial
                <span className="ml-1 bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs">
                    {readNews.length}
                </span>
            </button>
        </div>

        {/* Tabla de Resultados */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-600 text-sm uppercase">
                <th className="py-3 px-4 w-1/6">Fuente</th>
                <th className="py-3 px-4 w-3/6">Título</th>
                <th className="py-3 px-4 w-1/6">Publicado</th>
                <th className="py-3 px-4 w-1/6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {loading && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col justify-center items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                      <p>Analizando fuentes RSS en el servidor...</p>
                    </div>
                  </td>
                </tr>
              )}
              
              {!loading && news.length === 0 && (
                 <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500">
                        Haz clic en <strong>"Generar Digest RSS"</strong> para obtener las últimas noticias de tus feeds configurados.
                    </td>
                 </tr>
              )}

              {!loading && news.length > 0 && displayedNews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    {activeTab === 'unread' 
                        ? "¡Todo al día! No tienes noticias sin leer." 
                        : "No hay noticias en el historial de leídos."}
                  </td>
                </tr>
              ) : (
                !loading && displayedNews.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                    <td className="py-3 px-4">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded text-xs font-semibold">
                            {item.feedTitle}
                        </span>
                    </td>
                    <td className="py-3 px-4">
                      <a href={item.link} target="_blank" rel="noreferrer" className="font-medium text-gray-800 group-hover:text-purple-600 transition-colors block mb-1">
                        {item.title}
                      </a>
                      <p className="text-xs text-gray-500 line-clamp-1">{item.description?.replace(/<[^>]*>?/gm, '')}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-500">
                      {new Date(item.pubDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => setSelectedNews(item)}
                        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-1.5 px-3 rounded text-xs font-medium transition-colors shadow-sm"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2 leading-snug">{selectedNews.title}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 border-b border-gray-100 pb-4">
                <span className="font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded">{selectedNews.feedTitle}</span>
                <span className="flex items-center gap-1"><History className="w-3 h-3" /> {new Date(selectedNews.pubDate).toLocaleString()}</span>
              </div>
              
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 text-gray-700 mb-6 text-sm leading-relaxed max-h-80 overflow-y-auto">
                {selectedNews.description || "No hay descripción disponible."}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <a 
                  href={selectedNews.link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-4 h-4" /> Leer artículo completo
                </a>
                
                <div className="flex flex-wrap gap-3 justify-end">
                  <button 
                    onClick={() => setSelectedNews(null)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm transition-colors"
                  >
                    Cerrar
                  </button>
                  
                  {activeTab === 'unread' ? (
                      <button 
                        onClick={() => handleToggleReadStatus(selectedNews.link, false)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors border border-gray-300"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Marcar Leída
                      </button>
                  ) : (
                      <button 
                        onClick={() => handleToggleReadStatus(selectedNews.link, true)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors border border-gray-300"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Marcar No Leída
                      </button>
                  )}

                  <button 
                    onClick={() => handleCreateTicket(selectedNews)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Crear Riesgo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Config Feeds Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Rss className="w-5 h-5 text-purple-600" />
                        Configuración de Fuentes RSS
                    </h3>
                    <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    
                    {/* List Existing */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Feeds Activos</h4>
                        <div className="border rounded-md max-h-60 overflow-y-auto bg-gray-50">
                            {loadingFeeds ? (
                                <div className="p-4 text-center text-sm text-gray-500">Cargando...</div>
                            ) : feeds.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500">No hay feeds configurados.</div>
                            ) : (
                                feeds.map((feed) => (
                                    <div key={feed.id} className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-white transition-colors">
                                        <div className="truncate pr-2">
                                            <div className="font-medium text-gray-800 text-sm">{feed.title}</div>
                                            <div className="text-xs text-gray-500 truncate" title={feed.url}>{feed.url}</div>
                                        </div>
                                        <button 
                                            onClick={() => feed.id && handleDeleteFeed(feed.id)}
                                            className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Add New */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Añadir Nuevo Feed</h4>
                        <form onSubmit={handleAddFeed} className="space-y-3">
                            <input 
                                type="text" 
                                placeholder="Nombre de la fuente (ej: Security News)" 
                                className="w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:border-purple-500"
                                value={newFeedTitle}
                                onChange={e => setNewFeedTitle(e.target.value)}
                                required
                            />
                             <input 
                                type="url" 
                                placeholder="URL del RSS Feed (ej: https://site.com/feed)" 
                                className="w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:border-purple-500"
                                value={newFeedUrl}
                                onChange={e => setNewFeedUrl(e.target.value)}
                                required
                            />
                            <button 
                                type="submit" 
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md text-sm font-medium transition-colors flex justify-center items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Añadir Feed
                            </button>
                        </form>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button 
                        onClick={() => setIsConfigModalOpen(false)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};