
import React, { useState } from 'react';
import { scanForMigrations, executeMigration, MigrationPlan } from '../../src/services/migrationService';

const MigrationTool: React.FC = () => {
    const [plans, setPlans] = useState<MigrationPlan[]>([]);
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{success: number, failed: number} | null>(null);

    const handleScan = async () => {
        setLoading(true);
        const data = await scanForMigrations();
        setPlans(data);
        setScanned(true);
        setLoading(false);
    };

    const handleExecute = async () => {
        if(!confirm(`Are you sure you want to update ${plans.length} member ledgers? This action logs opening balances.`)) return;
        setLoading(true);
        const res = await executeMigration(plans);
        setResult(res);
        setPlans([]); // clear executed
        setLoading(false);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Legacy Migration Tool</h2>
                        <p className="text-sm text-slate-500">Import Opening Balances from Legacy system to Ledger.</p>
                    </div>
                    {!scanned && (
                        <button 
                            onClick={handleScan}
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Scanning...' : 'Scan for Discrepancies'}
                        </button>
                    )}
                </div>

                {result && (
                    <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                        Migration Complete: {result.success} succeeded, {result.failed} failed.
                    </div>
                )}

                {scanned && (
                    <>
                        <div className="overflow-x-auto mb-6">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Member</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Legacy Bal</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ledger Bal</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Adjustment Needed</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {plans.map(plan => (
                                        <tr key={plan.memberId}>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{plan.memberName}</td>
                                            <td className="px-6 py-4 text-sm text-right text-slate-600">${plan.legacyBalance}</td>
                                            <td className="px-6 py-4 text-sm text-right text-slate-600">${plan.ledgerBalance}</td>
                                            <td className="px-6 py-4 text-sm text-right font-bold text-indigo-600">
                                                {plan.proposedAdjustment > 0 ? '+' : ''}{plan.proposedAdjustment}
                                            </td>
                                        </tr>
                                    ))}
                                    {plans.length === 0 && (
                                        <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500">No migrations needed. All clean.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {plans.length > 0 && (
                            <div className="flex justify-end gap-3">
                                <button onClick={() => {setScanned(false); setPlans([])}} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
                                <button 
                                    onClick={handleExecute}
                                    disabled={loading}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Commit Opening Balances'}
                                </button>
                            </div>
                        )}
                    </>
                )}
             </div>
        </div>
    );
};

export default MigrationTool;
