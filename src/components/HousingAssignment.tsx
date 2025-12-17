import React, { useState, useMemo } from 'react';
import { useHouses } from '../hooks/useHouses';
import { useMembers } from '../hooks/useMembers';
import { updateMember } from '../services/memberService';
import { Member, House } from '../../types';

export const HousingAssignment: React.FC = () => {
  const { houses, loading: housesLoading } = useHouses();
  const { members, loading: membersLoading } = useMembers();
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter out INACTIVE members to reduce clutter
  const activeMembers = useMemo(() => members.filter(m => m.status === 'ACTIVE'), [members]);

  const membersByHouse = useMemo(() => {
    const grouped: Record<string, Member[]> = { 'unassigned': [] };
    houses.forEach(h => grouped[h.id] = []);
    
    activeMembers.forEach(m => {
      const hId = m.houseId || 'unassigned';
      if (grouped[hId]) {
        grouped[hId].push(m);
      } else {
        grouped['unassigned'].push(m);
      }
    });
    return grouped;
  }, [houses, activeMembers]);

  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    setDraggedMemberId(memberId);
    e.dataTransfer.effectAllowed = 'move';
    // Optional: Set a custom drag image
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetHouseId: string | null) => {
    e.preventDefault();
    
    if (!draggedMemberId) return;

    const member = members.find(m => m.id === draggedMemberId);
    if (!member) return;
    
    // Optimistic UI update could happen here, but we'll rely on real-time listener for simplicity and robustness
    
    if (member.houseId === targetHouseId) {
        setDraggedMemberId(null);
        return; 
    }

    try {
      await updateMember(draggedMemberId, { houseId: targetHouseId });
      setError(null);
    } catch (err: any) {
      console.error("Assignment failed", err);
      setError("Failed to update assignment. Please check permissions.");
    } finally {
      setDraggedMemberId(null);
    }
  };

  if (housesLoading || membersLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-white/10 border-t-cyber-blue-500 rounded-full animate-spin"></div>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 animate-enter">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-white glow-text">Housing Assignment</h2>
            <p className="text-sm text-slate-400 mt-1">Drag members to assign households.</p>
        </div>
        {error && (
            <div className="bg-neon-red-500/10 text-neon-red-500 text-xs font-bold px-4 py-2 rounded border border-neon-red-500/20 animate-pulse">
                {error}
            </div>
        )}
      </div>

      <div className="flex-1 overflow-x-auto pb-6">
        <div className="flex space-x-6 min-w-max h-full">
          
          {/* Unassigned Column */}
          <div 
            className="w-80 flex flex-col bg-dark-surface/50 border border-white/5 rounded-xl overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
          >
            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest">Unassigned</h3>
                <span className="bg-white/10 text-white text-xs font-bold px-2 py-0.5 rounded-full">{membersByHouse['unassigned']?.length || 0}</span>
            </div>
            <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-white/10">
                {membersByHouse['unassigned']?.map(m => (
                    <DraggableMember key={m.id} member={m} onDragStart={handleDragStart} />
                ))}
                {membersByHouse['unassigned']?.length === 0 && (
                    <div className="text-center text-slate-600 text-xs italic py-8">All members assigned</div>
                )}
            </div>
          </div>

          {/* House Columns */}
          {houses.map(house => {
              const occupants = membersByHouse[house.id] || [];
              const isFull = occupants.length >= house.capacity;
              
              return (
                <div 
                    key={house.id}
                    className={`w-80 flex flex-col rounded-xl overflow-hidden border transition-colors duration-300 ${isFull ? 'bg-neon-red-500/5 border-neon-red-500/20' : 'bg-dark-surface border-white/10'}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, house.id)}
                >
                    <div className={`p-4 border-b flex justify-between items-center ${isFull ? 'border-neon-red-500/20 bg-neon-red-500/10' : 'border-white/5 bg-black-matte/30'}`}>
                        <div>
                            <h3 className={`font-bold uppercase text-xs tracking-widest ${isFull ? 'text-neon-red-500' : 'text-cyber-blue-500'}`}>{house.name}</h3>
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">CAPACITY: {house.capacity}</div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isFull ? 'bg-neon-red-500 text-black-matte' : 'bg-white/10 text-white'}`}>
                            {occupants.length}
                        </span>
                    </div>
                    <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-white/10">
                        {occupants.map(m => (
                            <DraggableMember key={m.id} member={m} onDragStart={handleDragStart} />
                        ))}
                        {occupants.length === 0 && (
                            <div className="text-center text-slate-600 text-xs italic py-8">No occupants</div>
                        )}
                    </div>
                </div>
              );
          })}

        </div>
      </div>
    </div>
  );
};

const DraggableMember: React.FC<{ member: Member, onDragStart: (e: React.DragEvent, id: string) => void }> = ({ member, onDragStart }) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, member.id)}
            className="bg-black-matte border border-white/10 p-3 rounded-lg cursor-move hover:border-cyber-blue-500/50 hover:shadow-[0_0_15px_rgba(0,229,255,0.1)] transition-all active:cursor-grabbing group"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-dark-surface border border-white/5 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                        {member.fullName.charAt(0)}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-200 group-hover:text-cyber-blue-500 transition-colors">{member.fullName}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">{member.label}</div>
                    </div>
                </div>
                <svg className="w-4 h-4 text-slate-700 group-hover:text-cyber-blue-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </div>
        </div>
    );
};
