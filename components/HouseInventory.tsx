import React, { useState, useEffect } from 'react';
import { InventoryItem, UserRole, House } from '../types';
import { 
  subscribeToInventory, 
  createInventoryItem, 
  updateInventoryQuantity, 
  deleteInventoryItem 
} from '../src/services/inventoryService';

interface HouseInventoryProps {
  house: House;
  userRole: UserRole;
  onBack: () => void;
}

const HouseInventory: React.FC<HouseInventoryProps> = ({ house, userRole, onBack }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [newItem, setNewItem] = useState({
    name: '', category: 'Household', quantity: 0, reorderThreshold: 5, unit: 'pcs'
  });

  // Realtime Subscription
  useEffect(() => {
    const unsubscribe = subscribeToInventory(house.id, (items) => {
      setInventory(items);
    });
    return () => unsubscribe();
  }, [house.id]);

  const canEditDetails = [UserRole.ADMIN, UserRole.OPERATIONS_MANAGER].includes(userRole);
  const canUpdateQuantity = [UserRole.ADMIN, UserRole.OPERATIONS_MANAGER, UserRole.HOUSE_LEAD].includes(userRole);

  const handleUpdateQuantity = async (itemId: string, delta: number) => {
    // Optimistic check to prevent negative (though backend won't stop it unless rules say so)
    const item = inventory.find(i => i.id === itemId);
    if (item && item.quantity + delta < 0) return;

    try {
      await updateInventoryQuantity(itemId, delta);
    } catch (err) {
      console.error("Failed to update quantity", err);
      alert("Failed to update quantity");
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name) return;
    setLoading(true);

    try {
      await createInventoryItem({
        houseId: house.id,
        name: newItem.name,
        category: newItem.category,
        quantity: newItem.quantity,
        reorderThreshold: newItem.reorderThreshold,
        unit: newItem.unit
      });
      setShowAddModal(false);
      setNewItem({ name: '', category: 'Household', quantity: 0, reorderThreshold: 5, unit: 'pcs' });
    } catch (err) {
      console.error(err);
      alert("Failed to create item");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteInventoryItem(itemId);
    } catch (err) {
      console.error(err);
      alert("Failed to delete item");
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-matte-800 text-gray-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-white glow-text">{house.name} Inventory</h2>
            <p className="text-sm text-gray-500">Real-time supply tracking</p>
          </div>
        </div>
        
        {canEditDetails && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-neon-blue text-matte-950 rounded-lg text-sm font-bold hover:bg-cyan-400 shadow-glow-blue flex items-center transition-all"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Item
          </button>
        )}
      </div>

      {/* FILTER & STATS */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
            <input
                type="text"
                placeholder="Search inventory..."
                className="w-full bg-matte-900 border border-matte-700 rounded-lg p-2 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* INVENTORY LIST */}
      <div className="bg-matte-900 rounded-xl shadow-sm border border-matte-800 overflow-hidden">
        <table className="min-w-full divide-y divide-matte-800">
            <thead className="bg-matte-900/50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-matte-900 divide-y divide-matte-800">
                {filteredInventory.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No items found.</td></tr>
                ) : (
                    filteredInventory.map(item => {
                        const isLow = item.quantity <= item.reorderThreshold;
                        const isCritical = item.quantity === 0;
                        
                        return (
                            <tr key={item.id} className="hover:bg-matte-800/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-white">{item.name}</div>
                                    <div className="text-xs text-gray-500">{item.unit}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-matte-800 text-gray-400 text-xs rounded-full border border-matte-700">{item.category}</span>
                                </td>
                                <td className="px-6 py-4">
                                    {isCritical ? <span className="text-red-500 font-bold text-xs uppercase tracking-wide">Critical</span> : 
                                     isLow ? <span className="text-amber-500 font-bold text-xs uppercase tracking-wide">Low</span> : 
                                     <span className="text-neon-green font-bold text-xs uppercase tracking-wide">OK</span>}
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-white">
                                    {item.quantity}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {canUpdateQuantity && (
                                        <>
                                            <button onClick={() => handleUpdateQuantity(item.id, -1)} className="text-red-500 font-bold px-2 hover:bg-red-500/10 rounded transition-colors">-</button>
                                            <button onClick={() => handleUpdateQuantity(item.id, 1)} className="text-neon-green font-bold px-2 hover:bg-neon-green/10 rounded transition-colors">+</button>
                                        </>
                                    )}
                                    {canEditDetails && (
                                        <button onClick={() => handleDeleteItem(item.id)} className="text-gray-500 hover:text-red-500 ml-2 transition-colors">Del</button>
                                    )}
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-matte-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-matte-900 rounded-xl shadow-2xl border border-matte-700 max-w-md w-full p-6">
                <h3 className="text-lg font-bold text-white mb-4 glow-text">Add Item</h3>
                <form onSubmit={handleAddItem} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                        <input required className="w-full bg-matte-950 border border-matte-700 rounded p-2 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none" 
                            value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                            <select className="w-full bg-matte-950 border border-matte-700 rounded-md p-2 text-white focus:border-neon-blue outline-none"
                                value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                                <option>Household</option>
                                <option>Cleaning</option>
                                <option>Maintenance</option>
                                <option>Food</option>
                                <option>Office</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Unit</label>
                            <input required type="text" className="w-full bg-matte-950 border border-matte-700 rounded-md p-2 text-white focus:border-neon-blue outline-none" placeholder="pcs, boxes..."
                                value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm text-gray-400 mb-1">Qty</label><input type="number" className="w-full bg-matte-950 border border-matte-700 rounded p-2 text-white focus:border-neon-blue outline-none" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} /></div>
                        <div><label className="block text-sm text-gray-400 mb-1">Alert At</label><input type="number" className="w-full bg-matte-950 border border-matte-700 rounded p-2 text-white focus:border-neon-blue outline-none" value={newItem.reorderThreshold} onChange={e => setNewItem({...newItem, reorderThreshold: parseInt(e.target.value)})} /></div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 border-t border-matte-800 pt-4">
                        <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-neon-blue text-matte-950 font-bold rounded hover:bg-cyan-400 shadow-glow-blue transition-all">Save</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default HouseInventory;