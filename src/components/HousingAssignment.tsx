import React, { useState, useEffect } from 'react';
import { House, Member } from '../../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useHouses } from '../hooks/useHouses';
import { useMembers } from '../hooks/useMembers';
import { updateMember } from '../services/memberService';

export const HousingAssignment: React.FC = () => {
    const { houses } = useHouses();
    const { members } = useMembers(); // Should ideally use a specialized hook for efficient re-renders
    const [localMembers, setLocalMembers] = useState<Member[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setLocalMembers(members);
    }, [members]);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newHouseId = destination.droppableId === 'unassigned' ? null : destination.droppableId;
        
        // Optimistic UI Update
        const updatedMembers = localMembers.map(m => 
            m.id === draggableId ? { ...m, houseId: newHouseId } : m
        );
        setLocalMembers(updatedMembers);

        try {
            await updateMember(draggableId, { houseId: newHouseId });
        } catch (err: unknown) {
            console.error("Failed to update housing assignment", err);
            // Revert on failure
            setLocalMembers(members);
            alert("Failed to move member. Please try again.");
        }
    };

    const getHouseMembers = (houseId: string) => localMembers.filter(m => m.houseId === houseId);
    const getUnassignedMembers = () => localMembers.filter(m => !m.houseId && m.status === 'ACTIVE');

    const filteredUnassigned = getUnassignedMembers().filter(m => 
        m.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 h-full flex flex-col p-6 animate-enter">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <div>
                  <h2 className="text-xl font-bold text-white glow-text">Housing Assignment</h2>
                  <p className="text-sm text-slate-400 mt-1">Drag and drop members to assign housing.</p>
               </div>
               <div className="w-full sm:w-auto">
                  <input 
                    type="text" 
                    placeholder="Search unassigned..." 
                    className="w-full sm:w-64 bg-matte-900 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex flex-col lg:flex-row flex-1 gap-6 overflow-hidden">
                    {/* Unassigned Column */}
                    <div className="w-full lg:w-72 flex-shrink-0 flex flex-col bg-matte-900 rounded-lg border border-matte-800 h-[300px] lg:h-full">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-white text-sm uppercase tracking-wide">Unassigned</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Pool</p>
                            </div>
                            <span className="text-xs font-bold text-slate-400 bg-white/10 px-2 py-0.5 rounded-full">{filteredUnassigned.length}</span>
                        </div>
                        <Droppable droppableId="unassigned">
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 overflow-y-auto p-3 space-y-2 transition-colors scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent ${snapshot.isDraggingOver ? 'bg-neon-blue-500/5' : ''}`}
                                >
                                    {filteredUnassigned.map((member, index) => (
                                        <Draggable key={member.id} draggableId={member.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`p-3 rounded bg-black-matte border border-white/10 shadow-sm hover:border-neon-blue-500/50 group select-none transition-all ${snapshot.isDragging ? 'ring-2 ring-neon-blue-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] z-50 rotate-2' : ''}`}
                                                    style={{ ...provided.draggableProps.style }}
                                                >
                                                    <div className="font-bold text-slate-200 text-sm group-hover:text-neon-blue-500 transition-colors">{member.fullName}</div>
                                                    <div className="text-[10px] text-slate-500 mt-1 font-mono">{member.id.slice(0, 8)}</div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>

                    {/* Houses Grid */}
                    <div className="flex-1 overflow-y-auto pr-2 pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {houses.map(house => {
                                const occupants = getHouseMembers(house.id);
                                const isFull = occupants.length >= house.capacity;
                                
                                return (
                                    <div key={house.id} className="bg-matte-900 rounded-lg border border-matte-800 flex flex-col h-[350px] group hover:border-matte-700 transition-colors">
                                        <div className="p-4 border-b border-white/5 flex justify-between items-start bg-white/5">
                                            <div>
                                                <h3 className="font-bold text-white text-sm truncate max-w-[150px] uppercase tracking-wide group-hover:text-neon-blue-500 transition-colors" title={house.name}>{house.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="w-full bg-black-matte h-1.5 w-20 rounded-full overflow-hidden border border-white/5">
                                                         <div 
                                                            className={`h-full transition-all duration-500 ${isFull ? 'bg-neon-red-500' : 'bg-neon-green-500'}`} 
                                                            style={{ width: `${(occupants.length / house.capacity) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 font-mono">{occupants.length}/{house.capacity}</span>
                                                </div>
                                            </div>
                                            {isFull && <span className="text-[10px] font-bold text-neon-red-500 bg-neon-red-500/10 px-2 py-0.5 rounded border border-neon-red-500/20 animate-pulse">FULL</span>}
                                        </div>
                                        
                                        <Droppable droppableId={house.id} isDropDisabled={isFull}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    className={`flex-1 overflow-y-auto p-3 space-y-2 transition-colors scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent ${snapshot.isDraggingOver ? 'bg-neon-green-500/5' : ''}`}
                                                >
                                                    {occupants.map((member, index) => (
                                                        <Draggable key={member.id} draggableId={member.id} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={`p-2 rounded bg-black-matte border border-white/10 shadow-sm flex items-center gap-3 select-none hover:border-white/20 transition-colors ${snapshot.isDragging ? 'ring-2 ring-neon-blue-500' : ''}`}
                                                                    style={{ ...provided.draggableProps.style }}
                                                                >
                                                                    <div className="w-7 h-7 rounded-lg bg-dark-surface border border-white/10 flex items-center justify-center text-xs text-neon-blue-500 font-bold shadow-inner">
                                                                        {member.fullName.charAt(0)}
                                                                    </div>
                                                                    <div className="font-bold text-slate-300 text-xs truncate flex-1">{member.fullName}</div>
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-neon-green-500 shadow-[0_0_5px_rgba(74,222,128,0.5)]"></div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </DragDropContext>
        </div>
    );
};
