import React, { useState } from 'react';
import { Member, House, UserRole } from '../../../types';
import { createMember } from '../../services/memberService';

interface MembersProps {
  members: Member[];
  houses: House[];
  userRole: UserRole;
}

const Members: React.FC<MembersProps> = ({ members, houses, userRole }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  
  const canEdit = [UserRole.ADMIN, UserRole.OPERATIONS_MANAGER].includes(userRole);

  const handleAddMember = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMemberName.trim()) return;
      try {
          await createMember({ 
              fullName: newMemberName,
              accountBalance: 0,
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
        <span className="text-neon-blue-500 font-bold text-xs uppercase tracking-wider truncate">{house.name}</span>
      ) : <span className="text-neon-red-500 font-bold text-xs uppercase tracking-wider">UNKNOWN</span>;
  };

  return (
    <div className="space-y-6 animate-enter p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <h2 className="text-xl font-bold text-white glow-text">Member Directory</h2>
            <p className="text-sm text-slate-400 mt-1">Manage personnel and residents.</p>
         </div>
         {canEdit && (
             <button 
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary w-full sm:w-auto"
             >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Member
             </button>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {members.map(m => (
              <div key={m.id} className="bg-matte-900 border border-matte-800 rounded-lg p-4 flex flex-col gap-3 hover:border-matte-700 transition-colors">
                  {/* Header: Avatar + Name + Status */}
                  <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-black-matte border border-white/10 flex items-center justify-center text-neon-blue-500 font-bold shadow-inner">
                             {m.fullName.charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                              <span className="text-white font-bold text-sm truncate" title={m.fullName}>{m.fullName}</span>
                              <span className="text-xs text-slate-500 font-mono truncate">ID: {m.id.slice(0, 8)}</span>
                          </div>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${m.status === 'ACTIVE' ? 'bg-neon-blue-500/10 text-neon-blue-500 border-neon-blue-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                          {m.status}
                      </span>
                  </div>

                  {/* Body: Residence + Balance */}
                  <div className="grid grid-cols-2 gap-2 mt-1 border-t border-white/5 pt-3">
                      <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Residence</span>
                          <div className="truncate text-sm">
                              {getHouseName(m.houseId)}
                          </div>
                      </div>
                      <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Balance</span>
                          <span className={`text-sm font-bold font-mono ${m.accountBalance < 0 ? 'text-neon-red-500' : 'text-neon-green-500'}`}>
                             ${m.accountBalance.toLocaleString()}
                          </span>
                      </div>
                  </div>

                  {/* Footer: Actions */}
                  <div className="mt-2 pt-2">
                       <button className="w-full py-1.5 text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded border border-white/5 transition-colors uppercase tracking-wide">
                          View Profile
                       </button>
                  </div>
              </div>
          ))}
      </div>
      
      {members.length === 0 && (
          <div className="p-12 text-center text-slate-500 italic bg-matte-900 border border-matte-800 rounded-lg">
              No members found in directory.
          </div>
      )}

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
                          <label className="block text-xs font-bold text-neon-blue-500 uppercase tracking-widest mb-2">Full Name</label>
                          <input 
                            type="text" 
                            required 
                            className="input w-full bg-black-matte border border-white/10 rounded px-3 py-2 text-white focus:border-neon-blue-500 outline-none" 
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
