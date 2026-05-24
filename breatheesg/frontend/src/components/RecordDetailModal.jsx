import React, { useState, useEffect } from 'react';
import * as api from '../api/endpoints';
import { 
  X, 
  History, 
  User, 
  Calendar, 
  Activity, 
  FileText,
  AlertCircle,
  CheckCircle,
  Eye
} from 'lucide-react';

const RecordDetailModal = ({ recordId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch detailed record which includes nest audit_logs
        const recordsList = await api.getRecords({ id: recordId });
        // Since we retrieve detail by id, we can fetch record detail
        // Wait, our viewset maps /api/records/{id}/ as detail retrieval!
        // We can fetch via client directly or client.get(`/api/records/${recordId}/`)
        // Let's use our client through endpoints or import client
        // Wait, let's call client directly or define an endpoint. We already have:
        // getRecords(params) which can be used, or we can fetch manually.
        // Let's create an endpoint in endpoints.js or invoke custom get.
        // Let's check client import. We can import standard client.
        const response = await import('../api/client').then(m => m.default.get(`/api/records/${recordId}/`));
        setRecord(response.data);
      } catch (err) {
        setError('Failed to load audit history details.');
      } finally {
        setLoading(false);
      }
    };

    if (recordId) {
      fetchDetail();
    }
  }, [recordId]);

  if (!recordId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all duration-300">
      <div className="w-full max-w-2xl glass-panel rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col max-h-[85svh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center space-x-3">
            <div className="bg-brand-500/10 text-brand-400 p-2 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-none">Governance Audit Trail</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Record ID: {recordId.substring(0, 8)}...</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-850 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            // Shimmer Loading Skeleton
            <div className="space-y-6 py-2">
              <div className="h-6 w-1/3 shimmer rounded-lg" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-16 shimmer rounded-xl" />
                <div className="h-16 shimmer rounded-xl" />
              </div>
              <div className="space-y-4">
                <div className="h-4 w-1/4 shimmer rounded-md" />
                <div className="h-12 shimmer rounded-xl" />
                <div className="h-12 shimmer rounded-xl" />
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
              <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
              <p className="font-semibold text-lg">{error}</p>
            </div>
          ) : record ? (
            <>
              {/* Basic overview card */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800/50 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Calculation Base</span>
                  <p className="text-base font-bold text-white mt-1">
                    {record.activity_value.toLocaleString()} {record.activity_unit}
                  </p>
                  <span className="text-xs text-slate-400 mt-1">{record.emission_factor_details?.name}</span>
                </div>
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800/50 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Computed Emissions</span>
                  <p className="text-base font-extrabold text-brand-400 mt-1">
                    {parseFloat(record.co2e_kg).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg CO2e
                  </p>
                  <span className="text-xs text-slate-400 mt-1">Scope {record.scope} &middot; {record.category_display}</span>
                </div>
              </div>

              {/* Collapsible raw data container */}
              <div>
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="w-full flex items-center justify-between bg-slate-900/50 px-4 py-3 rounded-xl border border-slate-800/50 hover:bg-slate-900 transition-all font-semibold text-sm"
                >
                  <div className="flex items-center space-x-2 text-slate-300">
                    <FileText className="w-4 h-4" />
                    <span>View original raw upload fields</span>
                  </div>
                  <Eye className="w-4 h-4 text-slate-400" />
                </button>
                {showRawJson && (
                  <pre className="mt-3 bg-slate-950 p-4 rounded-xl border border-slate-900 text-xs text-slate-300 overflow-x-auto font-mono max-h-40 leading-relaxed">
                    {JSON.stringify(record.source_raw_json, null, 2)}
                  </pre>
                )}
              </div>

              {/* Timeline of Auditing Trail */}
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Governance Timeline</h4>
                <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-850">
                  {record.audit_logs && record.audit_logs.length > 0 ? (
                    record.audit_logs.map((log) => {
                      const isCreate = log.action === 'CREATE';
                      const isApprove = log.new_value.includes("APPROVED") || log.action === 'APPROVE';
                      const isFlag = log.new_value.includes("FLAGGED") || log.action === 'FLAG';
                      
                      let markerColor = "bg-brand-500 text-brand-950 ring-brand-500/20";
                      let Icon = Activity;
                      
                      if (isCreate) {
                        markerColor = "bg-slate-800 text-slate-300 ring-slate-800/20";
                        Icon = FileText;
                      } else if (isApprove) {
                        markerColor = "bg-emerald-500 text-emerald-950 ring-emerald-500/20";
                        Icon = CheckCircle;
                      } else if (isFlag) {
                        markerColor = "bg-rose-500 text-rose-950 ring-rose-500/20";
                        Icon = AlertCircle;
                      }

                      return (
                        <div key={log.id} className="flex space-x-4 relative">
                          {/* Timeline dot */}
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ring-4 z-10 flex-shrink-0 ${markerColor}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          
                          {/* Details card */}
                          <div className="flex-1 bg-slate-900/20 p-4 rounded-xl border border-slate-800/40">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                {log.action}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold">
                                {new Date(log.changed_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-slate-300 font-medium">{log.new_value}</p>
                            <div className="flex items-center space-x-1.5 mt-2 text-[10px] text-slate-500 font-bold">
                              <User className="w-3.5 h-3.5" />
                              <span>Actioned by: {log.changed_by_username || 'System automatic'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500 italic">No audit trail records found.</p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RecordDetailModal;
