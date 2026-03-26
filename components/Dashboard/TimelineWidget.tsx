
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TimelineProps {
  data: any; // Full data object
  startDate: string;
  endDate: string;
}

export const TimelineWidget: React.FC<TimelineProps> = ({ data, startDate, endDate }) => {
  // State to control visibility of each series
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({
    incidentes: true,
    exploits: true,
    cves: true,
    zerodays: true, // New series for Zero Days
  });

  // Handler for toggling series visibility
  const handleToggleSeries = (seriesName: string) => {
    setVisibleSeries(prev => ({ ...prev, [seriesName]: !prev[seriesName] }));
  };

  // Aggregate data by date
  const processTimeline = () => {
    const points: Record<string, any> = {};
    
    // Determine range
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Fill empty dates and initialize all series to 0
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        points[d.toISOString().split('T')[0]] = { date: d.toISOString().split('T')[0], incidentes: 0, exploits: 0, cves: 0, zerodays: 0 };
    }

    const addToPoints = (items: any[], key: string) => {
        items.forEach(item => {
            const dStr = (item.fecha || item.date || '').split('T')[0];
            if (points[dStr]) {
                points[dStr][key] += 1;
            }
        });
    };

    addToPoints(data['incidentes'] || [], 'incidentes');
    addToPoints(data['exploits'] || [], 'exploits');
    addToPoints(data['cves'] || [], 'cves');
    addToPoints(data['zerodays'] || [], 'zerodays'); // Add Zero Days data

    return Object.values(points).sort((a:any, b:any) => a.date.localeCompare(b.date));
  };

  const chartData = processTimeline();

  // Define new color for Zero Days
  const COLOR_ZDS = '#a855f7'; // A purple color

  return (
    <div className="h-[300px] w-full flex flex-col">
      {/* Series Visibility Controls */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 justify-center text-sm">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={visibleSeries.incidentes}
            onChange={() => handleToggleSeries('incidentes')}
            className="form-checkbox text-red-500 rounded"
          />
          <span className="text-red-500 font-medium">Incidentes</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={visibleSeries.exploits}
            onChange={() => handleToggleSeries('exploits')}
            className="form-checkbox text-orange-500 rounded"
          />
          <span className="text-orange-500 font-medium">Exploits</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={visibleSeries.cves}
            onChange={() => handleToggleSeries('cves')}
            className="form-checkbox text-indigo-500 rounded"
          />
          <span className="text-indigo-500 font-medium">CVEs</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={visibleSeries.zerodays}
            onChange={() => handleToggleSeries('zerodays')}
            className="form-checkbox text-purple-500 rounded"
          />
          <span className="text-purple-500 font-medium">Zero Days</span>
        </label>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorCve" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorZds" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLOR_ZDS} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={COLOR_ZDS} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tickFormatter={d => d.substring(5)} />
          <YAxis />
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <Tooltip />
          <Legend />
          {visibleSeries.incidentes && <Area type="monotone" dataKey="incidentes" stroke="#ef4444" fillOpacity={1} fill="url(#colorInc)" />}
          {visibleSeries.exploits && <Area type="monotone" dataKey="exploits" stroke="#f59e0b" fillOpacity={1} fill="url(#colorExp)" />}
          {visibleSeries.cves && <Area type="monotone" dataKey="cves" stroke="#6366f1" fillOpacity={1} fill="url(#colorCve)" />}
          {visibleSeries.zerodays && <Area type="monotone" dataKey="zerodays" stroke={COLOR_ZDS} fillOpacity={1} fill="url(#colorZds)" />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
