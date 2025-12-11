import React, { useState, useEffect } from 'react';
import { UserRole, Member, House } from '../../types';
import { runBillingSimulation, getSimulatedData, resetSimulation, recordPaymentTx } from '../../src/services/ledgerSimulation';
import { fetchMembers } from '../../src/services/memberService';
import { fetchHouses } from '../../src/services/houseService';

interface FinancialDebugProps {
  userRole: UserRole;
}

const FinancialDebug: React.FC<FinancialDebugProps> = ({ userRole }) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [data, setData] = useState(getSimulatedData());
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  
  // Test Inputs
  const [paymentAmount, setPaymentAmount] = useState('100');

  useEffect(() => {
    const loadData = async () => {
        try {
            const memberData = await fetchMembers();
            setMembers(memberData);
            const houseData = await fetchHouses();
            setHouses(houseData);
        } catch(e) {
            console.error("Failed to load members/houses", e);
        }
    };
    loadData();
  }, []);

  const refreshData = () => {
    setData({ ...getSimulatedData() });
  };

  const handleRunBilling = async () => {
    if (!selectedMemberId) return;
    setLoading(true);
    try {
      await runBillingSimulation(selectedMemberId, new Date().toISOString());
      refreshData();
    } catch (e) {
      console.error(e);
      alert('Billing Simulation Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
      if(!selectedMemberId) return;
      try {
          await recordPaymentTx(selectedMemberId, parseFloat(paymentAmount), 'SELF');
          refreshData();
      } catch(e) {
          alert("Payment Failed");
      }
  }

  const handleReset = () => {
    if(confirm("Reset all staging data?")) {
        resetSimulation();
        refreshData();
    }
  }

  if (userRole === UserRole.HOUSE_LEAD) {
    return <div className="p-8 text-center text-slate-500">Access Denied: Admin Only Area</div>;
  }

  // Find member in either simulated data or real member list
  const member = data.members.find(m => m.id === selectedMemberId) || members.find(m => m.id === selectedMemberId);
  const house = member ? houses.find(h => h.id === member.houseId) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-slate-900 text-white p-6 rounded-xl shadow-lg">
        <div>
           <h2 className="text-xl font-bold">Financial Debugger</h2>
           <p className="text-slate-400 text-sm">Ledger Only • Strict Flow Testing</p>
        </div>
        <button onClick={handleReset} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-xs hover:bg-rose-900 hover:border-rose-700 transition-colors">
            Reset Staging Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CONTROL PANEL */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">Target Member</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm"
            >
              <option value="">-- Select Member --</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.fullName}</option>
              ))}
              {/* Also show simulated members if any */}
               {data.members.filter(m => !members.find(real => real.id === m.id)).map(m => (
                 <option key={m.id} value={m.id}>{m.fullName} (Simulated)</option>
               ))}
            </select>
            
            {member && (
                <div className="mt-6 space-y-4 border-t border-slate-100 pt-4">
                    <div className="bg-indigo-50 p-3 rounded">
                        <div className="text-xs text-indigo-500 uppercase">Ledger Balance</div>
                        <div className={`text-2xl font-bold ${member.accountBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ${member.accountBalance}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Status: {member.status}</div>
                         {house && <div className="text-xs text-slate-500">House: {house.name}</div>}
                    </div>
                    
                    <div className="border-t border-slate-100 pt-4">
                        <p className="text-xs font-bold text-slate-700 mb-2">Test Operations</p>
                        <button
                            onClick={handleRunBilling}
                            disabled={loading || member.status !== 'ACTIVE'}
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded border border-slate-300 mb-2 disabled:opacity-50"
                        >
                            {loading ? 'Running...' : 'Run Catch-up Billing'}
                        </button>
                        
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                value={paymentAmount}
                                onChange={e => setPaymentAmount(e.target.value)}
                                className="w-20 px-2 py-1 text-xs border border-slate-300 rounded"
                            />
                            <button
                                onClick={handleRecordPayment}
                                className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded"
                            >
                                Record Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* INFO PANEL */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Phase C Status</h3>
            <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-center">
                    <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Ledger Source of Truth
                </li>
                 <li className="flex items-center">
                    <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Strict Intake/Exit Flows
                </li>
                 <li className="flex items-center">
                    <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Monthly Summaries Enabled
                </li>
            </ul>
         </div>
      </div>
    </div>
  );
};

export default FinancialDebug;