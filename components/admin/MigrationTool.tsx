
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
             <div className="bg-matte-900 p-6 rounded-xl shadow-sm border border-matte-800">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white glow-text">Legacy Migration Tool</h2>
                        <p className="text-sm text-gray-400">Import Opening Balances from Legacy system to Ledger.</p>
                    </div>
                    {!scanned && (
                        <button 
                            onClick={handleScan}
                            disabled={loading}
                            className="px-4 py-2 bg-neon-blue text-matte-950 rounded-lg font-bold hover:bg-cyan-400 shadow-glow-blue disabled:opacity-50 transition-all"
                        >
                            {loading ? 'Scanning...' : 'Scan for Discrepancies'}
                        </button>
                    )}
                </div>

                {result && (
                    <div className="mb-6 p-4 bg-neon-green/10 text-neon-green rounded-lg border border-neon-green/20">
                        Migration Complete: {result.success} succeeded, {result.failed} failed.
                    </div>
                )}

                {scanned && (
                    <>
                        <div className="overflow-x-auto mb-6">
                            <table className="min-w-full divide-y divide-matte-800">
                                <thead className="bg-matte-900/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Legacy Bal</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ledger Bal</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Adjustment Needed</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-matte-900 divide-y divide-matte-800">
                                    {plans.map(plan => (
                                        <tr key={plan.memberId} className="hover:bg-matte-800/30 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-white">{plan.memberName}</td>
                                            <td className="px-6 py-4 text-sm text-right text-gray-400">${plan.legacyBalance}</td>
                                            <td className="px-6 py-4 text-sm text-right text-gray-400">${plan.ledgerBalance}</td>
                                            <td className="px-6 py-4 text-sm text-right font-bold text-neon-blue">
                                                {plan.proposedAdjustment > 0 ? '+' : ''}{plan.proposedAdjustment}
                                            </td>
                                        </tr>
                                    ))}
                                    {plans.length === 0 && (
                                        <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No migrations needed. All clean.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {plans.length > 0 && (
                            <div className="flex justify-end gap-3">
                                <button onClick={() => {setScanned(false); setPlans([])}} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button 
                                    onClick={handleExecute}
                                    disabled={loading}
                                    className="px-4 py-2 bg-neon-green text-matte-950 rounded-lg font-bold hover:bg-lime-400 shadow-glow-green disabled:opacity-50 transition-all"
                                >
                                    {loading ? 'Processing...' : 'Commit Opening Balances'}
                                </button>
                            </div>
                        )}
                        
                        {plans.length === 0 && (
                            <div className="flex justify-end gap-3">
                                <button onClick={() => {setScanned(false); setPlans([])}} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Close</button>
                            </div>
                        )}
                    </>
                )}
             </div>
        </div>
    );
};

export default MigrationTool;
