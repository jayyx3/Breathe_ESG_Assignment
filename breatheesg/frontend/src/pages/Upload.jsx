import React, { useState, useRef } from 'react';
import * as api from '../api/endpoints';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Clipboard,
  Flame, 
  Zap, 
  Plane,
  Download
} from 'lucide-react';

const Upload = () => {
  const [activeTab, setActiveTab] = useState('SAP'); // 'SAP' | 'UTILITY' | 'TRAVEL'
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const tabs = [
    { id: 'SAP', label: 'SAP Procurement', desc: 'Scope 1 Fuel & Gas flat export', icon: Flame, color: 'text-amber-400' },
    { id: 'UTILITY', label: 'Utility Portal', desc: 'Scope 2 Electricity meters download', icon: Zap, color: 'text-sky-400' },
    { id: 'TRAVEL', label: 'Corporate Travel', desc: 'Scope 3 Concur travel expenses CSV', icon: Plane, color: 'text-violet-400' },
  ];

  // Helper template strings so analysts can instantly create test files!
  const CSV_TEMPLATES = {
    SAP: `Buchungsdatum;Werk;Material;Menge;Meins;Bwart
24.05.2026;1000;B0001;500.00;L;101
24.05.2026;2000;B0002;120.00;GAL;101
25.05.2026;3000;B0003;1500.00;M3;101`,
    
    UTILITY: `account_number,meter_id,service_address,billing_period_start,billing_period_end,usage_kwh,demand_kw,tariff_code,total_cost,currency
ACC-12345,METER-99,Munich HQ,2026-01-15,2026-02-14,4500.00,8.5,E-1,950.00,EUR
ACC-12345,METER-99,Munich HQ,2026-02-15,2026-03-14,3800.00,,E-1,800.00,EUR`,
    
    TRAVEL: `trip_id,employee_id,travel_date,origin,destination,travel_mode,distance_km,airline_class,hotel_nights,hotel_city,cost,currency
TRIP-101,EMP-20,2026-04-10,MUC,LHR,FLIGHT,,BUSINESS,,,400.00,EUR
TRIP-102,EMP-45,2026-04-12,JFK,SFO,FLIGHT,4150.00,ECONOMY,,,650.00,USD
TRIP-103,EMP-20,2026-04-10,,,HOTEL,,3,,London,450.00,GBP
TRIP-104,EMP-50,2026-04-15,,,TAXI,,,25.50,,50.00,EUR`
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV spreadsheet files are accepted.');
      setSuccess(null);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await api.uploadCSV(activeTab, file);
      setSuccess({
        fileName: file.name,
        rows: data.rows_processed,
        sourceId: data.data_source_id
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process and normalize the CSV file.');
    } finally {
      setUploading(false);
    }
  };

  const copyTemplateToClipboard = () => {
    navigator.clipboard.writeText(CSV_TEMPLATES[activeTab]);
    alert('Mock template CSV content copied to clipboard! You can paste this in a text file and save it as .csv.');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white m-0">CSV Data Ingestor</h2>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Upload and automatically convert emissions metrics</p>
      </div>

      {/* Tabs navigation */}
      <div className="grid grid-cols-3 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setError(null);
                setSuccess(null);
              }}
              className={`p-5 text-left rounded-3xl transition-all duration-300 flex flex-col justify-between h-36 glass-panel border ${
                isSelected 
                  ? 'border-brand-500/40 bg-brand-500/5 shadow-lg shadow-brand-500/5 scale-[1.01]' 
                  : 'border-slate-800/80 hover:bg-slate-900/40'
              }`}
            >
              <div className={`p-2 rounded-xl bg-slate-900/80 border border-slate-800 w-fit ${tab.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">{tab.label}</p>
                <p className="text-xs text-slate-500 mt-1">{tab.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Drag & Drop landing container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`glass-panel border-2 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[320px] transition-all duration-300 relative ${
              dragActive 
                ? 'border-brand-500 bg-brand-500/5 scale-[1.005]' 
                : 'border-slate-800 hover:border-slate-700/80'
            }`}
          >
            {uploading ? (
              <div className="space-y-4">
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="font-semibold text-slate-300">Processing and converting raw metrics...</p>
                <p className="text-xs text-slate-500">Mapping UK DESNZ coefficients & verifying multi-tenant keys</p>
              </div>
            ) : success ? (
              <div className="space-y-4 flex flex-col items-center">
                <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-full border border-emerald-500/20">
                  <CheckCircle className="w-10 h-10 animate-bounce" />
                </div>
                <h3 className="text-lg font-bold text-white">Spreadsheet Ingested Successfully!</h3>
                <div className="text-sm text-slate-400 max-w-md">
                  <p className="font-semibold text-slate-300">File: {success.fileName}</p>
                  <p className="mt-1">Inserted <span className="text-brand-400 font-bold">{success.rows} normalized rows</span> linked to Source ID: {success.sourceId.substring(0, 8)}...</p>
                </div>
                <button
                  onClick={() => setSuccess(null)}
                  className="mt-2 px-5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-xl text-xs font-bold transition-all text-slate-300"
                >
                  Upload another file
                </button>
              </div>
            ) : (
              <>
                <UploadCloud className="w-12 h-12 text-brand-400 mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-white mb-2">Drag and drop your export CSV</h3>
                <p className="text-xs text-slate-500 mb-6">File format must end with .csv (max size 25MB)</p>
                
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-2xl transition-all duration-300 shadow-md shadow-brand-500/10"
                >
                  Select File from Computer
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </>
            )}

            {error && (
              <div className="absolute inset-x-6 bottom-6 flex items-center space-x-2.5 bg-rose-950/20 border border-rose-900/30 text-rose-400 p-4 rounded-2xl text-xs font-semibold text-left">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Copy-paste Templates sidebar */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-850 flex flex-col justify-between h-fit">
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Seeding Test Template</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              To test the parser's validation rules, copy the mock database row template below and save it as a text `.csv` file.
            </p>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-[10px] text-slate-400 font-mono overflow-x-auto select-all leading-normal">
              {CSV_TEMPLATES[activeTab]}
            </pre>
          </div>
          <button
            onClick={copyTemplateToClipboard}
            className="w-full mt-6 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white px-4 py-3 rounded-2xl transition-all font-semibold text-xs text-slate-300 flex justify-center items-center space-x-2"
          >
            <Clipboard className="w-4 h-4" />
            <span>Copy Mock Template</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Upload;
