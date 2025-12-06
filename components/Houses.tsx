import React, { useState } from 'react';
import { House, HouseStatus, UserRole } from '../types';
import HouseInventory from './HouseInventory';
import { createHouse, updateHouse, CreateHouseInput } from '../src/services/houseService';

interface HousesProps {
  houses: House[];
  userRole: UserRole;
  onRefresh?: () => void;
}

const Houses: React.FC<HousesProps> = ({ houses, userRole, onRefresh }) => {
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  
  // Form States
  const [formData, setFormData] = useState<CreateHouseInput>({
    name: '', address: '', capacity: 0, status: 'ONLINE', tags: [], city: '', state: '', postalCode: '', notes: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = [UserRole.ADMIN, UserRole.OPERATIONS_MANAGER].includes(userRole);

  const getStatusColor = (status: HouseStatus) => {
    switch (status) {
      case HouseStatus.ONLINE: return 'bg-emerald-100 text-emerald-800';
      case HouseStatus.MAINTENANCE: return 'bg-amber-100 text-amber-800';
      case HouseStatus.OFFLINE: return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const handleOpenAdd = () => {
    setFormData({ name: '', address: '', capacity: 0, status: 'ONLINE', tags: [], city: '', state: '', postalCode: '', notes: '' });
    setTagInput('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (house: House) => {
    setEditingHouse(house);
    setFormData({
        name: house.name,
        address: house.address,
        capacity: house.capacity,
        status: house.status as any,
        tags: house.tags,
        city: house.city || '',
        state: house.state || '',
        postalCode: house.postalCode || '',
        notes: house.notes || ''
    });
    setTagInput('');
    setIsAddModalOpen(true); // Reusing the same modal for simplicity
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        if (editingHouse) {
            await updateHouse(editingHouse.id, formData);
        } else {
            await createHouse(formData);
        }
        setIsAddModalOpen(false);
        setEditingHouse(null);
        if (onRefresh) onRefresh();
    } catch (error) {
        console.error(error);
        alert("Operation failed. See console.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const addTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && tagInput.trim()) {
          e.preventDefault();
          if (!formData.tags?.includes(tagInput.trim())) {
              setFormData({ ...formData, tags: [...(formData.tags || []), tagInput.trim()] });
          }
          setTagInput('');
      }
  };

  const removeTag = (tag: string) => {
      setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tag) });
  };

  // If a house is selected for Inventory View
  if (selectedHouseId) {
    const selectedHouse = houses.find(h => h.id === selectedHouseId);
    if (!selectedHouse) return <div>House not found</div>;
    
    return (
      <HouseInventory 
        house={selectedHouse} 
        userRole={userRole} 
        onBack={() => setSelectedHouseId(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-slate-800">Managed Properties</h2>
        {canEdit && (
          <button 
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm"
          >
            + Add House
          </button>
        )}
      </div>

      {houses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">No houses found. Add one to get started.</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {houses.map((house) => (
            <div key={house.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="p-6 flex-1">
                <div className="flex justify-between items-start">
                    <div>
                    <h3 className="font-bold text-slate-900 text-lg">{house.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 flex items-center">
                        <svg className="w-4 h-4 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {house.address}
                    </p>
                    {house.city && <p className="text-xs text-slate-400 ml-5">{house.city}, {house.state} {house.postalCode}</p>}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(house.status)}`}>
                    {house.status}
                    </span>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                    <div className="flex items-center text-slate-600">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Capacity: <span className="font-semibold ml-1">{house.capacity}</span>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {house.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-slate-50 text-slate-600 text-xs rounded border border-slate-200">
                        {tag}
                    </span>
                    ))}
                </div>
                
                {house.notes && (
                    <p className="mt-3 text-xs text-slate-400 italic border-t border-slate-100 pt-2 line-clamp-2">"{house.notes}"</p>
                )}
                </div>
                
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center">
                    <button 
                    onClick={() => setSelectedHouseId(house.id)}
                    className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center"
                    >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    Inventory
                    </button>
                    {canEdit && (
                         <button onClick={() => handleOpenEdit(house)} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Edit
                         </button>
                    )}
                </div>
            </div>
            ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-slate-200">
                      <h3 className="text-xl font-bold text-slate-900">{editingHouse ? 'Edit House' : 'Add New House'}</h3>
                  </div>
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="col-span-2">
                              <label className="block text-sm font-medium text-slate-700">House Name</label>
                              <input required type="text" className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                          </div>
                          <div className="col-span-2">
                              <label className="block text-sm font-medium text-slate-700">Address Line 1</label>
                              <input required type="text" className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700">City</label>
                              <input type="text" className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                  value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">State</label>
                                    <input type="text" className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                        value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Zip</label>
                                    <input type="text" className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                        value={formData.postalCode} onChange={e => setFormData({...formData, postalCode: e.target.value})} />
                                </div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700">Capacity (Beds)</label>
                              <input required type="number" className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                  value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700">Status</label>
                              <select className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                  value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                  <option value="ONLINE">Online</option>
                                  <option value="MAINTENANCE">Maintenance</option>
                                  <option value="OFFLINE">Offline</option>
                              </select>
                          </div>
                          <div className="col-span-2">
                              <label className="block text-sm font-medium text-slate-700">Notes</label>
                              <textarea className="mt-1 w-full border border-slate-300 rounded-md p-2" rows={2}
                                  value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                          </div>
                          <div className="col-span-2">
                              <label className="block text-sm font-medium text-slate-700">Tags (Press Enter)</label>
                              <div className="mt-1 flex flex-wrap gap-2 p-2 border border-slate-300 rounded-md bg-white">
                                  {formData.tags?.map(tag => (
                                      <span key={tag} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs flex items-center">
                                          {tag}
                                          <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-indigo-400 hover:text-indigo-900">×</button>
                                      </span>
                                  ))}
                                  <input 
                                    type="text" 
                                    className="flex-1 outline-none text-sm min-w-[100px]" 
                                    placeholder={formData.tags?.length === 0 ? "Type tag..." : ""}
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={addTag}
                                  />
                              </div>
                          </div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-100">
                          <button type="button" onClick={() => {setIsAddModalOpen(false); setEditingHouse(null);}} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
                          <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                              {isSubmitting ? 'Saving...' : (editingHouse ? 'Update House' : 'Create House')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Houses;