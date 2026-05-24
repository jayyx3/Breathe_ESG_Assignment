import React from 'react';

const StatCard = ({ title, value, unit, icon: Icon, colorClass = "text-brand-500", glowColor = "rgba(34, 197, 94, 0.15)" }) => {
  return (
    <div 
      className="glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:scale-[1.02] group"
      style={{
        boxShadow: `inset 0 0 12px rgba(255, 255, 255, 0.01), 0 4px 30px rgba(0, 0, 0, 0.2)`
      }}
    >
      {/* Decorative background glow sphere */}
      <div 
        className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-25 transition-all duration-500"
        style={{ backgroundColor: glowColor }}
      />

      <div className="flex justify-between items-start mb-4">
        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-xl ${colorClass} bg-slate-900/80 border border-slate-800/80 shadow-md`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline space-x-1.5">
        <span className="text-3xl font-extrabold text-white tracking-tight">
          {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value}
        </span>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{unit}</span>
      </div>
    </div>
  );
};

export default StatCard;
