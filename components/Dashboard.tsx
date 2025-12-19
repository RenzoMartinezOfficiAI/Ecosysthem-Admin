import React, { useState } from 'react';
import { House, Member, SystemError, HouseStatus } from '../types';
import { analyzeSystemError } from '../services/geminiService';

interface DashboardProps {
  houses: House[];
  members: Member[];
  errors: SystemError[];
}

const Dashboard: React.FC<DashboardProps> = ({ houses, members, errors }) => {
  const [analyzingErrorId, setAnalyzingErrorId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<Record<string, string>>({});

  const totalCapacity = houses.reduce((acc, h) => acc + h.capacity, 0);
  const activeMembers = members.filter(m => m.status === 'ACTIVE').length;
  const occupancyRate = totalCapacity > 0 ? Math.round((activeMembers / totalCapacity) * 100) : 0;
  const outstandingBalanceCount = members.filter(m => m.hasOutstandingBalance).length;

  const handleAnalyzeError = async (error: SystemError) => {
    setAnalyzingErrorId(error.id);
    const result = await analyzeSystemError(error);
    setAnalysisResult(prev => ({ ...prev, [error.id]: result }));
    setAnalyzingErrorId(null);
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Occupancy Card */}
        <div className="bg-matte-900 p-6 rounded-xl shadow-sm border border-matte-800">
          <div className="text-gray-400 text-sm font-medium uppercase tracking-wide">Occupancy</div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white glow-text">{occupancyRate}%</span>
            <span className="text-sm text-gray-400">{activeMembers}/{totalCapacity} Beds</span>
          </div>
          <div className="mt-2 w-full bg-matte-800 rounded-full h-1.5 border border-matte-700">
            <div className="bg-neon-green h-1.5 rounded-full shadow-glow-green" style={{ width: `${occupancyRate}%` }}></div>
          </div>
        </div>

        {/* Houses Online Card */}
        <div className="bg-matte-900 p-6 rounded-xl shadow-sm border border-matte-800">
          <div className="text-gray-400 text-sm font-medium uppercase tracking-wide">Houses Online</div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white glow-text">
              {houses.filter(h => h.status === HouseStatus.ONLINE).length}
            </span>
            <span className="text-sm text-gray-400">/ {houses.length} Total</span>
          </div>
        </div>

        {/* Billing Issues Card - Warning color maintained for logic */}
        <div className="bg-matte-900 p-6 rounded-xl shadow-sm border border-matte-800">
           <div className="text-gray-400 text-sm font-medium uppercase tracking-wide">Billing Issues</div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-amber-500 glow-text">{outstandingBalanceCount}</span>
            <span className="text-sm text-gray-400">Members Owe</span>
          </div>
        </div>

        {/* System Alerts Card - Error color maintained */}
        <div className="bg-matte-900 p-6 rounded-xl shadow-sm border border-matte-800">
           <div className="text-gray-400 text-sm font-medium uppercase tracking-wide">System Alerts</div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-red-500 glow-text">{errors.length}</span>
            <span className="text-sm text-gray-400">Active</span>
          </div>
        </div>
      </div>

      {/* System Health / Errors Section */}
      <div className="bg-matte-900 rounded-xl shadow-sm border border-matte-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-matte-800 flex justify-between items-center bg-matte-900/50">
          <h2 className="font-semibold text-white tracking-wide">System Health & Alerts</h2>
          {errors.length > 0 && (
            <span className="text-xs px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full font-bold uppercase tracking-wider">Attention Needed</span>
          )}
        </div>
        <div className="divide-y divide-matte-800">
          {errors.length === 0 ? (
            <div className="p-8 text-center text-gray-400">System is healthy. No active alerts.</div>
          ) : (
            errors.map(error => (
              <div key={error.id} className="p-6 hover:bg-matte-800/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-4">
                    <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{error.type} Error</h3>
                      <p className="text-sm text-gray-400 mt-1">{error.message}</p>
                      <div className="text-xs text-gray-500 mt-2 font-mono">
                        ID: {error.id} • {new Date(error.createdAt).toLocaleString()}
                      </div>
                      
                      {/* Context Data Display */}
                      {error.context && (
                        <div className="mt-2 p-2 bg-matte-950 rounded text-xs font-mono text-gray-400 border border-matte-800 max-w-lg">
                          {JSON.stringify(error.context, null, 2)}
                        </div>
                      )}

                      {/* AI Analysis Result */}
                      {analysisResult[error.id] && (
                         <div className="mt-3 p-3 bg-neon-purple/5 border border-neon-purple/20 rounded-lg">
                            <div className="flex items-center space-x-2 mb-1">
                                <svg className="w-4 h-4 text-neon-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span className="text-xs font-bold text-neon-purple uppercase tracking-wide">Gemini Analysis</span>
                            </div>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{analysisResult[error.id]}</p>
                         </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAnalyzeError(error)}
                    disabled={analyzingErrorId === error.id}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-matte-800 border border-matte-700 rounded text-xs font-bold text-neon-purple hover:bg-neon-purple/10 hover:border-neon-purple transition-all disabled:opacity-50 shadow-glow-purple"
                  >
                    {analyzingErrorId === error.id ? (
                        <>
                          <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Analyzing...</span>
                        </>
                    ) : (
                        <>
                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                         </svg>
                         <span>Analyze with AI</span>
                        </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;