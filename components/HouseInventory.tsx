import React, { useState } from 'react';
import { InventoryItem, UserRole, House } from '../types';
import { MOCK_INVENTORY } from '../services/mockData';

interface HouseInventoryProps {
  house: House;
  userRole: UserRole;
  onBack: () => void;
}

const HouseInventory: React.FC<HouseInventoryProps> = ({ house, userRole, onBack }) => {
  // Simulating fetching inventory for this house
  const [inventory, setInventory] = useState<InventoryItem[]>(
    MOCK_INVENTORY.filter(item => item.houseId === house.id)
  );
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: '', category: 'Household', quantity: 0, reorderThreshold: 5, unit: 'pcs'
  });

  const canEditDetails = [UserRole.ADMIN, UserRole.OPERATIONS_MANAGER].includes(userRole);
  const canUpdateQuantity = [UserRole.ADMIN, UserRole.OPERATIONS_MANAGER, UserRole.HOUSE_LEAD].includes(userRole);

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setInventory(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || newItem.quantity === undefined) return;

    const item: InventoryItem = {
      id: `inv-${Date.now()}`,
      houseId: house.id,
      name: newItem.name,
      category: newItem.category,
      quantity: newItem.quantity,
      reorderThreshold: newItem.reorderThreshold || 0,
      unit: newItem.unit || 'units',
      updatedAt: new Date().toISOString()
    };

    setInventory([...inventory, item]);
    setShowAddModal(false);
    setNewItem({ name: '', category: 'Household', quantity: 0, reorderThreshold: 5, unit: 'pcs' });
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm("Are you sure you want to remove this item from inventory tracking?")) {
        setInventory(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{house.name} Inventory</h2>
            <p className="text-sm text-slate-500">Manage supplies and reorder levels</p>
          </div>
        </div>
        
        {canEditDetails && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Item
          </button>
        )}
      </div>

      {/* FILTER & STATS */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input
                type="text"
                placeholder="Search inventory..."
                className="pl-10 w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex gap-4 text-sm font-medium text-slate-600 items-center">
            <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span>
                In Stock
            </span>
            <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></span>
                Low Stock
            </span>
            <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2"></span>
                Critical
            </span>
        </div>
      </div>

      {/* INVENTORY LIST */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
                {filteredInventory.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                            No inventory items found.
                        </td>
                    </tr>
                ) : (
                    filteredInventory.map(item => {
                        const isLow = item.quantity <= item.reorderThreshold;
                        const isCritical = item.quantity === 0;
                        
                        return (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-slate-900">{item.name}</div>
                                    <div className="text-xs text-slate-500">Unit: {item.unit}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-200">
                                        {item.category || 'General'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {isCritical ? (
                                        <span className="px-2 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">Critical</span>
                                    ) : isLow ? (
                                        <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">Low Stock</span>
                                    ) : (
                                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">Good</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="text-sm font-bold text-slate-900">{item.quantity}</div>
                                    <div className="text-xs text-slate-400">Target: {item.reorderThreshold}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        {canUpdateQuantity && (
                                            <>
                                                <button 
                                                    onClick={() => handleUpdateQuantity(item.id, -1)}
                                                    className="p-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 transition-colors"
                                                    title="Consume"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateQuantity(item.id, 1)}
                                                    className="p-1 rounded bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 transition-colors"
                                                    title="Restock"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                </button>
                                            </>
                                        )}
                                        {canEditDetails && (
                                            <button 
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="p-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors ml-2"
                                                title="Delete Item"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
      </div>

      {/* ADD ITEM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900">Add Inventory Item</h3>
                </div>
                <form onSubmit={handleAddItem} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Item Name</label>
                        <input required type="text" className="mt-1 w-full border border-slate-300 rounded-md p-2" 
                            value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Category</label>
                            <select className="mt-1 w-full border border-slate-300 rounded-md p-2"
                                value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                                <option>Household</option>
                                <option>Cleaning</option>
                                <option>Maintenance</option>
                                <option>Food</option>
                                <option>Office</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Unit</label>
                            <input required type="text" className="mt-1 w-full border border-slate-300 rounded-md p-2" placeholder="pcs, boxes..."
                                value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Current Qty</label>
                            <input required type="number" min="0" className="mt-1 w-full border border-slate-300 rounded-md p-2" 
                                value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Low Stock Alert</label>
                            <input required type="number" min="0" className="mt-1 w-full border border-slate-300 rounded-md p-2" 
                                value={newItem.reorderThreshold} onChange={e => setNewItem({...newItem, reorderThreshold: parseInt(e.target.value)})} />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6 pt-2">
                        <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Create Item</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default HouseInventory;