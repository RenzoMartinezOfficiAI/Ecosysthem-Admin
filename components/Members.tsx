import React, { useState, useEffect } from 'react';
import { Member, MemberStatus, PayType, UserRole, House, MemberLabel, Sponsorship, EmergencyContact } from '../types';
import { FEATURE_FLAGS } from '../src/config/featureFlags';
import { callIntakeMember, callExitMember } from '../src/services/memberService';

interface MembersProps {
  members: Member[];
  houses: House[];
  userRole: UserRole;
}

const Members: React.FC<MembersProps> = ({ members: initialMembers, houses, userRole }) => {
  const canEdit = [UserRole.ADMIN, UserRole.OPERATIONS_MANAGER].includes(userRole);
  const useLedger = FEATURE_FLAGS.useLedgerForBalances;
  
  // Directly use members from props, no need for local state if we trust parent
  const members = initialMembers;

  // Modals
  const [showIntake, setShowIntake] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // --- INTAKE STATE ---
  const [intakeForm, setIntakeForm] = useState<Partial<Member>>({
      fullName: '', 
      email: '',
      phone: '',
      dateOfBirth: '',
      payType: PayType.SELF_PAY, 
      bedRateMonthly: 600, 
      intakeDate: new Date().toISOString().split('T')[0], 
      label: MemberLabel.MEMBER, 
      status: MemberStatus.ACTIVE,
      isVeteran: false,
      mediaRelease: false
  });
  
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
      name: '', phone: '', relationship: ''
  });

  const [sponsorshipForm, setSponsorshipForm] = useState<Partial<Sponsorship>>({
      sponsorName: '', totalAmount: 0, priority: 1, startDate: new Date().toISOString().split('T')[0]
  });
  
  // --- EXIT STATE ---
  const [exitForm, setExitForm] = useState({
      exitDate: new Date().toISOString().split('T')[0],
      reason: '',
      note: ''
  });

  const resetIntakeForm = () => {
      setIntakeForm({
        fullName: '', email: '', phone: '', dateOfBirth: '',
        payType: PayType.SELF_PAY, bedRateMonthly: 600, 
        intakeDate: new Date().toISOString().split('T')[0], 
        label: MemberLabel.MEMBER, status: MemberStatus.ACTIVE,
        isVeteran: false, mediaRelease: false
      });
      setEmergencyContact({ name: '', phone: '', relationship: '' });
      setSponsorshipForm({ sponsorName: '', totalAmount: 0, priority: 1, startDate: new Date().toISOString().split('T')[0] });
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          const memberPayload = { ...intakeForm, emergencyContact };
          const needsSponsorship = intakeForm.payType === PayType.SPONSORED || intakeForm.payType === PayType.MIXED;
          
          await callIntakeMember(memberPayload, needsSponsorship ? sponsorshipForm : undefined);
          
          setShowIntake(false);
          resetIntakeForm();
          // No manual refresh needed
      } catch (err: any) {
          console.error(err);
          alert(err.message || "Intake failed");
      } finally {
          setLoading(false);
      }
  };

  const handleExitSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedMemberId) return;
      setLoading(true);
      try {
          await callExitMember(selectedMemberId, exitForm.exitDate, exitForm.reason, exitForm.note);
          setShowExit(false);
      } catch (err: any) {
          console.error(err);
          alert(err.message || "Exit failed");
      } finally {
          setLoading(false);
      }
  };

  const getStatusBadge = (status: MemberStatus) => {
    switch (status) {
      case MemberStatus.ACTIVE: return 'bg-emerald-100 text-emerald-800';
      case MemberStatus.INACTIVE: return 'bg-slate-100 text-slate-500';
      case MemberStatus.PENDING: return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHouseName = (houseId?: string | null) => {
    if (!houseId) return <span className="text-slate-400 italic">Unassigned</span>;
    const house = houses.find(h => h.id === houseId);
    return house ? house.name : 'Unknown House';
  };

  const activeHouses = houses.filter(h => h.status !== 'OFFLINE');

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-slate-800">Member Directory</h2>
        {canEdit && (
          <button onClick={() => { resetIntakeForm(); setShowIntake(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm">
            + Intake Member
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Member</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">House</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pay Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Balance {useLedger ? '(Ledger)' : '(Legacy)'}
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {members.length === 0 ? (
                  <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          No members found.
                      </td>
                  </tr>
              ) : (
                members.map((member) => {
                    const displayBalance = member.accountBalance;
                    return (
                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                            {member.fullName.charAt(0)}
                            </div>
                            <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900">{member.fullName}</div>
                            <div className="text-xs text-slate-500">{member.label}</div>
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(member.status)}`}>
                            {member.status}
                        </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {getHouseName(member.houseId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {member.payType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-bold ${displayBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {displayBalance < 0 ? `-$${Math.abs(displayBalance)}` : `$${displayBalance}`}
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {member.status === MemberStatus.ACTIVE && canEdit && (
                            <button 
                                    onClick={() => { setSelectedMemberId(member.id); setShowExit(true); }}
                                    className="text-rose-600 hover:text-rose-900"
                            >
                                    Exit
                            </button>
                        )}
                        <button className="text-indigo-600 hover:text-indigo-900">Details</button>
                        </td>
                    </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INTAKE / EXIT MODALS (Using same state variables as before) */}
      {showIntake && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-900">New Member Intake</h3>
                    <p className="text-sm text-slate-500">Initialize a new member record and financial ledger.</p>
                </div>
                <form onSubmit={handleIntakeSubmit} className="p-6 space-y-6">
                    {/* Identity Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Full Name</label>
                            <input required type="text" className="mt-1 w-full border border-slate-300 rounded-md p-2" 
                                value={intakeForm.fullName} onChange={e => setIntakeForm({...intakeForm, fullName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Phone</label>
                            <input type="tel" className="mt-1 w-full border border-slate-300 rounded-md p-2" 
                                value={intakeForm.phone} onChange={e => setIntakeForm({...intakeForm, phone: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Email</label>
                            <input type="email" className="mt-1 w-full border border-slate-300 rounded-md p-2" 
                                value={intakeForm.email} onChange={e => setIntakeForm({...intakeForm, email: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Date of Birth</label>
                            <input type="date" className="mt-1 w-full border border-slate-300 rounded-md p-2" 
                                value={intakeForm.dateOfBirth} onChange={e => setIntakeForm({...intakeForm, dateOfBirth: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Intake Date</label>
                            <input required type="date" className="mt-1 w-full border border-slate-300 rounded-md p-2" 
                                value={intakeForm.intakeDate} onChange={e => setIntakeForm({...intakeForm, intakeDate: e.target.value})} />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <h4 className="text-sm font-bold text-slate-800 mb-3">Housing & Classification</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">House Assignment</label>
                                <select className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                    value={intakeForm.houseId || ''} onChange={e => setIntakeForm({...intakeForm, houseId: e.target.value || null})}>
                                    <option value="">-- Unassigned --</option>
                                    {activeHouses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Type</label>
                                <select className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                    value={intakeForm.label} onChange={e => setIntakeForm({...intakeForm, label: e.target.value as MemberLabel})}>
                                    <option value={MemberLabel.MEMBER}>Member</option>
                                    <option value={MemberLabel.PATIENT}>Patient</option>
                                    <option value={MemberLabel.BOTH}>Both</option>
                                </select>
                            </div>
                            <div className="flex items-center mt-6">
                                <input id="isVeteran" type="checkbox" className="h-4 w-4 text-indigo-600 border-slate-300 rounded"
                                    checked={intakeForm.isVeteran} onChange={e => setIntakeForm({...intakeForm, isVeteran: e.target.checked})} />
                                <label htmlFor="isVeteran" className="ml-2 block text-sm text-slate-700">Veteran Status</label>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <h4 className="text-sm font-bold text-slate-800 mb-3">Financial Setup</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Pay Type</label>
                                <select className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                    value={intakeForm.payType} onChange={e => setIntakeForm({...intakeForm, payType: e.target.value as PayType})}>
                                    <option value={PayType.SELF_PAY}>Self Pay</option>
                                    <option value={PayType.SPONSORED}>Sponsored</option>
                                    <option value={PayType.MIXED}>Mixed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Bed Rate (Monthly)</label>
                                <div className="relative mt-1 rounded-md shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                      <span className="text-gray-500 sm:text-sm">$</span>
                                    </div>
                                    <input required type="number" className="block w-full rounded-md border border-slate-300 pl-7 p-2" 
                                        value={intakeForm.bedRateMonthly} onChange={e => setIntakeForm({...intakeForm, bedRateMonthly: parseFloat(e.target.value)})} />
                                </div>
                            </div>
                        </div>

                        {(intakeForm.payType === PayType.SPONSORED || intakeForm.payType === PayType.MIXED) && (
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mt-4">
                                <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    Required Sponsorship Configuration
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-indigo-800">Sponsor Name</label>
                                        <input required type="text" className="mt-1 w-full border border-indigo-200 rounded p-2 text-sm" 
                                            value={sponsorshipForm.sponsorName} onChange={e => setSponsorshipForm({...sponsorshipForm, sponsorName: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-indigo-800">Total Coverage Amount</label>
                                        <input required type="number" className="mt-1 w-full border border-indigo-200 rounded p-2 text-sm" 
                                            value={sponsorshipForm.totalAmount} onChange={e => setSponsorshipForm({...sponsorshipForm, totalAmount: parseFloat(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <h4 className="text-sm font-bold text-slate-800 mb-3">Emergency Contact</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Contact Name</label>
                                <input type="text" className="mt-1 w-full border border-slate-300 rounded-md p-2" 
                                    value={emergencyContact.name} onChange={e => setEmergencyContact({...emergencyContact, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Relation</label>
                                <input type="text" className="mt-1 w-full border border-slate-300 rounded-md p-2" 
                                    value={emergencyContact.relationship} onChange={e => setEmergencyContact({...emergencyContact, relationship: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Phone</label>
                                <input type="tel" className="mt-1 w-full border border-slate-300 rounded-md p-2" 
                                    value={emergencyContact.phone} onChange={e => setEmergencyContact({...emergencyContact, phone: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setShowIntake(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            {loading ? 'Processing...' : 'Complete Intake'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* EXIT MODAL */}
      {showExit && (
          <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-xl font-bold text-slate-900">Process Member Exit</h3>
                    <p className="text-sm text-slate-500">Finalizes billing and deactivates sponsorships.</p>
                </div>
                <form onSubmit={handleExitSubmit} className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Exit Date</label>
                        <input required type="date" className="mt-1 w-full border border-slate-300 rounded-md p-2" 
                            value={exitForm.exitDate} onChange={e => setExitForm({...exitForm, exitDate: e.target.value})} />
                        <p className="text-xs text-slate-500 mt-1">Must be after last billed date.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Reason</label>
                        <select className="mt-1 w-full border border-slate-300 rounded-md p-2"
                             value={exitForm.reason} onChange={e => setExitForm({...exitForm, reason: e.target.value})}>
                             <option value="">-- Select Reason --</option>
                             <option value="VOLUNTARY">Voluntary Move-out</option>
                             <option value="EVICTION">Eviction / Non-compliance</option>
                             <option value="GRADUATION">Program Graduation</option>
                             <option value="MEDICAL">Medical Transfer</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Notes</label>
                        <textarea className="mt-1 w-full border border-slate-300 rounded-md p-2" rows={3}
                            value={exitForm.note} onChange={e => setExitForm({...exitForm, note: e.target.value})}></textarea>
                    </div>
                    <div className="flex justify-end space-x-3 mt-4">
                        <button type="button" onClick={() => setShowExit(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50">
                            {loading ? 'Processing...' : 'Confirm Exit'}
                        </button>
                    </div>
                </form>
            </div>
          </div>
      )}
    </div>
  );
};

export default Members;