import React from 'react';
import { House, Member } from '../../../types';

interface DashboardProps {
  houses: House[];
  members: Member[];
}

const Dashboard: React.FC<DashboardProps> = ({ houses, members }) => {
  const totalCapacity = houses.reduce((acc, h) => acc + h.capacity, 0);
  const activeMembers = members.filter(m => m.status === 'ACTIVE').length;
  const occupancyRate = totalCapacity > 0 ? Math.round((activeMembers / totalCapacity) * 100) : 0;
  
  return (
    <div className="space-y-8 animate-enter">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Stat Card 1 */}
         <div className="card p-6 flex flex-col justify-between h-40 bg-gradient-to-br from-dark-surface to-dark-surface/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyber-blue-500/5 blur-2xl rounded-full group-hover:bg-cyber-blue-500/10 transition-all duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Occupancy Rate</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${occupancyRate > 90 ? 'bg-neon-amber-500/10 text-neon-amber-500 border-neon-amber-500/20' : 'bg-neon-green-500/10 text-neon-green-500 border-neon-green-500/20'}`}>
                   {occupancyRate > 90 ? 'CRITICAL' : 'OPTIMAL'}
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                 <span className="text-4xl font-bold text-white tracking-tight drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">{occupancyRate}%</span>
              </div>
            </div>
            
            <div className="w-full relative z-10">
               <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 uppercase font-medium tracking-wider">
                  <span>Capacity Usage</span>
                  <span>{activeMembers} / {totalCapacity} Beds</span>
               </div>
               <div className="w-full bg-black-matte rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor] ${occupancyRate > 90 ? 'bg-neon-amber-500 text-neon-amber-500' : 'bg-neon-green-500 text-neon-green-500'}`} style={{ width: `${occupancyRate}%` }}></div>
               </div>
            </div>
         </div>
         
         {/* Stat Card 2 */}
         <div className="card p-6 flex flex-col justify-between h-40 bg-gradient-to-br from-dark-surface to-dark-surface/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyber-blue-500/5 blur-2xl rounded-full group-hover:bg-cyber-blue-500/10 transition-all duration-500"></div>
            
            <div className="relative z-10">
               <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Portfolio Health</h3>
               <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-white tracking-tight">
                     {houses.filter(h => h.status === 'ONLINE').length}
                  </span>
                  <span className="text-sm font-medium text-slate-500">/ {houses.length} Active</span>
               </div>
            </div>
            <div className="text-xs text-slate-500 font-medium">
               Properties currently online.
            </div>
         </div>

         {/* Stat Card 3 */}
         <div className="card p-6 flex flex-col justify-between h-40 border-l-2 border-l-cyber-blue-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-cyber-blue-500/5 pointer-events-none"></div>
            <div className="relative z-10">
               <h3 className="text-cyber-blue-500 text-[10px] font-bold uppercase tracking-widest mb-2">Total Residents</h3>
               <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-white tracking-tight glow-text">{activeMembers}</span>
                  <span className="text-sm font-medium text-cyber-blue-500/70">Active</span>
               </div>
            </div>
             <div className="text-xs text-slate-500 font-medium relative z-10">
               Housed across all sectors.
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card p-8 min-h-[300px] flex flex-col items-center justify-center text-center border-dashed border-white/10 bg-transparent">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-600 border border-white/5 shadow-inner">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Occupancy Trends</h3>
              <p className="text-sm text-slate-500 max-w-sm">Historical data visualization module awaiting connection.</p>
          </div>

           <div className="card p-8 min-h-[300px] flex flex-col items-center justify-center text-center border-dashed border-white/10 bg-transparent">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-600 border border-white/5 shadow-inner">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">System Notifications</h3>
              <p className="text-sm text-slate-500 max-w-sm">No critical alerts requiring immediate operational attention.</p>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
