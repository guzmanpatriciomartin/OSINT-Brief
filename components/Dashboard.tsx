
import React, { useEffect, useState, useMemo } from 'react';
import { fetchResource } from '../services/api';
import { StatCard } from './StatCard';
import { AlertTriangle, Bug, ShieldAlert, FileText, Activity, Eye, Loader2, Settings, Plus, Filter, X, Save, RotateCcw } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from 'recharts';
import { WidgetConfig, WidgetType } from '../types';
import { WidgetConfigModal } from './Dashboard/WidgetConfigModal';
import { EpssWidget } from './Dashboard/EpssWidget';
import { TimelineWidget } from './Dashboard/TimelineWidget';
import { RiskStatsWidget } from './Dashboard/RiskStatsWidget';

// --- CONSTANTS ---
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b', '#0ea5e9'];

// Layout original restaurado
const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'timeline-1', title: 'Línea de Tiempo de Amenazas', type: 'special', size: 'col-span-full', specialComponent: 'timeline' },
  { id: 'risk-kpis-1', title: 'Estado de Gestión de Riesgos', type: 'special', size: 'col-span-2', specialComponent: 'risk-kpis' },
  { id: 'epss-cve-1', title: 'Priorización de CVEs (EPSS)', type: 'special', size: 'col-span-2', specialComponent: 'epss-cve' },
  { id: 'chart-inc-sector', title: 'Incidentes por Sector', type: 'chart', size: 'col-span-1', dataSource: 'incidentes', chartType: 'pie', groupByField: 'sector' },
  { id: 'chart-cve-estado', title: 'CVEs por Estado', type: 'chart', size: 'col-span-1', dataSource: 'cves', chartType: 'doughnut', groupByField: 'estado' },
];

interface DashboardProps {
  onNavigate: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [rawData, setRawData] = useState<Record<string, any[]>>({});
  const [layout, setLayout] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);

  useEffect(() => {
    const initDashboard = async () => {
      setLoading(true);
      const endpoints = ['incidentes', 'exploits', 'cves', 'alertas', 'zerodays', 'riesgos'];
      const rawResults: Record<string, any[]> = {};
      
      await Promise.all(endpoints.map(async (ep) => {
        try {
            rawResults[ep] = await fetchResource(ep);
        } catch (e) {
            rawResults[ep] = [];
        }
      }));
      setRawData(rawResults);

      const savedLayout = localStorage.getItem('dashboard_layout_v2');
      if (savedLayout) {
        try {
            const parsed = JSON.parse(savedLayout);
            setLayout(parsed.length > 0 ? parsed : DEFAULT_LAYOUT);
        } catch {
            setLayout(DEFAULT_LAYOUT);
        }
      } else {
        setLayout(DEFAULT_LAYOUT);
      }
      setLoading(false);
    };
    initDashboard();
  }, []);

  const filteredData = useMemo(() => {
    if (!dateStart && !dateEnd) return rawData;
    const start = dateStart ? new Date(dateStart) : new Date(0);
    const end = dateEnd ? new Date(dateEnd) : new Date();
    end.setHours(23, 59, 59, 999);
    const filtered: Record<string, any[]> = {};
    Object.keys(rawData).forEach(key => {
        filtered[key] = rawData[key].filter(item => {
            const dateStr = item.fecha || item.date || item.createdAt;
            if (!dateStr) return true;
            const d = new Date(dateStr);
            if (typeof dateStr === 'number') return dateStr >= start.getTime() && dateStr <= end.getTime();
            return d >= start && d <= end;
        });
    });
    return filtered;
  }, [rawData, dateStart, dateEnd]);

  const persistLayout = (newLayout: WidgetConfig[]) => {
    setLayout(newLayout);
    localStorage.setItem('dashboard_layout_v2', JSON.stringify(newLayout));
  };

  const handleSaveWidget = (config: WidgetConfig) => {
    const exists = layout.find(w => w.id === config.id);
    let newLayout;
    if (exists) {
      newLayout = layout.map(w => w.id === config.id ? config : w);
    } else {
      newLayout = [...layout, config];
    }
    persistLayout(newLayout);
    setEditingWidget(null);
  };

  const handleEditWidget = (widget: WidgetConfig) => {
    setEditingWidget(widget);
    setModalOpen(true);
  };

  const handleAddWidget = () => {
    setEditingWidget(null);
    setModalOpen(true);
  };

  const handleResetLayout = () => {
    if (window.confirm('¿Restablecer el diseño original? Se perderán tus personalizaciones.')) {
      persistLayout(DEFAULT_LAYOUT);
    }
  };

  const handleDeleteWidget = (id: string) => {
    if (window.confirm('¿Eliminar widget?')) {
        setLayout(prev => {
            const filtered = prev.filter(w => w.id !== id);
            localStorage.setItem('dashboard_layout_v2', JSON.stringify(filtered));
            return filtered;
        });
    }
  };

  const processChartData = (widget: WidgetConfig) => {
    const source = filteredData[widget.dataSource || 'incidentes'] || [];
    const field = widget.groupByField || 'tipo';
    const counts: Record<string, number> = {};
    source.forEach(item => {
        let val = item[field] || 'N/A';
        if (Array.isArray(val)) {
             if (val.length === 0) counts['N/A'] = (counts['N/A'] || 0) + 1;
             else val.forEach(v => counts[v] = (counts[v] || 0) + 1);
             return;
        }
        if (typeof val === 'string') val = val.charAt(0).toUpperCase() + val.slice(1).replace(/-/g, ' ');
        counts[val] = (counts[val] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }))
                 .sort((a, b) => b.value - a.value).slice(0, 10);
  };

  const renderWidgetContent = (widget: WidgetConfig) => {
    if (widget.type === 'chart') {
        const data = processChartData(widget);
        if (data.length === 0) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sin datos</div>;
        return (
            <ResponsiveContainer width="100%" height="100%">
                {widget.chartType === 'pie' || widget.chartType === 'doughnut' ? (
                    <PieChart>
                        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={widget.chartType === 'doughnut' ? 50 : 0} paddingAngle={2}>
                            {data.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                    </PieChart>
                ) : (
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" hide={data.length > 5} tick={{fontSize: 10}} />
                        <YAxis tick={{fontSize: 10}} width={25} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                            {data.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                    </BarChart>
                )}
            </ResponsiveContainer>
        );
    }
    
    if (widget.specialComponent === 'epss-cve') return <EpssWidget data={filteredData['cves'] || []} mode="cve" />;
    if (widget.specialComponent === 'epss-exploit') return <EpssWidget data={filteredData['exploits'] || []} referenceData={filteredData['cves']} mode="exploit" />;
    if (widget.specialComponent === 'timeline') return <TimelineWidget data={filteredData} startDate={dateStart} endDate={dateEnd} />;
    if (widget.specialComponent === 'risk-kpis') return <RiskStatsWidget data={filteredData['riesgos'] || []} />;
    if (widget.specialComponent === 'alerts-list') {
        const alerts = (filteredData['alertas'] || []).slice(0, 5);
        return (
            <div className="space-y-2 overflow-y-auto h-full pr-1 text-xs">
                {alerts.map((alert: any, i: number) => (
                    <div key={i} className={`p-2 rounded border-l-4 ${alert.criticidad === 'Critica' ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'}`}>
                        <div className="font-bold text-slate-800">{alert.titulo}</div>
                        <div className="flex justify-between mt-1 text-[10px] text-slate-500 uppercase font-bold">
                            <span>{new Date(alert.fecha).toLocaleDateString()}</span>
                            <span>{alert.criticidad}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    return <div className="text-gray-400 text-xs">Componente no soportado</div>;
  };

  if (loading) return <div className="flex h-96 items-center justify-center flex-col gap-3"><Loader2 className="animate-spin w-10 h-10 text-indigo-600" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Incidentes" value={filteredData['incidentes']?.length || 0} colorClass="text-red-600" icon={<AlertTriangle className="w-4 h-4" />} onClick={() => onNavigate('incidentes')} />
        <StatCard label="Exploits" value={filteredData['exploits']?.length || 0} colorClass="text-orange-600" icon={<Activity className="w-4 h-4" />} onClick={() => onNavigate('exploits')} />
        <StatCard label="ZeroDays" value={filteredData['zerodays']?.length || 0} colorClass="text-purple-600" icon={<Bug className="w-4 h-4" />} onClick={() => onNavigate('zerodays')} />
        <StatCard label="CVEs" value={filteredData['cves']?.length || 0} colorClass="text-indigo-600" icon={<ShieldAlert className="w-4 h-4" />} onClick={() => onNavigate('cves')} />
        <StatCard label="Alertas" value={filteredData['alertas']?.length || 0} colorClass="text-blue-600" icon={<FileText className="w-4 h-4" />} onClick={() => onNavigate('alertas')} />
        <StatCard label="Observatorio" value={filteredData['digest']?.length || 'RSS'} colorClass="text-slate-600" icon={<Eye className="w-4 h-4" />} onClick={() => onNavigate('observatorio')} />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center sticky top-20 z-20">
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-transparent outline-none" />
            <span>a</span>
            <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-transparent outline-none" />
        </div>
        <div className="flex gap-2">
            {isEditMode ? (
                <>
                    <button 
                        onClick={handleAddWidget} 
                        className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-green-100 flex items-center gap-1"
                    >
                        <Plus className="w-3.5 h-3.5" /> Añadir Widget
                    </button>
                    <button 
                        onClick={handleResetLayout} 
                        className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 flex items-center gap-1"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Restablecer
                    </button>
                    <button 
                        onClick={() => setIsEditMode(false)} 
                        className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-100"
                    >
                        Guardar Cambios
                    </button>
                </>
            ) : (
                <button onClick={() => setIsEditMode(true)} className="px-4 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-1">
                    <Settings className="w-3.5 h-3.5" /> Personalizar
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {layout.map((widget) => {
            const colClass = widget.size === 'col-span-full' ? 'col-span-1 md:col-span-2 lg:col-span-4' : 
                             widget.size === 'col-span-3' ? 'col-span-1 md:col-span-2 lg:col-span-3' :
                             widget.size === 'col-span-2' ? 'col-span-1 md:col-span-2' : 'col-span-1';
            
            return (
                <div key={widget.id} className={`${colClass} bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[300px] relative transition-all hover:shadow-md`}>
                    <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-2">
                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">
                            {widget.title}
                        </h3>
                        {isEditMode && (
                            <div className="flex gap-1">
                                <button 
                                    onClick={() => handleEditWidget(widget)} 
                                    className="p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                    title="Editar Widget"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteWidget(widget.id)} 
                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Eliminar Widget"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        {renderWidgetContent(widget)}
                    </div>
                </div>
            );
        })}
      </div>

      <WidgetConfigModal 
        isOpen={modalOpen} 
        onClose={() => { setModalOpen(false); setEditingWidget(null); }} 
        onSave={handleSaveWidget} 
        initialConfig={editingWidget}
      />
    </div>
  );
};
