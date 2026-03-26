
import React, { useState, useEffect } from 'react';
import { fetchDigest, createResource, getAIBriefing, performAITriage } from '../services/api';
import { NewsItem } from '../types';
import { 
  Zap, 
  ExternalLink, 
  BrainCircuit, 
  Loader2, 
  X,
  FileJson,
  Save,
  Sparkles,
  BookOpenCheck,
  Flame,
  Clock,
  LayoutGrid,
  List,
  Activity,
  Cpu,
  Terminal,
  Search,
  CheckCircle2,
  Database
} from 'lucide-react';
import { parse } from 'marked';

export const IntelligenceDigest: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [summary, setSummary] = useState<string | null>(localStorage.getItem('cti_last_summary'));
  const [summarizing, setSummarizing] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchDigest(3);
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleGenerateBriefSummary = async () => {
    if (items.length === 0) return;
    setSummarizing(true);
    try {
      const text = await getAIBriefing(items);
      setSummary(text);
      localStorage.setItem('cti_last_summary', text);
    } catch (error) {
      setSummary("Error al generar el resumen.");
    } finally {
      setSummarizing(false);
    }
  };

  const handleAnalizar = async (url: string, newsItem?: NewsItem) => {
    setAnalyzing(true);
    setShowModal(true);
    setFormData(null);
    setDetectedType(null);
    
    // Minimalist loading steps
    const steps = ["Extrayendo telemetría...", "Normalizando vectores...", "Mapeando esquemas..."];
    let step = 0;
    const interval = setInterval(() => {
        setLoadingMsg(steps[step % steps.length]);
        step++;
    }, 2000);

    try {
      const result = await performAITriage(url, newsItem);
      setDetectedType(result.type);
      setFormData(result.data);
    } catch (err) {
      setFormData({ error: "Análisis fallido" });
    } finally {
      clearInterval(interval);
      setAnalyzing(false);
    }
  };

  const handleSaveResource = async () => {
    if (!detectedType || !formData) return;
    setIsSaving(true);
    try {
      const endpointMap: Record<string, string> = { 
        'cve': 'cves', 
        'alerta': 'alertas', 
        'incidente': 'incidentes', 
        'exploit': 'exploits', 
        'zeroday': 'zerodays', 
        'fuente': 'fuentes', 
        'mitigacion': 'mitigaciones' 
      };
      const endpoint = endpointMap[detectedType.toLowerCase()] || detectedType;
      const res = await createResource(endpoint, formData);
      if (res.success) {
        setShowModal(false);
        setUrlInput("");
        loadData();
      } else {
        alert("Error al persistir: " + res.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-500/10 blur-[100px]"></div>
        <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-indigo-400"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">SATI Intelligent Core</span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter leading-none">Intelligence <span className="text-indigo-400">Hub</span></h1>
            <p className="text-slate-400 text-lg max-w-xl font-medium">Automatiza la extracción de IoCs y telemetría estratégica mediante triaje IA avanzado.</p>
            <form onSubmit={(e) => { e.preventDefault(); handleAnalizar(urlInput); }} className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="url" placeholder="Analizar URL técnica (CVE, Reporte, News)..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-white font-bold focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all"
                />
              </div>
              <button disabled={analyzing || !urlInput} className="bg-white hover:bg-slate-100 text-slate-950 px-8 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                {analyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <Zap className="w-4 h-4" />}
                Triaje
              </button>
            </form>
          </div>
          <div className="lg:w-80 bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800/50 flex flex-col gap-4">
             <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
               <span>Operaciones SATI</span>
               <Activity className="w-3 h-3" />
             </div>
             <button onClick={handleGenerateBriefSummary} className="w-full py-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-2xl text-[10px] font-black uppercase border border-indigo-500/20 flex items-center justify-center gap-2 transition-all">
                {summarizing ? <Loader2 className="animate-spin w-3 h-3" /> : <Sparkles className="w-3 h-3" />} Generar Resumen
             </button>
          </div>
        </div>
      </div>

      {summary && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="bg-slate-900 p-3 rounded-2xl"><BookOpenCheck className="w-5 h-5 text-white" /></div>
              <div><h3 className="text-lg font-black text-slate-900">Briefing Estratégico</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">IA Insight Pipeline</p></div>
            </div>
            <button onClick={() => setSummary(null)} className="p-2 text-slate-300 hover:text-slate-900"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-10"><div className="prose prose-slate max-w-none text-slate-700 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: parse(summary) as string }} /></div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between px-6">
           <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter"><Flame className="w-5 h-5 text-orange-500" /> Observatorio de Amenazas</h2>
           <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}><List className="w-4 h-4" /></button>
           </div>
        </div>
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-3 gap-6" : "space-y-4 px-6"}>
          {loading ? [1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-[2rem] animate-pulse"></div>) : 
           items.map((item, idx) => (
            <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 hover:border-indigo-100 hover:shadow-2xl transition-all group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest bg-indigo-50 px-3 py-1 rounded-full">{item.feedTitle}</span>
                  <Clock className="w-3 h-3 text-slate-300" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors leading-tight">{item.title}</h3>
                <p className="text-slate-400 text-xs line-clamp-2 mb-6 font-medium leading-relaxed">{item.description?.replace(/<[^>]*>?/gm, '')}</p>
              </div>
              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                 <a href={item.link} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-indigo-600 transition-colors"><ExternalLink className="w-4 h-4" /></a>
                 <button onClick={() => handleAnalizar(item.link, item)} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-900 hover:text-indigo-600 transition-all"><Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> Analizar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
           <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in duration-200">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-950 p-3 rounded-2xl"><BrainCircuit className="w-6 h-6 text-white" /></div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">SATI Triage Processor</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Extraction Pipeline V4</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-950 transition-colors"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10">
                {analyzing ? (
                  <div className="py-32 flex flex-col items-center justify-center space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="h-1 w-12 bg-indigo-600 rounded-full animate-pulse"></div>
                       <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                       <div className="h-1 w-12 bg-indigo-600 rounded-full animate-pulse"></div>
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">{loadingMsg}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">IA Vector Normalization in progress</p>
                    </div>
                  </div>
                ) : 
                 formData && (
                  <div className="space-y-8">
                    <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                          <span className="text-[11px] font-black uppercase text-indigo-900">Tipo Detectado: <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg ml-2">{detectedType?.toUpperCase()}</span></span>
                        </div>
                        <Database className="w-5 h-5 text-indigo-300" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(formData).map(([key, val]) => (
                        <div key={key} className={key === 'descripcion' ? 'col-span-full' : ''}>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{key}</label>
                          {key === 'descripcion' ? (
                            <textarea 
                              value={val as string} 
                              onChange={(e) => setFormData({...formData, [key]: e.target.value})} 
                              rows={4}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-800 text-sm focus:border-indigo-500 outline-none transition-all resize-none"
                            />
                          ) : (
                            <input 
                              type="text" 
                              value={val as string} 
                              onChange={(e) => setFormData({...formData, [key]: e.target.value})} 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-800 text-sm focus:border-indigo-500 outline-none transition-all" 
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-slate-50 flex justify-end gap-3 bg-slate-50/30">
                 <button onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-400 font-black text-[10px] uppercase hover:text-slate-900 transition-colors">Cancelar</button>
                 <button onClick={handleSaveResource} disabled={isSaving || !formData} className="px-10 py-3 bg-slate-900 hover:bg-slate-950 text-white font-black text-[10px] uppercase rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-30">
                   {isSaving ? <Loader2 className="animate-spin w-3 h-3" /> : <Save className="w-3 h-3" />} Persistir en Base CTI
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
