import React from 'react';
import { Member, UserRole } from '../../../types';

interface FinancialsProps {
  members: Member[];
  userRole: UserRole;
}

const Financials: React.FC<FinancialsProps> = ({ members, userRole }) => {
  if (userRole === UserRole.HOUSE_LEAD) {
      return (
        <div className="flex flex-col items-center justify-center h-96 animate-enter">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-500 border border-white/5 shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-white tracking-wide">ACCESS RESTRICTED</h3>
            <p className="text-slate-500 mt-1 max-w-xs text-center text-sm">Financial data is classified for High Command only.</p>
        </div>
      );
  }

  const totalOutstanding = members.reduce((acc, m) => acc + (m.accountBalance < 0 ? Math.abs(m.accountBalance) : 0), 0);
  const membersOwing = members.filter(m => m.accountBalance < 0);

  return (
    <div className="space-y-8 animate-enter">
       <div className="flex justify-between items-center">
         <div>
            <h2 className="text-xl font-bold text-white glow-text">Financial Overview</h2>
            <p className="text-sm text-slate-400 mt-1">Ledger status and debt collection.</p>
         </div>
         <button className="btn btn-secondary">
            <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" /></svg>
            Export Ledger
         </button>
      </div>

       <div className="card p-8 border-l-2 border-l-neon-red-500 bg-gradient-to-br from-dark-surface to-dark-surface/50">
           <div className="flex justify-between items-start">
               <div>
                   <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Total Outstanding</h3>
                   <div className="flex items-baseline gap-2">
                       <span className="text-4xl font-bold text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,82,82,0.5)]">${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                   </div>
               </div>
               <div className="text-right">
                   <div className="text-2xl font-bold text-neon-red-500 glow-text">{membersOwing.length}</div>
                   <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Accounts Past Due</div>
               </div>
           </div>
       </div>

       <div className="card overflow-hidden bg-dark-surface/80 backdrop-blur-sm border-white/5">
           <div className="px-6 py-4 border-b border-white/5 bg-black-matte/30 flex justify-between items-center">
               <h3 className="font-bold text-white text-sm uppercase tracking-wider">Outstanding Balances</h3>
               <span className="badge badge-warning">{membersOwing.length} URGENT</span>
           </div>
           <table className="min-w-full divide-y divide-white/5">
               <thead>
                   <tr className="bg-white/5">
                       <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Member Name</th>
                       <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                       <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount Due</th>
                       <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
                   </tr>
               </thead>
               <tbody className="bg-transparent divide-y divide-white/5">
                   {membersOwing.length === 0 ? (
                       <tr><td colSpan={4} className="p-12 text-center text-slate-500 italic">No outstanding balances found.</td></tr>
                   ) : membersOwing.map(m => (
                       <tr key={m.id} className="group hover:bg-white/5 transition-colors">
                           <td className="px-6 py-4 whitespace-nowrap">
                               <div className="flex items-center">
                                   <div className="h-8 w-8 rounded-lg bg-neon-red-500/10 text-neon-red-500 flex items-center justify-center text-xs font-bold mr-3 border border-neon-red-500/20 shadow-[0_0_10px_rgba(255,82,82,0.2)]">
                                       {m.fullName.charAt(0)}
                                   </div>
                                   <span className="text-sm font-bold text-white group-hover:text-neon-red-500 transition-colors">{m.fullName}</span>
                               </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                               <span className="badge badge-error">OVERDUE</span>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-right">
                               <div className="text-sm font-bold font-mono text-neon-red-500">
                                   -${Math.abs(m.accountBalance).toLocaleString()}
                               </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                               <button className="text-cyber-blue-500 hover:text-white font-bold text-[10px] uppercase tracking-wider bg-cyber-blue-500/10 hover:bg-cyber-blue-500/20 px-3 py-1.5 rounded border border-cyber-blue-500/20 transition-all">
                                   Review
                               </button>
                           </td>
                       </tr>
                   ))}
               </tbody>
           </table>
       </div>
    </div>
  );
};

export default Financials;
