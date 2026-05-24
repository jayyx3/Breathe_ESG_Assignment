import React, { useState, useEffect } from 'react';
import * as api from '../api/endpoints';
import StatCard from '../components/StatCard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  Flame, 
  Zap, 
  Plane, 
  AlertTriangle, 
  CheckSquare, 
  FileSpreadsheet, 
  Clock, 
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.getDashboardSummary();
        setData(res);
      } catch (err) {
        setError('Failed to refresh carbon statistics.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Shimmer headers */}
        <div className="h-8 w-1/4 shimmer rounded-lg" />
        {/* Shimmer Stat Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-32 shimmer rounded-2xl" />)}
        </div>
        {/* Shimmer Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 shimmer rounded-3xl" />
          <div className="h-80 shimmer rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-slate-900/10 rounded-3xl border border-slate-800/40">
        <p className="text-rose-400 font-semibold text-lg">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-brand-500 hover:bg-brand-600 rounded-xl font-bold"
        >
          Retry Load
        </button>
      </div>
    );
  }

  const { totals_by_scope, counts_by_status, totals_by_category, recent_uploads, grand_total_co2e_kg } = data || {};

  // Formulate data structures for charting
  const scopeChartData = [
    { name: 'Scope 1 (Direct)', co2e: totals_by_scope?.['1'] || 0 },
    { name: 'Scope 2 (Indirect)', co2e: totals_by_scope?.['2'] || 0 },
    { name: 'Scope 3 (Travel)', co2e: totals_by_scope?.['3'] || 0 },
  ];

  const categoryChartData = Object.entries(totals_by_category || {}).map(([key, val]) => ({
    name: key.replace('_', ' '),
    co2e: val
  }));

  return (
    <div className="space-y-8">
      {/* Welcome Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white m-0">Carbon Analytics Center</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time Greenhouse Gas Normalization</p>
        </div>
        <div className="flex items-center space-x-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>UK DESNZ 2023 Compliant</span>
        </div>
      </div>

      {/* Main KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Carbon Footprint"
          value={grand_total_co2e_kg}
          unit="kg CO2e"
          icon={TrendingUp}
          colorClass="text-brand-400"
          glowColor="rgba(34, 197, 94, 0.2)"
        />
        <StatCard 
          title="Scope 1 Direct (Fuel)"
          value={totals_by_scope?.['1']}
          unit="kg CO2e"
          icon={Flame}
          colorClass="text-amber-400 animate-pulse"
          glowColor="rgba(245, 158, 11, 0.15)"
        />
        <StatCard 
          title="Scope 2 Indirect (Elec)"
          value={totals_by_scope?.['2']}
          unit="kg CO2e"
          icon={Zap}
          colorClass="text-sky-400"
          glowColor="rgba(56, 189, 248, 0.15)"
        />
        <StatCard 
          title="Scope 3 Travel (Concur)"
          value={totals_by_scope?.['3']}
          unit="kg CO2e"
          icon={Plane}
          colorClass="text-violet-400"
          glowColor="rgba(167, 139, 250, 0.15)"
        />
      </div>

      {/* Review governance overview blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Awaiting Audit</span>
            <p className="text-2xl font-extrabold text-white mt-1">{counts_by_status?.PENDING || 0}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center justify-between border-l-4 border-l-rose-500">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Flagged Suspicious</span>
            <p className="text-2xl font-extrabold text-white mt-1">{counts_by_status?.FLAGGED || 0}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Verified Approved</span>
            <p className="text-2xl font-extrabold text-white mt-1">{counts_by_status?.APPROVED || 0}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scope Area Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-850 shadow-xl flex flex-col justify-between h-[380px] min-w-0">
          <div>
            <h3 className="text-base font-bold text-white leading-none">Emission Spread by Scope</h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">Greenhouse Gas Protocol breakdown</span>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scopeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scopeGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="co2e" stroke="#22c55e" strokeWidth={2.5} fillOpacity={1} fill="url(#scopeGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Bar Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-850 shadow-xl flex flex-col justify-between h-[380px] min-w-0">
          <div>
            <h3 className="text-base font-bold text-white leading-none">Activity Category Contribution</h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">Detailed operational factors contribution</span>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Bar dataKey="co2e" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent CSV Uploads audit registry */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-850 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-bold text-white leading-none">Recent Sources Ingested</h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">Audited spreadsheet upload history</span>
          </div>
          <FileSpreadsheet className="w-5 h-5 text-slate-500" />
        </div>

        <div className="divide-y divide-slate-850">
          {recent_uploads && recent_uploads.length > 0 ? (
            recent_uploads.map((upload) => (
              <div key={upload.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                <div className="flex items-center space-x-3.5 overflow-hidden">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-brand-400">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-slate-200 truncate">{upload.file_name}</p>
                    <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                      <span>Source: {upload.source_type_display}</span>
                      <span>&bull;</span>
                      <span>By: {upload.uploaded_by_details?.username || 'admin'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="inline-flex items-center px-2 py-0.5 bg-slate-900 border border-slate-850 rounded-lg text-xs font-bold text-slate-400">
                    {upload.row_count} rows
                  </span>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    {new Date(upload.uploaded_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 italic py-4">No CSV source files uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
