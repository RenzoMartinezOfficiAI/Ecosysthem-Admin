import React, { useState } from 'react';
import { UserRole, SystemError } from '../../types';
import { compareLegacyAndLedgerBalances } from '../../src/services/ledgerSimulation';

interface FinancialIntegrityProps {
  userRole: UserRole;
}

const FinancialIntegrity: React.FC<FinancialIntegrityProps> = ({ userRole }) => {
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  if (![UserRole.ADMIN, UserRole.OPERATIONS_MANAGER].includes(userRole)) {
     return <div className="p-8 text-center text-slate-500">Access Denied</div>;
  }

  const handleRunComparison = async () => {
    setLoading(true);
    try {
      const results = await compareLegacyAndLedgerBalances();
      setDiscrepancies(results);
      setLastRun(new Date().toLocaleString());
    } catch (e) {
      console.error(e);
      alert('Failed to run comparison job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold">Phase B: Financial Integrity Monitor</h2>
            <p className="text-slate-400 text-sm">Shadow Ledger Verification & Drift Detection</p>
        </div>
        <div className="text-right">
             <button 
                onClick={handleRunComparison}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
             >
                {loading && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                Run Balance Comparison
             </button>
             {lastRun && <div className="text-xs text-slate-500 mt-1">Last run: {lastRun}</div>}
        </div>
      </div>

      {discrepancies.length > 0 ? (
          <div className="bg-white rounded-xl shadow border border-rose-200 overflow-hidden">
             <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex justify-between">
                <h3 className="text-rose-800 font-bold flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {discrepancies.length} Discrepancies Found
                </h3>
             </div>
             <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Member</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Legacy Bal</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ledger Bal</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Diff</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {discrepancies.map(d => (
                        <tr key={d.memberId} className="hover:bg-slate-50">
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{d.name}</td>
                            <td className="px-6 py-4 text-sm text-right text-slate-600">${d.legacy}</td>
                            <td className="px-6 py-4 text-sm text-right text-slate-600">${d.ledger}</td>
                            <td className="px-6 py-4 text-sm text-right font-bold text-rose-600">
                                {d.diff > 0 ? '+' : ''}{d.diff}
                            </td>
                            <td className="px-6 py-4 text-sm text-right">
                                <button className="text-indigo-600 hover:text-indigo-900 font-medium">Investigate</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
      ) : (
          <div className="bg-white rounded-xl shadow border border-slate-200 p-12 text-center">
             <div className="inline-block p-3 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
             </div>
             <h3 className="text-lg font-medium text-slate-900">System Integrity Healthy</h3>
             <p className="text-slate-500 mt-2">No discrepancies detected between Legacy and Ledger balances.</p>
          </div>
      )}
    </div>
  );
};

export default FinancialIntegrity;