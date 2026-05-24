import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

const Login = () => {
  const { loginUser, loading, error, setError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    try {
      await loginUser(username, password);
    } catch (err) {
      // Handled by AuthContext error state
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Sustainability Glowing Ambient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl -z-10 animate-pulse duration-[10s]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl -z-10 animate-pulse duration-[15s]" />

      <div className="w-full max-w-md space-y-8 z-10">
        {/* Branding header */}
        <div className="flex flex-col items-center text-center">
          <div className="bg-brand-500/10 text-brand-400 p-4 rounded-3xl border border-brand-500/20 shadow-xl mb-4 transition-all hover:scale-105 duration-300">
            <Leaf className="w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight m-0">BreatheESG Ingestor</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">Carbon Data Governance Platform</p>
        </div>

        {/* Login Card Form */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-850 shadow-2xl relative">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center space-x-2.5 bg-rose-950/20 border border-rose-900/30 text-rose-400 p-4 rounded-2xl text-sm font-medium">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full glass-input pl-11 pr-4 py-3.5 rounded-2xl text-white outline-none transition-all duration-300 text-sm"
                  placeholder="e.g. admin"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input pl-11 pr-4 py-3.5 rounded-2xl text-white outline-none transition-all duration-300 text-sm"
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                />
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-800 text-white font-semibold py-4 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/20 hover:scale-[1.01] flex justify-center items-center space-x-2 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Unlock System</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footnote */}
        <p className="text-center text-xs text-slate-600 font-bold uppercase tracking-wider">
          Default Testing: admin / password123
        </p>
      </div>
    </div>
  );
};

export default Login;
