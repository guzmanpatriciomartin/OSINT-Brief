

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CheckCircle, AlertOctagon, Clock, Archive } from 'lucide-react';

interface RiskStatsWidgetProps {
  data: any[]; // Tickets de riesgo
}

const COLORS = {
  'high': '#ef4444',
  'medium': '#f97316',
  'low': '#22c55e',
  'detectado': '#3b82f6',
  'notificado': '#8b5cf6',
  'mitigando': '#eab308',
  'resuelto': '#10b981'
};

export const RiskStatsWidget: React.FC<RiskStatsWidgetProps> = ({ data }) => {
  const total = data.length;
  
  // Stats Count
  const byStatus = data.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeTickets = (byStatus['detectado'] || 0) + (byStatus['notificado'] || 0) + (byStatus['mitigando'] || 0);
  const resolvedTickets = (byStatus['resuelto'] || 0) + (byStatus['riesgo-aceptado'] || 0);

  // Data for Charts
  const statusData = Object.keys(byStatus).map(key => ({
    name: key.charAt(0).toUpperCase() + key.slice(1).replace('-', ' '),
    value: byStatus[key]
  }));

  const priorityData = data.reduce((acc, curr) => {
    const p = curr.priority || 'medium';
    const existing = acc.find(item => item.name === p);
    if (existing) existing.value++;
    else acc.push({ name: p, value: 1 });
    return acc;
  }, [] as {name: string, value: number}[]);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex items-center justify-between">
          <div>
            <div className="text-xs text-red-600 font-bold uppercase">Activos</div>
            <div className="text-2xl font-bold text-red-700">{activeTickets}</div>
          </div>
          <AlertOctagon className="w-6 h-6 text-red-400" />
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-center justify-between">
          <div>
            <div className="text-xs text-green-600 font-bold uppercase">Resueltos</div>
            <div className="text-2xl font-bold text-green-700">{resolvedTickets}</div>
          </div>
          <CheckCircle className="w-6 h-6 text-green-400" />
        </div>
      </div>

      {/* Mini Charts */}
      <div className="flex-1 flex gap-2 min-h-[150px]">
         <div className="flex-1 bg-gray-50 rounded p-2 border border-gray-100 flex flex-col">
            <h4 className="text-xs text-gray-500 font-bold uppercase mb-2 text-center">Por Estado</h4>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={statusData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" cy="50%" 
                    innerRadius={25} 
                    outerRadius={45} 
                    paddingAngle={2}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase().replace(' ', '-') as keyof typeof COLORS] || '#888'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
         </div>

         <div className="flex-1 bg-gray-50 rounded p-2 border border-gray-100 flex flex-col">
            <h4 className="text-xs text-gray-500 font-bold uppercase mb-2 text-center">Por Prioridad</h4>
             <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={priorityData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" cy="50%" 
                    outerRadius={45} 
                  >
                     {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#888'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );
};