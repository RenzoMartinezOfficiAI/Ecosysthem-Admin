import React, { useState, useMemo, useRef } from 'react';
import { House, Member, HouseStatus } from '../types';
import { useHouses } from '../src/hooks/useHouses';
import { useMembers } from '../src/hooks/useMembers';
import { updateMember } from '../src/services/memberService';

export const HousingAssignment: React.FC = () => {
  const { houses, loading: housesLoading } = useHouses();
  const { members, loading: membersLoading } = useMembers();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Group members by House ID
  const membersByHouse = useMemo(() => {
    const grouped: Record<string, Member[]> = { 'unassigned': [] };
    houses.forEach(h => grouped[h.id] = []);
    
    members.forEach(m => {
      const hId = m.houseId || 'unassigned';
      if (!grouped[hId]) grouped[hId] = []; // Handle case if house deleted
      grouped[hId].push(m);
    });
    return grouped;
  }, [houses, members]);

  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    setDraggedMemberId(memberId);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag image or default
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Auto-scroll horizontal container
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const { left, width } = container.getBoundingClientRect();
      const x = e.clientX;
      const threshold = 100; // Trigger scroll when within 100px of edge
      const speed = 5; // Slower scroll speed for better control

      if (x < left + threshold) {
        container.scrollLeft -= speed;
      } else if (x > left + width - threshold) {
        container.scrollLeft += speed;
      }
    }
  };

  const handleDrop = async (e: React.DragEvent, targetHouseId: string | null) => {
    e.preventDefault();
    const memberId = draggedMemberId;
    setDraggedMemberId(null);

    if (!memberId) return;

    // Find the member to verify we aren't dropping in same place
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    if (member.houseId === targetHouseId) return; // No change

    setUpdatingId(memberId);
    setError(null);

    try {
      await updateMember(memberId, { houseId: targetHouseId });
      // Firestore subscription will auto-update the UI
    } catch (err: any) {
      console.error("Failed to move member:", err);
      setError(`Failed to move ${member.fullName}: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  if (housesLoading || membersLoading) {
    return <div className="p-8 text-center text-gray-500">Loading assignment board...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-start">
        <div>
           <h2 className="text-xl font-bold text-white glow-text">Housing Assignment</h2>
           <p className="text-sm text-gray-500 mt-1">Drag and drop members to assign them to houses.</p>
        </div>
        {error && (
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">
                {error}
            </div>
        )}
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto pb-4"
        onDragOver={handleDragOver}
      >
        <div className="flex space-x-6 min-w-max h-full">
          
          {/* UNASSIGNED COLUMN */}
          <HouseColumn 
            houseId={null} 
            name="Unassigned" 
            capacity={0} 
            members={membersByHouse['unassigned'] || []}
            isUnassigned={true}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
            onDragStart={handleDragStart}
            updatingId={updatingId}
          />

          {/* HOUSE COLUMNS */}
          {houses.map(house => (
            <HouseColumn
              key={house.id}
              houseId={house.id}
              name={house.name}
              capacity={house.capacity}
              status={house.status}
              members={membersByHouse[house.id] || []}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, house.id)}
              onDragStart={handleDragStart}
              updatingId={updatingId}
            />
          ))}

        </div>
      </div>
    </div>
  );
};

interface ColumnProps {
  houseId: string | null;
  name: string;
  capacity: number;
  status?: HouseStatus;
  members: Member[];
  isUnassigned?: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  updatingId: string | null;
}

const HouseColumn: React.FC<ColumnProps> = ({ 
  name, capacity, status, members, isUnassigned, 
  onDragOver, onDrop, onDragStart, updatingId 
}) => {
  const isFull = !isUnassigned && members.length >= capacity;
  const isOverCapacity = !isUnassigned && members.length > capacity;
  
  // Status Color Logic
  const statusColor = status === 'OFFLINE' ? 'bg-matte-800 border-matte-700' :
                      status === 'MAINTENANCE' ? 'bg-amber-500/10 border-amber-500/20' :
                      'bg-matte-900 border-matte-800';

  return (
    <div 
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`
        w-80 flex flex-col rounded-xl border-2 transition-colors duration-200
        ${isUnassigned ? 'bg-matte-900 border-dashed border-matte-700' : statusColor}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-matte-800/50">
        <div className="flex justify-between items-start">
            <h3 className={`font-bold ${isUnassigned ? 'text-gray-500' : 'text-white'}`}>
                {name}
            </h3>
            {!isUnassigned && status && (
                 <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    status === 'ONLINE' ? 'bg-neon-green/10 text-neon-green' : 'bg-matte-800 text-gray-500'
                 }`}>
                    {status}
                 </span>
            )}
        </div>
        
        <div className="mt-2 flex justify-between items-end">
            <div className={`text-xs font-medium ${
                isOverCapacity ? 'text-red-500' : isFull ? 'text-amber-500' : 'text-gray-500'
            }`}>
                {isUnassigned ? (
                    `${members.length} Members`
                ) : (
                    <>
                        <span className="text-lg">{members.length}</span> <span className="text-gray-600">/ {capacity}</span>
                    </>
                )}
            </div>
            {isOverCapacity && (
                <span className="text-xs text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                    Over Capacity
                </span>
            )}
        </div>
      </div>

      {/* Member List */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[200px]">
        {members.map(m => (
            <div
                key={m.id}
                draggable
                onDragStart={(e) => onDragStart(e, m.id)}
                className={`
                    p-3 rounded-lg shadow-sm border border-matte-800 bg-matte-950 cursor-move 
                    hover:shadow-glow-blue hover:border-neon-blue transition-all active:cursor-grabbing group
                    ${updatingId === m.id ? 'opacity-50 animate-pulse' : ''}
                `}
            >
                <div className="flex justify-between items-start">
                    <div className="font-semibold text-gray-200 text-sm group-hover:text-neon-blue transition-colors">{m.fullName}</div>
                    <span className={`w-2 h-2 rounded-full mt-1.5 ${
                        m.status === 'ACTIVE' ? 'bg-neon-green' : 'bg-matte-700'
                    }`}></span>
                </div>
                <div className="mt-1 text-xs text-gray-500 truncate">
                    {m.payType}
                </div>
            </div>
        ))}
        {members.length === 0 && (
            <div className="h-full flex items-center justify-center text-xs text-gray-600 italic">
                No members assigned
            </div>
        )}
      </div>
    </div>
  );
};
