import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  colorClass?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, colorClass = "text-gray-800", icon, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center justify-center cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md`}
    >
      <div className={`text-3xl font-bold ${colorClass}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1 flex items-center gap-1">
        {icon} {label}
      </div>
    </div>
  );
};