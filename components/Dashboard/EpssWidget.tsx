

import React, { useEffect, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchEpssScores } from '../../services/epss';
import { Loader2 } from 'lucide-react';

interface EpssWidgetProps {
  data: any[]; // Raw CVEs or Exploits
  referenceData?: any[]; // Array of CVEs to look up CVSS if data is Exploits
  mode: 'cve' | 'exploit';
}

export const EpssWidget: React.FC<EpssWidgetProps> = ({ data, referenceData, mode }) => {
  const [plotData, setPlotData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, critical: 0 });

  useEffect(() => {
    const loadEpss = async () => {
      setLoading(true);
      
      // Filter items that have a valid identifier
      const itemsToAnalyze = data.filter(item => {
        if (mode === 'cve') return item.cveId;
        if (mode === 'exploit') return item.cve; // Exploits must have a CVE
        return false;
      });

      const cveList = itemsToAnalyze.map(i => {
        const val = mode === 'cve' ? i.cveId : i.cve;
        return val.trim().toUpperCase();
      });

      // Dedup
      const uniqueCves = Array.from(new Set(cveList));
      
      const scores = await fetchEpssScores(uniqueCves as string[]);

      // Create Map for faster CVE lookup from reference data
      const cveReferenceMap = new Map();
      if (referenceData) {
        referenceData.forEach(c => {
            if (c.cveId) cveReferenceMap.set(c.cveId.trim().toUpperCase(), c.cvss);
        });
      }

      const processed = itemsToAnalyze.map(item => {
        const cveKey = (mode === 'cve' ? item.cveId : item.cve).trim().toUpperCase();
        const epss = scores[cveKey] || 0;
        
        let cvss = 0;
        
        if (mode === 'cve') {
            cvss = parseFloat(item.cvss) || 0;
        } else {
            // For exploits, try to find CVSS in the reference CVE data
            const refCvss = cveReferenceMap.get(cveKey);
            if (refCvss !== undefined) {
                cvss = parseFloat(refCvss);
            } else {
                // Fallback: if the exploit happens to have a cvss field manually entered
                cvss = parseFloat(item.cvss) || 0;
            }
        }

        return {
          name: mode === 'cve' ? item.cveId : item.nombre,
          cve: cveKey,
          x: cvss, // X Axis: CVSS (Severity)
          y: epss, // Y Axis: EPSS (Probability)
          z: 1     // Size
        };
      }).filter(p => p.x > 0); // Filter out items without CVSS (can't plot X axis)

      const critical = processed.filter(p => p.y > 0.5).length; // > 50% probability

      setStats({ total: processed.length, critical });
      setPlotData(processed);
      setLoading(false);
    };

    if (data.length > 0) {
      loadEpss();
    } else {
        setPlotData([]);
        setLoading(false);
    }
  }, [data, mode, referenceData]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  
  if (plotData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-400 text-center px-4 text-sm">
            {mode === 'exploit' 
                ? "No se encontraron exploits con CVEs válidos y puntaje CVSS asociado. Asegúrate de tener los CVEs registrados." 
                : "No hay datos suficientes con CVSS para analizar."}
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col">
        <div className="flex justify-around mb-4 text-sm bg-gray-50 p-2 rounded border border-gray-100">
            <div className="text-center">
                <div className="font-bold text-gray-800 text-lg">{stats.total}</div>
                <div className="text-gray-500 text-xs uppercase">Analizados</div>
            </div>
            <div className="text-center">
                <div className="font-bold text-red-600 text-lg">{stats.critical}</div>
                <div className="text-gray-500 text-xs uppercase">Alta Prob. ({'>'}50%)</div>
            </div>
        </div>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name="CVSS" unit="" domain={[0, 10]} label={{ value: 'Severidad (CVSS)', position: 'insideBottom', offset: -10, fontSize: 12 }} />
            <YAxis type="number" dataKey="y" name="EPSS" unit="" domain={[0, 1]} label={{ value: 'Probabilidad (EPSS)', angle: -90, position: 'insideLeft', fontSize: 12 }} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                        <div className="bg-white p-2 border shadow-md text-xs rounded z-50">
                            <p className="font-bold text-indigo-700 mb-1">{data.name}</p>
                            <p>CVE: {data.cve}</p>
                            <p>CVSS: {data.x.toFixed(1)}</p>
                            <p>EPSS: {(data.y * 100).toFixed(2)}%</p>
                        </div>
                    );
                }
                return null;
            }} />
            <Scatter name="Items" data={plotData} fill="#8884d8">
                {plotData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.y > 0.5 ? '#ef4444' : '#3b82f6'} />
                ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};