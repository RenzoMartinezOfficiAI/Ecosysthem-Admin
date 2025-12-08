import React, { useState, useEffect } from 'react';
import { Member, MemberStatus, PayType, UserRole, House, MemberLabel, Sponsorship, EmergencyContact } from '../types';
import { FEATURE_FLAGS } from '../src/config/featureFlags';
import { callIntakeMember, callExitMember, updateMember, UpdateMemberInput } from '../src/services/memberService';

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
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // --- DETAILS / EDIT STATE ---
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateMemberInput>({});

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

  const handleOpenDetails = (member: Member) => {
      setSelectedMemberId(member.id);
      setEditForm({
          fullName: member.fullName,
          email: member.email,
          phone: member.phone,
          dateOfBirth: member.dateOfBirth,
          label: member.label,
          payType: member.payType,
          bedRateMonthly: member.bedRateMonthly,
          isVeteran: member.isVeteran,
          mediaRelease: member.mediaRelease,
          notes: member.notes,
          emergencyContact: member.emergencyContact ? { ...member.emergencyContact } : undefined,
          // House ID is handled via Housing Assignment tool mostly, but can allow edit here if desired
          // houseId: member.houseId
      });
      setIsEditing(false);
      setShowDetails(true);
  };

  const handleUpdateMember = async () => {
      if (!selectedMemberId) return;
      setLoading(true);
      try {
          await updateMember(selectedMemberId, editForm);
          setIsEditing(false);
          // UI updates automatically via subscription
      } catch (err: any) {
          console.error(err);
          alert(`Update failed: ${err.message}`);
      } finally {
          setLoading(false);
      }
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
  const selectedMember = members.find(m => m.id === selectedMemberId);

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
                        <button 
                            onClick={() => handleOpenDetails(member)}
                            className="text-indigo-600 hover:text-indigo-900"
                        >
                            Details
                        </button>
                        </td>
                    </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

       {/* INTAKE MODAL */}
       {showIntake && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-xl font-bold text-slate-900">Intake New Member</h3>
                </div>
                <form onSubmit={handleIntakeSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Full Name</label>
                            <input required type="text" className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                value={intakeForm.fullName} onChange={e => setIntakeForm({...intakeForm, fullName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Email (Optional)</label>
                            <input type="email" className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                value={intakeForm.email} onChange={e => setIntakeForm({...intakeForm, email: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Phone (Optional)</label>
                            <input type="tel" className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                value={intakeForm.phone} onChange={e => setIntakeForm({...intakeForm, phone: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Date of Birth</label>
                            <input type="date" className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                value={intakeForm.dateOfBirth} onChange={e => setIntakeForm({...intakeForm, dateOfBirth: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Intake Date</label>
                            <input type="date" required className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                value={intakeForm.intakeDate} onChange={e => setIntakeForm({...intakeForm, intakeDate: e.target.value})} />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700">Type</label>
                             <select className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                value={intakeForm.label} onChange={e => setIntakeForm({...intakeForm, label: e.target.value as any})}>
                                <option value={MemberLabel.MEMBER}>Member</option>
                                <option value={MemberLabel.PATIENT}>Patient</option>
                                <option value={MemberLabel.BOTH}>Both</option>
                             </select>
                        </div>
                        
                        <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                            <h4 className="text-sm font-bold text-slate-900 mb-3">Financial Setup</h4>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Pay Type</label>
                            <select className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                value={intakeForm.payType} onChange={e => setIntakeForm({...intakeForm, payType: e.target.value as any})}>
                                <option value={PayType.SELF_PAY}>Self Pay</option>
                                <option value={PayType.SPONSORED}>Sponsored</option>
                                <option value={PayType.MIXED}>Mixed</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Monthly Bed Rate ($)</label>
                            <input required type="number" className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                value={intakeForm.bedRateMonthly} onChange={e => setIntakeForm({...intakeForm, bedRateMonthly: parseFloat(e.target.value)})} />
                        </div>
                    </div>
                    
                    {(intakeForm.payType === PayType.SPONSORED || intakeForm.payType === PayType.MIXED) && (
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 space-y-3">
                             <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Sponsorship Details</h4>
                             <div>
                                <label className="block text-xs font-medium text-indigo-900">Sponsor Name</label>
                                <input type="text" className="mt-1 w-full border border-indigo-200 rounded p-1 text-sm"
                                    value={sponsorshipForm.sponsorName} onChange={e => setSponsorshipForm({...sponsorshipForm, sponsorName: e.target.value})} />
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-indigo-900">Total Coverage Amount ($)</label>
                                <input type="number" className="mt-1 w-full border border-indigo-200 rounded p-1 text-sm"
                                    value={sponsorshipForm.totalAmount} onChange={e => setSponsorshipForm({...sponsorshipForm, totalAmount: parseFloat(e.target.value)})} />
                             </div>
                        </div>
                    )}

                    <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                         <h4 className="text-sm font-bold text-slate-900 mb-3">Emergency Contact</h4>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                             <input type="text" placeholder="Name" className="border border-slate-300 rounded-md p-2 text-sm"
                                value={emergencyContact.name} onChange={e => setEmergencyContact({...emergencyContact, name: e.target.value})} />
                             <input type="text" placeholder="Relationship" className="border border-slate-300 rounded-md p-2 text-sm"
                                value={emergencyContact.relationship} onChange={e => setEmergencyContact({...emergencyContact, relationship: e.target.value})} />
                             <input type="tel" placeholder="Phone" className="border border-slate-300 rounded-md p-2 text-sm"
                                value={emergencyContact.phone} onChange={e => setEmergencyContact({...emergencyContact, phone: e.target.value})} />
                         </div>
                    </div>

                    <div className="flex items-center space-x-6 pt-2">
                        <label className="flex items-center space-x-2 text-sm text-slate-700">
                            <input type="checkbox" checked={intakeForm.isVeteran} onChange={e => setIntakeForm({...intakeForm, isVeteran: e.target.checked})} />
                            <span>Veteran?</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm text-slate-700">
                            <input type="checkbox" checked={intakeForm.mediaRelease} onChange={e => setIntakeForm({...intakeForm, mediaRelease: e.target.checked})} />
                            <span>Media Release?</span>
                        </label>
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

      {/* DETAILS MODAL */}
      {showDetails && selectedMember && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200 flex justify-between items-start">
                    <div>
                        {isEditing ? (
                            <input 
                                type="text" 
                                className="text-xl font-bold text-slate-900 border-b border-slate-300 focus:border-indigo-500 outline-none w-full"
                                value={editForm.fullName}
                                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                            />
                        ) : (
                            <h3 className="text-xl font-bold text-slate-900">{selectedMember.fullName}</h3>
                        )}
                        <div className="text-sm text-slate-500 mt-1 flex space-x-2">
                            {isEditing ? (
                                <>
                                    <input 
                                        type="email" 
                                        placeholder="Email"
                                        className="border border-slate-300 rounded px-2 py-0.5 text-xs w-32"
                                        value={editForm.email || ''}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                    <input 
                                        type="tel" 
                                        placeholder="Phone"
                                        className="border border-slate-300 rounded px-2 py-0.5 text-xs w-28"
                                        value={editForm.phone || ''}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    />
                                </>
                            ) : (
                                <>{selectedMember.email || 'No email'} • {selectedMember.phone || 'No phone'}</>
                            )}
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        {isEditing ? (
                            <>
                                <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-slate-700 text-sm font-medium px-3 py-1">Cancel</button>
                                <button 
                                    onClick={handleUpdateMember} 
                                    disabled={loading}
                                    className="bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium px-3 py-1 rounded shadow-sm disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </>
                        ) : (
                            <>
                                {canEdit && (
                                    <button onClick={() => setIsEditing(true)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium px-3 py-1 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors">
                                        Edit
                                    </button>
                                )}
                                <button onClick={() => setShowDetails(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status & Housing</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Status:</span> 
                                    <span className={`font-medium ${selectedMember.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-600'}`}>{selectedMember.status}</span>
                                </div>
                                <div className="flex justify-between items-center h-6">
                                    <span className="text-slate-500">Type:</span> 
                                    {isEditing ? (
                                        <select 
                                            className="text-xs border border-slate-300 rounded p-0.5"
                                            value={editForm.label}
                                            onChange={(e) => setEditForm({ ...editForm, label: e.target.value as MemberLabel })}
                                        >
                                            <option value={MemberLabel.MEMBER}>Member</option>
                                            <option value={MemberLabel.PATIENT}>Patient</option>
                                            <option value={MemberLabel.BOTH}>Both</option>
                                        </select>
                                    ) : (
                                        <span>{selectedMember.label}</span>
                                    )}
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">House:</span> 
                                    <span>{getHouseName(selectedMember.houseId)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Intake:</span> 
                                    <span>{selectedMember.intakeDate}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Financials</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between items-center h-6">
                                    <span className="text-slate-500">Pay Type:</span> 
                                    {isEditing ? (
                                        <select 
                                            className="text-xs border border-slate-300 rounded p-0.5"
                                            value={editForm.payType}
                                            onChange={(e) => setEditForm({ ...editForm, payType: e.target.value as PayType })}
                                        >
                                            <option value={PayType.SELF_PAY}>Self Pay</option>
                                            <option value={PayType.SPONSORED}>Sponsored</option>
                                            <option value={PayType.MIXED}>Mixed</option>
                                        </select>
                                    ) : (
                                        <span>{selectedMember.payType}</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center h-6">
                                    <span className="text-slate-500">Bed Rate:</span> 
                                    {isEditing ? (
                                        <div className="flex items-center">
                                            <span className="text-xs mr-1">$</span>
                                            <input 
                                                type="number" 
                                                className="text-xs border border-slate-300 rounded p-0.5 w-16 text-right"
                                                value={editForm.bedRateMonthly}
                                                onChange={(e) => setEditForm({ ...editForm, bedRateMonthly: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    ) : (
                                        <span>${selectedMember.bedRateMonthly}/mo</span>
                                    )}
                                </div>
                                <p className="mt-2 pt-2 border-t border-slate-200">
                                    <span className="text-slate-500">Current Balance:</span><br/>
                                    <span className={`text-xl font-bold ${selectedMember.accountBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        ${selectedMember.accountBalance}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-2">Personal Details</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                            <div className="flex items-center space-x-2">
                                <span>DOB:</span>
                                {isEditing ? (
                                    <input 
                                        type="date" 
                                        className="border border-slate-300 rounded px-2 py-0.5 text-xs"
                                        value={editForm.dateOfBirth || ''}
                                        onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                                    />
                                ) : (
                                    <span>{selectedMember.dateOfBirth || 'N/A'}</span>
                                )}
                            </div>
                            <div className="flex items-center space-x-2">
                                <span>Veteran:</span>
                                {isEditing ? (
                                    <input 
                                        type="checkbox" 
                                        checked={editForm.isVeteran || false}
                                        onChange={(e) => setEditForm({ ...editForm, isVeteran: e.target.checked })}
                                    />
                                ) : (
                                    <span>{selectedMember.isVeteran ? 'Yes' : 'No'}</span>
                                )}
                            </div>
                            <div className="flex items-center space-x-2">
                                <span>Media Release:</span>
                                {isEditing ? (
                                    <input 
                                        type="checkbox" 
                                        checked={editForm.mediaRelease || false}
                                        onChange={(e) => setEditForm({ ...editForm, mediaRelease: e.target.checked })}
                                    />
                                ) : (
                                    <span>{selectedMember.mediaRelease ? 'Yes' : 'No'}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
                        <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2">Emergency Contact</h4>
                        {isEditing ? (
                            <div className="space-y-2 text-sm">
                                <input 
                                    type="text" placeholder="Contact Name"
                                    className="w-full border border-rose-200 rounded px-2 py-1 text-rose-900 bg-white"
                                    value={editForm.emergencyContact?.name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, emergencyContact: { ...editForm.emergencyContact!, name: e.target.value } })}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input 
                                        type="text" placeholder="Relationship"
                                        className="w-full border border-rose-200 rounded px-2 py-1 text-rose-900 bg-white"
                                        value={editForm.emergencyContact?.relationship || ''}
                                        onChange={(e) => setEditForm({ ...editForm, emergencyContact: { ...editForm.emergencyContact!, relationship: e.target.value } })}
                                    />
                                    <input 
                                        type="tel" placeholder="Phone"
                                        className="w-full border border-rose-200 rounded px-2 py-1 text-rose-900 bg-white"
                                        value={editForm.emergencyContact?.phone || ''}
                                        onChange={(e) => setEditForm({ ...editForm, emergencyContact: { ...editForm.emergencyContact!, phone: e.target.value } })}
                                    />
                                </div>
                            </div>
                        ) : (
                            selectedMember.emergencyContact ? (
                                <div className="text-sm text-rose-900">
                                    <p className="font-bold">{selectedMember.emergencyContact.name} <span className="font-normal text-rose-600">({selectedMember.emergencyContact.relationship})</span></p>
                                    <p>{selectedMember.emergencyContact.phone}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-rose-400 italic">No contact info</p>
                            )
                        )}
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-2">Notes</h4>
                        {isEditing ? (
                            <textarea 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                rows={3}
                                value={editForm.notes || ''}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            />
                        ) : (
                            selectedMember.notes && (
                                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                    {selectedMember.notes}
                                </p>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Members;