import React, { useState, useEffect } from 'react';
import * as api from '../api/endpoints';
import RecordDetailModal from '../components/RecordDetailModal';
import { 
  Check, 
  Flag, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  History, 
  AlertCircle, 
  Search,
  ArrowUpDown
} from 'lucide-react';

const Review = () => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [error, setError] = useState(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        status: statusFilter || undefined,
        scope: scopeFilter || undefined,
        category: categoryFilter || undefined
      };
      
      const data = await api.getRecords(params);
      
      // DRF standard paginated returns or list
      if (data.results) {
        setRecords(data.results);
        setHasMore(!!data.next);
      } else {
        setRecords(data);
        setHasMore(false);
      }
    } catch (err) {
      setError('Failed to fetch governance records list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, scopeFilter, categoryFilter, page]);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleApprove = async (id) => {
    try {
      await api.updateRecordStatus(id, 'APPROVED');
      // Refresh list to update state
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve record.');
    }
  };

  const handleFlag = async (id) => {
    const reason = prompt('Specify the investigator reason for flagging this row:');
    if (!reason || !reason.trim()) {
      return; // cancelled or empty
    }

    try {
      await api.updateRecordStatus(id, 'FLAGGED', reason);
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to flag record.');
    }
  };

  const getStatusBadge = (statusVal) => {
    const maps = {
      'PENDING': 'text-amber-400 bg-amber-400/10 border-amber-500/20',
      'FLAGGED': 'text-rose-400 bg-rose-400/10 border-rose-500/20 animate-pulse',
      'APPROVED': 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
      'LOCKED': 'text-slate-400 bg-slate-400/10 border-slate-500/20'
    };
    return maps[statusVal] || 'text-slate-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white m-0">Governance Ledger</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Audit, Review, Flag and lock carbon metrics</p>
        </div>
      </div>

      {/* Filter controls panel */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-850 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Scope Scope</label>
          <select 
            value={scopeFilter}
            onChange={(e) => { setScopeFilter(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold py-2.5 px-3.5 rounded-xl outline-none"
          >
            <option value="">All Scopes</option>
            <option value="1">Scope 1 (Direct Fuel)</option>
            <option value="2">Scope 2 (Indirect Elec)</option>
            <option value="3">Scope 3 (Travel chain)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold py-2.5 px-3.5 rounded-xl outline-none"
          >
            <option value="">All Categories</option>
            <option value="FUEL">Fuel Procurement</option>
            <option value="ELECTRICITY">Electricity meters</option>
            <option value="FLIGHT">Flight Expense</option>
            <option value="HOTEL">Hotel Stay</option>
            <option value="GROUND_TRANSPORT">Ground Transport</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Review Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold py-2.5 px-3.5 rounded-xl outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Audit</option>
            <option value="FLAGGED">Flagged suspicious</option>
            <option value="APPROVED">Approved</option>
            <option value="LOCKED">Audit Locked</option>
          </select>
        </div>

        <button
          onClick={() => { setStatusFilter(''); setScopeFilter(''); setCategoryFilter(''); setPage(1); }}
          className="bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 text-center transition-all h-[42px]"
        >
          Reset Filters
        </button>
      </div>

      {/* Main Ledger Table */}
      <div className="glass-panel rounded-3xl border border-slate-850 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/40 border-b border-slate-850 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="px-6 py-4 w-12" />
                <th className="px-6 py-4">Scope</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Quantity</th>
                <th className="px-6 py-4 text-right">Normalized</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-sm">
              {loading ? (
                // Shimmer rows
                [1, 2, 3].map(n => (
                  <tr key={n}>
                    <td colSpan={7} className="px-6 py-5">
                      <div className="h-5 shimmer rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : records && records.length > 0 ? (
                records.map((record) => {
                  const isExpanded = !!expandedRows[record.id];
                  const co2eFormatted = parseFloat(record.co2e_kg).toLocaleString(undefined, { maximumFractionDigits: 1 });
                  
                  return (
                    <React.Fragment key={record.id}>
                      <tr className={`hover:bg-slate-900/30 transition-all ${isExpanded ? 'bg-slate-900/20' : ''}`}>
                        {/* Expand row arrow */}
                        <td className="px-6 py-4">
                          <button onClick={() => toggleRow(record.id)} className="text-slate-500 hover:text-slate-300">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>

                        {/* Scope */}
                        <td className="px-6 py-4 font-semibold text-slate-300">
                          Scope {record.scope}
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-300">{record.category_display}</span>
                          <span className="text-[10px] text-slate-500 block uppercase font-bold mt-0.5 truncate max-w-[140px]">
                            {record.data_source_file_name || 'Manual Entry'}
                          </span>
                        </td>

                        {/* Raw Activity Quantity */}
                        <td className="px-6 py-4 text-right font-medium text-slate-300 font-mono">
                          {parseFloat(record.activity_value).toLocaleString()} <span className="text-[10px] text-slate-500 font-sans uppercase font-bold">{record.activity_unit}</span>
                        </td>

                        {/* Normalized CO2e Emissions */}
                        <td className="px-6 py-4 text-right font-extrabold text-brand-400 font-mono">
                          {co2eFormatted} <span className="text-[10px] text-slate-500 font-sans uppercase font-bold">kg CO2e</span>
                        </td>

                        {/* Review State Status Badge */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider leading-none ${getStatusBadge(record.status)}`}>
                            {record.status_display}
                          </span>
                          {record.status === 'FLAGGED' && (
                            <span className="text-[10px] text-rose-500 block mt-1 font-semibold max-w-[150px] truncate" title={record.flag_reason}>
                              {record.flag_reason}
                            </span>
                          )}
                        </td>

                        {/* Analyst Decisions Actions */}
                        <td className="px-6 py-4 flex space-x-2">
                          <button
                            onClick={() => setSelectedRecordId(record.id)}
                            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg transition-all"
                            title="Audit Trail History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          
                          {record.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(record.id)}
                                className="p-2 bg-emerald-950/20 border border-emerald-900/40 hover:bg-emerald-500 text-emerald-400 hover:text-emerald-950 rounded-lg transition-all"
                                title="Approve Record"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleFlag(record.id)}
                                className="p-2 bg-rose-950/20 border border-rose-900/40 hover:bg-rose-500 text-rose-400 hover:text-rose-950 rounded-lg transition-all"
                                title="Flag Record"
                              >
                                <Flag className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>

                      {/* Expanding Original JSON Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950 border-y border-slate-900">
                          <td colSpan={7} className="px-8 py-5">
                            <div className="space-y-3">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Original raw upload parameters</p>
                              <pre className="p-4 bg-slate-900/40 border border-slate-850 rounded-xl font-mono text-xs text-slate-400 overflow-x-auto leading-relaxed">
                                {JSON.stringify(record.source_raw_json, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
                    No carbon footprint records match active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination navigations */}
        {hasMore || page > 1 ? (
          <div className="flex justify-between items-center px-6 py-4 bg-slate-900/20 border-t border-slate-850">
            <button
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 text-slate-300 disabled:text-slate-600 border border-slate-800 text-xs font-semibold rounded-xl transition-all"
            >
              Previous Page
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Page {page}
            </span>
            <button
              disabled={!hasMore}
              onClick={() => setPage(prev => prev + 1)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 text-slate-300 disabled:text-slate-600 border border-slate-800 text-xs font-semibold rounded-xl transition-all"
            >
              Next Page
            </button>
          </div>
        ) : null}
      </div>

      {/* History details Modal */}
      {selectedRecordId && (
        <RecordDetailModal 
          recordId={selectedRecordId}
          onClose={() => setSelectedRecordId(null)}
        />
      )}
    </div>
  );
};

export default Review;
