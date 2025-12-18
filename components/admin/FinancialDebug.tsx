import React, { useState, useEffect } from 'react';
import { UserRole, Member, House, MemberStatus } from '../../types';
import { fetchMembers } from '../../src/services/memberService';
import { fetchHouses } from '../../src/services/houseService';
import { calculateBilling } from '../../src/utils/billingLogic';
import { collection, getDocs, query, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../src/lib/firebase';

interface FinancialDebugProps {
  userRole: UserRole;
}

const FinancialDebug: React.FC<FinancialDebugProps> = ({ userRole }) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
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

  const handleRunBilling = async () => {
    if (!selectedMemberId) return;
    setLoading(true);
    try {
      // Fetch fresh member data
      const memberRef = doc(db, 'members', selectedMemberId);
      const memberSnap = await getDocs(query(collection(db, 'members'), where('id', '==', selectedMemberId))); // Using query/collection is weird here but let's stick to fetchMembers pattern or just getDoc
      const member = members.find(m => m.id === selectedMemberId);
      
      if (!member) throw new Error("Member not found");

      // Fetch sponsorships
      const sponsorshipsRef = collection(db, 'sponsorships');
      const q = query(sponsorshipsRef, where('memberId', '==', selectedMemberId), where('isActive', '==', true));
      const spSnap = await getDocs(q);
      const sponsorships = spSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const now = new Date().toISOString();
      const billingResult = calculateBilling(member, sponsorships, now);

      if (billingResult.totalCharges === 0 && billingResult.newLastBilledIndex === member.lastBilledPeriodIndex) {
          alert("No new charges to bill.");
          setLoading(false);
          return;
      }

      if(!confirm(`This will generate ${billingResult.newCharges.length} charges totaling $${billingResult.totalCharges}. Proceed?`)) {
          setLoading(false);
          return;
      }

      // Commit changes
      const batch = writeBatch(db);
      
       // Bed Charges
        billingResult.newCharges.forEach(charge => {
            const chargeRef = doc(collection(db, 'bedCharges'), charge.id); 
            batch.set(chargeRef, charge);
        });

        // Sponsorship Charges
        billingResult.newSponsorshipCharges.forEach(spCharge => {
            const spChargeRef = doc(collection(db, 'sponsorshipCharges'), spCharge.id);
            batch.set(spChargeRef, spCharge);
        });

        // Update Sponsorships (Remaining Amount)
        billingResult.updatedSponsorships.forEach(sp => {
           const original = sponsorships.find(s => s.id === sp.id);
           if (original && original.remainingAmount !== sp.remainingAmount) {
               const spRef = doc(db, 'sponsorships', sp.id);
               batch.update(spRef, { remainingAmount: sp.remainingAmount, updatedAt: now });
           }
        });

        const netChange = billingResult.totalCharges - billingResult.totalCovered;
        const currentBalance = member.accountBalance - netChange;

        batch.update(memberRef, {
            lastBilledPeriodIndex: billingResult.newLastBilledIndex,
            lastBilledThrough: billingResult.newLastBilledThrough,
            accountBalance: currentBalance,
            hasOutstandingBalance: currentBalance < 0,
            updatedAt: now
        });

        await batch.commit();

        alert(`Billed successfully. New Balance: $${currentBalance}`);
        
        // Refresh local state
        const memberData = await fetchMembers();
        setMembers(memberData);

    } catch (e: any) {
      console.error(e);
      alert(`Billing Simulation Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
      // Just a placeholder for manual payment entry if needed in debug
      // In real app, use Financials page
      alert("Please use the main Financials page to record payments.");
  }

  if (userRole === UserRole.HOUSE_LEAD) {
    return <div className="p-8 text-center text-gray-500">Access Denied: Admin Only Area</div>;
  }

  // Find member
  const member = members.find(m => m.id === selectedMemberId);
  const house = member ? houses.find(h => h.id === member.houseId) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-matte-900 text-white p-6 rounded-xl shadow-lg border border-matte-800">
        <div>
           <h2 className="text-xl font-bold glow-text">Financial Debugger</h2>
           <p className="text-gray-400 text-sm">Ledger Operations • Manual Billing Trigger</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CONTROL PANEL */}
        <div className="space-y-6">
          <div className="bg-matte-900 p-6 rounded-xl shadow-sm border border-matte-800">
            <label className="block text-sm font-medium text-gray-400 mb-2">Target Member</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full bg-matte-950 border border-matte-700 rounded-lg p-2.5 text-sm text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none"
            >
              <option value="">-- Select Member --</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.fullName}</option>
              ))}
            </select>
            
            {member && (
                <div className="mt-6 space-y-4 border-t border-matte-800 pt-4">
                    <div className="bg-matte-950 p-3 rounded border border-matte-800">
                        <div className="text-xs text-neon-blue uppercase font-bold tracking-wider">Ledger Balance</div>
                        <div className={`text-2xl font-bold ${member.accountBalance < 0 ? 'text-red-500' : 'text-neon-green'}`}>
                            ${member.accountBalance}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Status: {member.status}</div>
                         {house && <div className="text-xs text-gray-500">House: {house.name}</div>}
                    </div>
                    
                    <div className="border-t border-matte-800 pt-4">
                        <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Operations</p>
                        <button
                            onClick={handleRunBilling}
                            disabled={loading || member.status !== MemberStatus.ACTIVE}
                            className="w-full py-2 bg-matte-800 hover:bg-matte-700 text-white text-xs font-bold rounded border border-matte-700 mb-2 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Running...' : 'Run Catch-up Billing (Real)'}
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* INFO PANEL */}
         <div className="bg-matte-900 p-6 rounded-xl shadow-sm border border-matte-800">
            <h3 className="font-bold text-white mb-4">System Status</h3>
            <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-center">
                    <svg className="w-5 h-5 text-neon-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Ledger Source of Truth
                </li>
                 <li className="flex items-center">
                    <svg className="w-5 h-5 text-neon-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Strict Intake/Exit Flows
                </li>
                 <li className="flex items-center">
                    <svg className="w-5 h-5 text-neon-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Monthly Summaries Enabled
                </li>
            </ul>
         </div>
      </div>
    </div>
  );
};

export default FinancialDebug;