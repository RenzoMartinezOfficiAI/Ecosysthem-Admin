import React, { useState, useEffect } from 'react';
import { House, UserRole, HouseStatus } from '../../../types';
import { createHouse, updateHouse } from '../../services/houseService';

interface HousesProps {
  houses: House[];
  userRole: UserRole;
}

// Sub-component for the Detail Modal to keep the main component clean
const HouseDetailModal: React.FC<{
    house: House | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, data: Partial<House>) => Promise<void>;
    canEdit: boolean;
}> = ({ house, isOpen, onClose, onSave, canEdit }) => {
    const [formData, setFormData] = useState<Partial<House>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (house) {
            setFormData({
                name: house.name,
                address: house.address,
                capacity: house.capacity,
                status: house.status
            });
        }
    }, [house]);

    if (!isOpen || !house) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(house.id, formData);
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to update house");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black-matte/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-enter">
            <div className="bg-dark-surface rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-black-matte/50">
                    <h3 className="text-lg font-bold text-white tracking-wide">Property Details</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-cyber-blue-500 uppercase tracking-widest mb-2">Property Name</label>
                        <input 
                            type="text" 
                            required 
                            disabled={!canEdit}
                            className="input disabled:opacity-50 disabled:cursor-not-allowed" 
                            value={formData.name || ''} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-cyber-blue-500 uppercase tracking-widest mb-2">Address Coordinates</label>
                        <input 
                            type="text" 
                            required 
                            disabled={!canEdit}
                            className="input disabled:opacity-50 disabled:cursor-not-allowed" 
                            value={formData.address || ''} 
                            onChange={e => setFormData({...formData, address: e.target.value})} 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-cyber-blue-500 uppercase tracking-widest mb-2">Capacity</label>
                            <input 
                                type="number" 
                                required 
                                disabled={!canEdit}
                                className="input disabled:opacity-50 disabled:cursor-not-allowed" 
                                value={formData.capacity || 0} 
                                onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-cyber-blue-500 uppercase tracking-widest mb-2">Status</label>
                            <select 
                                disabled={!canEdit}
                                className="input disabled:opacity-50 disabled:cursor-not-allowed"
                                value={formData.status || 'ONLINE'}
                                onChange={e => setFormData({...formData, status: e.target.value as HouseStatus})}
                            >
                                <option value="ONLINE">ONLINE</option>
                                <option value="MAINTENANCE">MAINTENANCE</option>
                                <option value="OFFLINE">OFFLINE</option>
                            </select>
                        </div>
                    </div>
                    
                    {canEdit && (
                        <div className="pt-6 flex justify-end gap-3 border-t border-white/5 mt-2">
                            <button type="button" onClick={onClose} className="btn btn-secondary text-xs">Cancel</button>
                            <button type="submit" disabled={saving} className="btn btn-primary text-xs">
                                {saving ? 'Updating...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

const Houses: React.FC<HousesProps> = ({ houses, userRole }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  
  // Create Form State
  const [newHouseName, setNewHouseName] = useState('');
  const [newHouseAddress, setNewHouseAddress] = useState('');
  const [newHouseCapacity, setNewHouseCapacity] = useState(0);

  const canEdit = [UserRole.ADMIN, UserRole.OPERATIONS_MANAGER].includes(userRole);

  const handleAddHouse = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await createHouse({ 
              name: newHouseName, 
              address: newHouseAddress, 
              capacity: newHouseCapacity 
          });
          setShowAddModal(false);
          setNewHouseName('');
          setNewHouseAddress('');
          setNewHouseCapacity(0);
      } catch (err) {
          alert("Failed to create house");
      }
  };

  const handleUpdateHouse = async (id: string, data: Partial<House>) => {
      await updateHouse(id, data);
  };

  return (
    <div className="space-y-8 animate-enter">
       <div className="flex justify-between items-center">
         <div>
            <h2 className="text-xl font-bold text-white glow-text">Portfolio</h2>
            <p className="text-sm text-slate-400 mt-1">Manage all registered sector properties.</p>
         </div>
         {canEdit && (
             <button 
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary"
             >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Property
             </button>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {houses.map(house => (
              <div key={house.id} className="card p-6 flex flex-col justify-between group h-full relative overflow-hidden bg-dark-surface/80 backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded-lg bg-black-matte border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-cyber-blue-500 group-hover:border-cyber-blue-500/50 transition-all duration-300 shadow-inner">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                          </div>
                          <span className={`badge ${house.status === 'ONLINE' ? 'badge-success' : house.status === 'MAINTENANCE' ? 'badge-warning' : 'badge-error'}`}>
                              {house.status}
                          </span>
                      </div>
                      <h3 className="font-bold text-lg text-white mb-1 group-hover:text-cyber-blue-500 transition-colors">{house.name}</h3>
                      <p className="text-sm text-slate-400 line-clamp-2 h-10">{house.address}</p>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
                      <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <svg className="w-4 h-4 mr-1.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          {house.capacity} Beds
                      </div>
                      <button 
                        onClick={() => setSelectedHouse(house)}
                        className="text-xs font-bold text-cyber-blue-500 hover:text-white uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0"
                      >
                          View Details →
                      </button>
                  </div>
              </div>
          ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
          <div className="fixed inset-0 bg-black-matte/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-enter">
              <div className="bg-dark-surface rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden">
                  <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-black-matte/50">
                      <h3 className="text-lg font-bold text-white tracking-wide">Add New Property</h3>
                      <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>
                  <form onSubmit={handleAddHouse} className="p-8 space-y-6">
                      <div>
                          <label className="block text-xs font-bold text-cyber-blue-500 uppercase tracking-widest mb-2">Property Name</label>
                          <input 
                            type="text" 
                            required 
                            className="input" 
                            placeholder="e.g. Sector 7 Outpost"
                            value={newHouseName} 
                            onChange={e => setNewHouseName(e.target.value)} 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-cyber-blue-500 uppercase tracking-widest mb-2">Address Coordinates</label>
                          <input 
                            type="text" 
                            required 
                            className="input" 
                            placeholder="123 Main St, City, State"
                            value={newHouseAddress} 
                            onChange={e => setNewHouseAddress(e.target.value)} 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-cyber-blue-500 uppercase tracking-widest mb-2">Capacity (Units)</label>
                          <input 
                            type="number" 
                            required 
                            className="input" 
                            placeholder="0"
                            min="0"
                            value={newHouseCapacity} 
                            onChange={e => setNewHouseCapacity(parseInt(e.target.value))} 
                          />
                      </div>
                      <div className="pt-6 flex justify-end gap-3 border-t border-white/5 mt-2">
                          <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary text-xs">Cancel</button>
                          <button type="submit" className="btn btn-primary text-xs">Initialize Property</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Edit/View Details Modal */}
      <HouseDetailModal 
        house={selectedHouse}
        isOpen={!!selectedHouse}
        onClose={() => setSelectedHouse(null)}
        onSave={handleUpdateHouse}
        canEdit={canEdit}
      />
    </div>
  );
};

export default Houses;
