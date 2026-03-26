
export interface NewsItem {
  title: string;
  feedTitle: string;
  link: string;
  pubDate: string;
  description?: string;
}

export type RiskPriority = 'low' | 'medium' | 'high';
export type RiskStatus = 'detectado' | 'notificado' | 'mitigando' | 'resuelto' | 'riesgo-aceptado';

export interface ActivityLog {
  type: 'comment' | 'status_change';
  timestamp: number;
  text?: string;
  status?: string;
  comment?: string;
  username?: string;
}

export interface RiskTicket {
  id?: string | number;
  title: string;
  customers: string[];
  tags: string[];
  priority: RiskPriority;
  description: string;
  status: RiskStatus;
  createdAt: number;
  lastUpdated: number;
  activity: ActivityLog[];
}

export type TabName = 
  | 'dashboard' 
  | 'incidentes' 
  | 'exploits' 
  | 'zerodays' 
  | 'cves' 
  | 'alertas' 
  | 'fuentes' 
  | 'mitigaciones' 
  | 'observatorio' 
  | 'riesgos'
  | 'reporte'
  | 'ai-analyst'
  | 'cti-engine';

export type WidgetType = 'chart' | 'table' | 'special';
export type ChartType = 'bar' | 'pie' | 'doughnut' | 'area';
export type WidgetSize = 'col-span-1' | 'col-span-2' | 'col-span-3' | 'col-span-full';

export interface WidgetConfig {
  id: string;
  title: string;
  type: WidgetType;
  size: WidgetSize;
  dataSource?: string;
  chartType?: ChartType;
  groupByField?: string;
  specialComponent?: 'timeline' | 'epss-cve' | 'epss-exploit' | 'alerts-list' | 'risk-kpis';
}

export interface RssFeedConfig {
    id?: string;
    title: string;
    url: string;
}
