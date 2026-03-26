

import React, { useState, useEffect } from 'react';
import { WidgetConfig, WidgetSize, WidgetType, ChartType } from '../../types';
import { X, Save } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: WidgetConfig) => void;
  initialConfig?: WidgetConfig | null;
}

const DATA_SOURCES = [
  { id: 'incidentes', label: 'Incidentes' },
  { id: 'exploits', label: 'Exploits' },
  // UPDATED: zerodays
  { id: 'zerodays', label: 'Zero Days' },
  { id: 'cves', label: 'CVEs' },
  { id: 'alertas', label: 'Alertas' },
  { id: 'riesgos', label: 'Tickets de Riesgo (Gestión)' },
];

const GROUP_BY_FIELDS: Record<string, {id: string, label: string}[]> = {
  'incidentes': [
    { id: 'tipo', label: 'Tipo' },
    { id: 'pais', label: 'País' },
    { id: 'sector', label: 'Sector' },
    { id: 'actor', label: 'Actor de Amenaza' }
  ],
  'exploits': [
    { id: 'tipo', label: 'Tipo' },
    { id: 'plataforma', label: 'Plataforma' }
  ],
  'cves': [
    { id: 'estado', label: 'Estado' },
    { id: 'aplicativo', label: 'Aplicativo/Vendor' }
  ],
  'riesgos': [
    { id: 'priority', label: 'Prioridad' },
    { id: 'status', label: 'Estado del Ticket' },
    { id: 'customers', label: 'Cliente' } // Array handling required in chart logic
  ],
  'alertas': [
      { id: 'criticidad', label: 'Criticidad' }
  ],
  // UPDATED: zerodays
  'zerodays': [
    { id: 'plataforma', label: 'Plataforma' },
    { id: 'estado', label: 'Estado' }
  ]
};

export const WidgetConfigModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialConfig }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<WidgetType>('chart');
  const [size, setSize] = useState<WidgetSize>('col-span-1');
  const [dataSource, setDataSource] = useState('incidentes');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [groupBy, setGroupBy] = useState('');
  const [specialComponent, setSpecialComponent] = useState('timeline');

  useEffect(() => {
    if (initialConfig) {
      setTitle(initialConfig.title);
      setType(initialConfig.type);
      setSize(initialConfig.size);
      if (initialConfig.dataSource) setDataSource(initialConfig.dataSource);
      if (initialConfig.chartType) setChartType(initialConfig.chartType);
      if (initialConfig.groupByField) setGroupBy(initialConfig.groupByField);
      if (initialConfig.specialComponent) setSpecialComponent(initialConfig.specialComponent);
    } else {
      // Defaults
      setTitle('');
      setType('chart');
      setSize('col-span-1');
      setDataSource('incidentes');
      setChartType('bar');
      setGroupBy('tipo');
      setSpecialComponent('timeline');
    }
  }, [initialConfig, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config: WidgetConfig = {
      id: initialConfig?.id || `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      type,
      size,
    };

    if (type === 'chart') {
      config.dataSource = dataSource;
      config.chartType = chartType;
      config.groupByField = groupBy;
    } else if (type === 'table') {
      config.dataSource = dataSource;
    } else if (type === 'special') {
      config.specialComponent = specialComponent as any;
    }

    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
          <h3 className="font-bold text-gray-800">{initialConfig ? 'Editar Widget' : 'Añadir Nuevo Widget'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título del Widget</label>
            <input 
              type="text" required value={title} onChange={e => setTitle(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Ej: Incidentes por Sector"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Visualización</label>
                <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-2.5 border border-gray-300 rounded-md bg-white">
                <option value="chart">Gráfico</option>
                <option value="table">Tabla de Datos</option>
                <option value="special">Componente Especial</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño en Grid</label>
                <select value={size} onChange={e => setSize(e.target.value as any)} className="w-full p-2.5 border border-gray-300 rounded-md bg-white">
                <option value="col-span-1">Pequeño (1/4)</option>
                <option value="col-span-2">Mediano (1/2)</option>
                <option value="col-span-3">Grande (3/4)</option>
                <option value="col-span-full">Ancho Completo</option>
                </select>
            </div>
          </div>

          {type === 'special' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Componente</label>
              <select value={specialComponent} onChange={e => setSpecialComponent(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md bg-white">
                <option value="timeline">Línea de Tiempo (Amenazas)</option>
                <option value="epss-cve">Matriz EPSS (CVEs)</option>
                <option value="epss-exploit">Matriz EPSS (Exploits)</option>
                <option value="risk-kpis">KPIs de Riesgo (Tickets)</option>
                <option value="alerts-list">Últimas Alertas</option>
              </select>
            </div>
          )}

          {(type === 'chart' || type === 'table') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fuente de Datos</label>
              <select value={dataSource} onChange={e => { setDataSource(e.target.value); setGroupBy(''); }} className="w-full p-2.5 border border-gray-300 rounded-md bg-white">
                {DATA_SOURCES.map(ds => <option key={ds.id} value={ds.id}>{ds.label}</option>)}
              </select>
            </div>
          )}

          {type === 'chart' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Gráfico</label>
                  <select value={chartType} onChange={e => setChartType(e.target.value as any)} className="w-full p-2.5 border border-gray-300 rounded-md bg-white">
                    <option value="bar">Barras</option>
                    <option value="pie">Torta (Pie)</option>
                    <option value="doughnut">Anillo (Doughnut)</option>
                    <option value="area">Área</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agrupar por</label>
                  <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md bg-white">
                    <option value="">-- Campo --</option>
                    {GROUP_BY_FIELDS[dataSource]?.map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="pt-6 flex justify-end gap-3 border-t mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md font-medium transition-colors">Cancelar</button>
            <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2 font-medium shadow-sm transition-colors">
              <Save className="w-4 h-4" /> {initialConfig ? 'Actualizar' : 'Crear Widget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};