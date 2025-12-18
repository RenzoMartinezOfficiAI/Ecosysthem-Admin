import React, { useState, useEffect } from 'react';
import { Member, Sponsorship, UserRole } from '../types';
import { summarizeMemberFinancials } from '../services/geminiService';
import { getSimulatedData } from '../src/services/ledgerSimulation';

interface FinancialsProps {
  members: Member[];
  sponsorships: Sponsorship[];
  userRole: UserRole;
}

const Financials: React.FC<FinancialsProps> = ({ members, sponsorships, userRole }) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'summary'>('summary'); // Default to Summary in Phase C
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  // Get data from simulation for Phase C views
  const simData = getSimulatedData();
  const transactions = [...simData.bedCharges, ...simData.payments, ...simData.sponsorshipCharges].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (userRole === UserRole.HOUSE_LEAD) {
    return (
        <div className="p-12 text-center border-2 border-dashed border-matte-700 rounded-xl bg-matte-900">
            <h3 className="text-lg font-medium text-white">Access Restricted</h3>
            <p className="text-gray-500 mt-2">Financial data is only available to Admins and Operations Managers.</p>
        </div>
    )
  }

  const handleMemberSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mId = e.target.value;
    setSelectedMemberId(mId);
    setAiSummary(null);
    if (!mId) return;
    
    setIsLoadingAi(true);
    const member = members.find(m => m.id === mId);
    if (member) {
        const summary = await summarizeMemberFinancials(member, transactions);
        setAiSummary(summary);
    }
    setIsLoadingAi(false);
  };

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const memberTransactions = transactions.filter(t => t.memberId === selectedMemberId);
  const memberSummaries = simData.summaries.filter(s => s.memberId === selectedMemberId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Selector & AI Insight */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-matte-900 p-6 rounded-xl shadow-sm border border-matte-800">
                <label className="block text-sm font-medium text-gray-400 mb-2">Select Member</label>
                <select 
                    className="w-full bg-matte-950 border border-matte-700 text-white text-sm rounded-lg focus:ring-1 focus:ring-neon-blue focus:border-neon-blue block p-2.5 outline-none"
                    onChange={handleMemberSelect}
                    value={selectedMemberId || ''}
                >
                    <option value="">-- Choose Member --</option>
                    {members.map(m => (
                        <option key={m.id} value={m.id}>{m.fullName} ({m.payType})</option>
                    ))}
                </select>
            </div>

            {selectedMember && (
                <div className="bg-matte-900 p-6 rounded-xl border border-matte-800 shadow-sm relative overflow-hidden">
                    <h3 className="text-neon-blue font-bold text-lg mb-2 flex items-center gap-2 glow-text">
                        Financial Status
                    </h3>
                     <div className="text-3xl font-bold text-white mb-1">
                        ${selectedMember.accountBalance}
                     </div>
                     <div className={`text-sm font-medium ${selectedMember.accountBalance < 0 ? 'text-red-500' : 'text-neon-green'}`}>
                        {selectedMember.accountBalance < 0 ? 'Outstanding Balance' : 'In Good Standing'}
                     </div>
                     <div className="mt-4 pt-4 border-t border-matte-800 text-gray-400 text-xs leading-relaxed">
                        {isLoadingAi ? <span className="animate-pulse text-neon-purple">Generating AI Insight...</span> : (aiSummary || "Select a member to view analysis.")}
                     </div>
                </div>
            )}
        </div>

        {/* Right Col: Data Views */}
        <div className="lg:col-span-2">
            <div className="bg-matte-900 rounded-xl shadow-sm border border-matte-800 overflow-hidden min-h-[500px]">
                <div className="flex border-b border-matte-800">
                    <button 
                        onClick={() => setActiveTab('summary')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'summary' ? 'bg-matte-800 text-neon-blue border-b-2 border-neon-blue' : 'text-gray-500 hover:bg-matte-800 hover:text-white'}`}
                    >
                        Monthly Summaries
                    </button>
                    <button 
                        onClick={() => setActiveTab('ledger')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'ledger' ? 'bg-matte-800 text-neon-blue border-b-2 border-neon-blue' : 'text-gray-500 hover:bg-matte-800 hover:text-white'}`}
                    >
                        Detailed Ledger
                    </button>
                </div>
                
                <div className="p-0">
                    {!selectedMemberId ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <p>Select a member to view financial records</p>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[500px]">
                            {activeTab === 'summary' && (
                                <table className="min-w-full divide-y divide-matte-800">
                                    <thead className="bg-matte-900 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Charges</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sponsor</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payments</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-matte-800 bg-matte-950">
                                        {memberSummaries.length === 0 ? (
                                            <tr><td colSpan={5} className="p-6 text-center text-gray-500 text-sm">No summary data generated yet. Run billing/transactions to populate.</td></tr>
                                        ) : (
                                            memberSummaries.map(s => (
                                                <tr key={s.id} className="hover:bg-matte-900 transition-colors">
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-300">{s.yearMonth}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-gray-400">${s.totalCharges}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-neon-green">+${s.totalSponsorCoverage}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-neon-green">+${s.totalPayments}</td>
                                                    <td className={`px-6 py-4 text-sm text-right font-bold ${s.netDelta < 0 ? 'text-red-500' : 'text-neon-green'}`}>
                                                        {s.netDelta < 0 ? '-' : '+'}${Math.abs(s.netDelta)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'ledger' && (
                                <table className="min-w-full divide-y divide-matte-800">
                                    <thead className="bg-matte-900 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-matte-800 bg-matte-950">
                                        {memberTransactions.map(t => {
                                            const isCharge = 'bedRateAtTime' in t;
                                            const isSponsor = 'sponsorshipId' in t;
                                            const isPayment = 'source' in t;
                                            
                                            let amount = 0;
                                            let type = 'UNKNOWN';
                                            let color = 'text-gray-400';
                                            let label = 'Transaction';

                                            if (isCharge) {
                                                amount = (t as any).bedRateAtTime;
                                                type = 'CHARGE';
                                                color = 'text-white';
                                                label = 'Bed Charge';
                                            } else if (isSponsor) {
                                                amount = (t as any).amountCovered;
                                                type = 'COVERAGE';
                                                color = 'text-neon-green';
                                                label = 'Sponsorship';
                                            } else if (isPayment) {
                                                amount = (t as any).amount;
                                                type = 'PAYMENT';
                                                color = 'text-neon-green';
                                                label = 'Payment';
                                            }

                                            return (
                                                <tr key={t.id} className="hover:bg-matte-900 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                        {new Date(t.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <span className="px-2 py-0.5 bg-matte-800 border border-matte-700 rounded text-xs font-medium text-gray-300">
                                                            {type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{label}</td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${color}`}>
                                                        {isCharge ? '-' : '+'}${amount}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Financials;