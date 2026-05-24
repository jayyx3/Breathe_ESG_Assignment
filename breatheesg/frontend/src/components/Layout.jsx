import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  UploadCloud, 
  ClipboardList, 
  LogOut, 
  Leaf, 
  User 
} from 'lucide-react';

const Layout = ({ currentTab, setCurrentTab, children }) => {
  const { user, logoutUser } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Analytics Panel', icon: LayoutDashboard },
    { id: 'upload', label: 'CSV Ingestor', icon: UploadCloud },
    { id: 'review', label: 'Governance Review', icon: ClipboardList },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 glass-panel border-r border-slate-800/80 flex flex-col justify-between p-6 fixed h-full z-20">
        <div>
          {/* Logo brand */}
          <div className="flex items-center space-x-3 mb-8 px-2">
            <div className="bg-brand-500/20 text-brand-400 p-2 rounded-xl border border-brand-500/30">
              <Leaf className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white m-0 leading-none">BreatheESG</h1>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Ingestor Pro</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                    isActive 
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 scale-[1.02]' 
                      : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-100 hover:translate-x-1'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Session and Logout */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
            <div className="bg-slate-800 p-2 rounded-lg text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">Analyst Active</p>
              <p className="text-sm font-semibold text-slate-200 truncate leading-none">{user?.username || 'admin'}</p>
            </div>
          </div>

          <button
            onClick={logoutUser}
            className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/40 px-4 py-3 rounded-xl transition-all duration-300 font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>Secure Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 min-h-screen p-8 bg-slate-950 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
