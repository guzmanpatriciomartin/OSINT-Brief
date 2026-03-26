
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Observatory } from './components/Observatory';
import { Risks } from './components/Risks';
import { Reports } from './components/Reports';
import { AIAnalyst } from './components/AIAnalyst';
import { CTIEngine } from './components/CTIEngine';
import { ResourceManager, ColumnDef, FormField } from './components/ResourceManager';
import { TabName, NewsItem } from './types';
import { 
  LayoutDashboard, 
  TriangleAlert, 
  Code2, 
  Zap, 
  Bug, 
  Bell, 
  BookOpen, 
  ShieldCheck, 
  Eye, 
  ClipboardList,
  Menu,
  X,
  FileOutput,
  Bot,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { setAuthToken } from './services/api';
import { AuthScreen } from './components/AuthScreen';

// --- CONFIGURATIONS FOR GENERIC MODULES ---

const INCIDENTS_CONFIG = {
  columns: [
    { header: 'Fecha', accessor: 'fecha', type: 'date' },
    { header: 'Entidad', accessor: 'entidad' },
    { header: 'Sector', accessor: 'sector' },
    { header: 'Tipo', accessor: 'tipo', type: 'badge' },
    { header: 'País', accessor: 'pais' },
  ] as ColumnDef[],
  fields: [
    { label: 'Fecha', name: 'fecha', type: 'date', required: true },
    { label: 'Tipo', name: 'tipo', type: 'text', required: true },
    { label: 'Entidad Afectada', name: 'entidad', type: 'text', required: true },
    { label: 'País', name: 'pais', type: 'text' },
    { label: 'Sector', name: 'sector', type: 'text' },
    { label: 'Actor de Amenazas', name: 'actor', type: 'text' },
    { label: 'Datos Comprometidos', name: 'datosComprometidos', type: 'text' },
    { label: 'Descripción', name: 'descripcion', type: 'textarea', required: true },
    { label: 'URL Referencia', name: 'url', type: 'text' },
  ] as FormField[]
};

const EXPLOITS_CONFIG = {
  columns: [
    { header: 'Fecha', accessor: 'fecha', type: 'date' },
    { header: 'Nombre', accessor: 'nombre' },
    { header: 'Tipo', accessor: 'tipo' },
    { header: 'Plataforma', accessor: 'plataforma' },
    { header: 'CVE', accessor: 'cve' },
  ] as ColumnDef[],
  fields: [
    { label: 'Fecha', name: 'fecha', type: 'date', required: true },
    { label: 'Nombre Exploit', name: 'nombre', type: 'text', required: true },
    { label: 'Tipo', name: 'tipo', type: 'text' },
    { label: 'Plataforma', name: 'plataforma', type: 'text' },
    { label: 'CVE Asociado', name: 'cve', type: 'text' },
    { label: 'URL Referencia', name: 'url', type: 'text' },
  ] as FormField[]
};

const ZERODAYS_CONFIG = {
  columns: [
    { header: 'ID ZD', accessor: 'idZD' },
    { header: 'Nombre', accessor: 'nombre' },
    { header: 'CVSS', accessor: 'cvss', type: 'badge' },
    { header: 'Estado', accessor: 'estado' },
  ] as ColumnDef[],
  fields: [
    { label: 'ID Zero-Day', name: 'idZD', type: 'text' },
    { label: 'Fecha', name: 'fecha', type: 'date', required: true },
    { label: 'Nombre Vulnerabilidad', name: 'nombre', type: 'text', required: true },
    { label: 'Plataforma', name: 'plataforma', type: 'text' },
    { label: 'CVSS', name: 'cvss', type: 'number' },
    { label: 'Estado', name: 'estado', type: 'text' },
    { label: 'URL', name: 'url', type: 'text' },
    { label: 'Descripción', name: 'descripcion', type: 'textarea' },
  ] as FormField[]
};

const CVES_CONFIG = {
  columns: [
    { header: 'ID CVE', accessor: 'cveId' },
    { header: 'Aplicativo', accessor: 'aplicativo' },
    { header: 'CVSS', accessor: 'cvss', type: 'badge' },
    { header: 'Estado', accessor: 'estado' },
  ] as ColumnDef[],
  fields: [
    { label: 'ID CVE', name: 'cveId', type: 'text', required: true },
    { label: 'Fecha Publicación', name: 'fecha', type: 'date', required: true },
    { label: 'Aplicativo', name: 'aplicativo', type: 'text' },
    { label: 'CVSS', name: 'cvss', type: 'number' },
    { label: 'Estado', name: 'estado', type: 'text' },
    { label: 'Descripción', name: 'descripcion', type: 'textarea' },
    { label: 'URL', name: 'url', type: 'text' },
  ] as FormField[]
};

const ALERTS_CONFIG = {
  columns: [
    { header: 'Fecha', accessor: 'fecha', type: 'date' },
    { header: 'Título', accessor: 'titulo' },
    { header: 'Criticidad', accessor: 'criticidad', type: 'badge' },
  ] as ColumnDef[],
  fields: [
    { label: 'Título', name: 'titulo', type: 'text', required: true },
    { label: 'Descripción', name: 'descripcion', type: 'textarea' },
    { label: 'Criticidad', name: 'criticidad', type: 'select', options: ['Baja', 'Media', 'Alta', 'Critica'] },
    { label: 'Fecha', name: 'fecha', type: 'date', required: true },
    { label: 'URL', name: 'url', type: 'text' },
  ] as FormField[]
};

const SOURCES_CONFIG = {
  columns: [
    { header: 'Nombre', accessor: 'nombre' },
    { header: 'Tipo', accessor: 'tipo' },
    { header: 'Fecha', accessor: 'fecha', type: 'date' },
  ] as ColumnDef[],
  fields: [
    { label: 'Nombre Fuente', name: 'nombre', type: 'text', required: true },
    { label: 'Fecha', name: 'fecha', type: 'date', required: true },
    { label: 'Tipo', name: 'tipo', type: 'text' },
    { label: 'URL', name: 'url', type: 'text' },
    { label: 'Descripción', name: 'descripcion', type: 'textarea' },
  ] as FormField[]
};

const MITIGATIONS_CONFIG = {
  columns: [
    { header: 'Título', accessor: 'titulo' },
    { header: 'Prioridad', accessor: 'prioridad', type: 'badge' },
    { header: 'Categoría', accessor: 'categoria' },
  ] as ColumnDef[],
  fields: [
    { label: 'Título', name: 'titulo', type: 'text', required: true },
    { label: 'Fecha', name: 'fecha', type: 'date', required: true },
    { label: 'Categoría', name: 'categoria', type: 'text' },
    { label: 'Prioridad', name: 'prioridad', type: 'select', options: ['Baja', 'Media', 'Alta'] },
    { label: 'Descripción', name: 'descripcion', type: 'textarea' },
    { label: 'URL', name: 'url', type: 'text' },
  ] as FormField[]
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prefilledRiskData, setPrefilledRiskData] = useState<NewsItem | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
      setIsAuthenticated(true);
    }
  }, []);

  const handleNavigate = (tab: TabName) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleCreateRiskFromNews = (newsItem: NewsItem) => {
    setPrefilledRiskData(newsItem);
    setActiveTab('riesgos');
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  const NAV_ITEMS: { id: TabName; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'cti-engine', label: 'CTI Engine', icon: <ShieldAlert className="w-4 h-4 text-blue-400" /> },
    { id: 'ai-analyst', label: 'Analista IA', icon: <Bot className="w-4 h-4 text-purple-400" /> },
    { id: 'observatorio', label: 'Observatorio', icon: <Eye className="w-4 h-4 text-indigo-300" /> },
    { id: 'riesgos', label: 'Riesgos', icon: <ClipboardList className="w-4 h-4 text-red-300" /> },
    { id: 'incidentes', label: 'Incidentes', icon: <TriangleAlert className="w-4 h-4" /> },
    { id: 'exploits', label: 'Exploits', icon: <Code2 className="w-4 h-4" /> },
    { id: 'zerodays', label: 'Zero Days', icon: <Zap className="w-4 h-4" /> },
    { id: 'cves', label: 'CVEs', icon: <Bug className="w-4 h-4" /> },
    { id: 'alertas', label: 'Alertas', icon: <Bell className="w-4 h-4" /> },
    { id: 'fuentes', label: 'Fuentes Intel', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'mitigaciones', label: 'Mitigaciones', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'reporte', label: 'Reporte / Exportar', icon: <FileOutput className="w-4 h-4" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />;
      case 'cti-engine': return <CTIEngine />;
      case 'ai-analyst': return <AIAnalyst />;
      case 'observatorio': return <Observatory onCreateRisk={handleCreateRiskFromNews} />;
      case 'riesgos': return <Risks prefillData={prefilledRiskData} onClearPrefill={() => setPrefilledRiskData(null)} />;
      case 'reporte': return <Reports />;
      
      // Generic Modules
      case 'incidentes': return <ResourceManager resourceKey="incidentes" title="Incidentes Registrados" columns={INCIDENTS_CONFIG.columns} formFields={INCIDENTS_CONFIG.fields} />;
      case 'exploits': return <ResourceManager resourceKey="exploits" title="Exploits Registrados" columns={EXPLOITS_CONFIG.columns} formFields={EXPLOITS_CONFIG.fields} />;
      case 'zerodays': return <ResourceManager resourceKey="zerodays" title="Zero-Days" columns={ZERODAYS_CONFIG.columns} formFields={ZERODAYS_CONFIG.fields} idField="idZD" />;
      case 'cves': return <ResourceManager resourceKey="cves" title="Vulnerabilidades (CVEs)" columns={CVES_CONFIG.columns} formFields={CVES_CONFIG.fields} idField="cveId" />;
      case 'alertas': return <ResourceManager resourceKey="alertas" title="Alertas de Seguridad" columns={ALERTS_CONFIG.columns} formFields={ALERTS_CONFIG.fields} />;
      case 'fuentes': return <ResourceManager resourceKey="fuentes" title="Fuentes de Inteligencia" columns={SOURCES_CONFIG.columns} formFields={SOURCES_CONFIG.fields} />;
      case 'mitigaciones': return <ResourceManager resourceKey="mitigaciones" title="Mitigaciones y Recomendaciones" columns={MITIGATIONS_CONFIG.columns} formFields={MITIGATIONS_CONFIG.fields} />;
      
      default: return <div>Not Found</div>;
    }
  };

  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-800 text-white px-6 py-4 shadow-md sticky top-0 z-40 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500 p-1.5 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">OSINT Brief</h1>
            <p className="text-xs text-slate-400 font-medium">CTI Dashboard & Risk Suite</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            className="md:hidden p-2 hover:bg-slate-700 rounded"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-1.5 px-3 rounded-md transition-colors whitespace-nowrap"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        <aside className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-auto
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          pt-20 md:pt-6
        `}>
          <nav className="px-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                  ${activeTab === item.id 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'hover:bg-slate-800 hover:text-white'}
                `}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden w-full">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 pb-4 border-b border-gray-200 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 capitalize">
                  {NAV_ITEMS.find(n => n.id === activeTab)?.label}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Vista general y gestión de {NAV_ITEMS.find(n => n.id === activeTab)?.label}
                </p>
              </div>
              <div className="text-xs text-gray-400">
                Última sinc: {new Date().toLocaleTimeString()}
              </div>
            </div>
            {renderContent()}
          </div>
        </main>
        
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setMobileMenuOpen(false)}></div>
        )}
      </div>
    </div>
  );
};

export default App;
