import React, { useState } from 'react';
import { Member, House, UserRole, MemberStatus } from '../../../types';
import { createMember, updateMember } from '../../services/memberService';

interface MembersProps {
  members: Member[];
  houses: House[];
  userRole: UserRole;
}

const Members: React.FC<MembersProps> = ({ members, houses, userRole }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  
  // Basic RBAC
  const canEdit = [UserRole.ADMIN, UserRole.OPERATIONS_MANAGER].includes(userRole);

  const handleAddMember = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMemberName.trim()) return;
      try {
          // Explicitly define structure for new members, ensuring numbers are numbers
          await createMember({ 
              fullName: newMemberName,
              accountBalance: 0,
              // Other defaults are handled in service, but being explicit here is safer for UI intent
          });
          setShowAddModal(false);
          setNewMemberName('');
      } catch (err) {
          alert("Failed to create member");
      }
  };

  const getHouseName = (houseId?: string | null) => {
      if (!houseId) return <span className="text-slate-500 italic font-normal text-xs">UNASSIGNED</span>;
      const house = houses.find(h => h.id === houseId);
      return house ? (
        <span className="text-cyber-blue-500 font-bold text-xs uppercase tracking-wider">{house.name}</span>
      ) : <span className="text-neon-red-500 font-bold text-xs uppercase tracking-wider">UNKNOWN</span>;
  };

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-xl font-bold text-white glow-text">Member Directory</h2>
            <p className="text-sm text-slate-400 mt-1">Manage personnel and residents.</p>
         </div>
         {canEdit && (
             <button 
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary"
             >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Member
             </button>
         )}
      </div>

      <div className="card overflow-hidden bg-dark-surface/80 backdrop-blur-sm border-white/5">
         <table className="min-w-full divide-y divide-white/5">
            <thead>
               <tr className="bg-black-matte/30">
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Residence</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Balance</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
               </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-white/5">
               {members.length === 0 ? (
                   <tr><td colSpan={5} className="p-12 text-center text-slate-500 italic">No members found in directory.</td></tr>
               ) : members.map(m => (
                   <tr key={m.id} className="group hover:bg-white/5 transition-colors duration-150">
                       <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                             <div className="h-9 w-9 rounded-lg bg-black-matte border border-white/10 flex items-center justify-center text-cyber-blue-500 text-sm font-bold mr-3 shadow-inner">
                                {m.fullName.charAt(0)}
                             </div>
                             <div className="text-sm font-bold text-white group-hover:text-cyber-blue-500 transition-colors">{m.fullName}</div>
                          </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`badge ${m.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                               {m.status}
                           </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                          {getHouseName(m.houseId)}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                           <div className={`text-sm font-bold font-mono ${m.accountBalance < 0 ? 'text-neon-red-500' : 'text-neon-green-500'}`}>
                               ${m.accountBalance.toLocaleString()}
                           </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button className="text-slate-500 hover:text-white font-medium transition-colors text-xs uppercase tracking-wider">
                             Edit
                          </button>
                       </td>
                   </tr>
               ))}
            </tbody>
         </table>
      </div>

      {showAddModal && (
          <div className="fixed inset-0 bg-black-matte/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-enter">
              <div className="bg-dark-surface rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden">
                  <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-black-matte/50">
                      <h3 className="text-lg font-bold text-white tracking-wide">Add New Member</h3>
                      <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>
                  <form onSubmit={handleAddMember} className="p-8 space-y-6">
                      <div>
                          <label className="block text-xs font-bold text-cyber-blue-500 uppercase tracking-widest mb-2">Full Name</label>
                          <input 
                            type="text" 
                            required 
                            className="input" 
                            placeholder="Operative Name"
                            value={newMemberName}
                            onChange={e => setNewMemberName(e.target.value)}
                          />
                      </div>
                      <div className="pt-6 flex justify-end gap-3 border-t border-white/5 mt-2">
                          <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary text-xs">Cancel</button>
                          <button type="submit" className="btn btn-primary text-xs">Register Member</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Members;
