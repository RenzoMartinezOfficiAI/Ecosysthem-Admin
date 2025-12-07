import React from 'react';
import { useHouses } from '../src/hooks/useHouses';

export function HousesPage() {
  const { houses, loading, error } = useHouses();

  if (loading) return <div className="p-8 text-center text-slate-500">Loading houses...</div>;
  if (error) return <div className="p-8 text-center text-rose-500">Error loading houses: {error.message}</div>;

  if (!houses.length) {
    return <div className="p-8 text-center text-slate-500">No houses found. Make sure the "houses" collection in Firestore has documents.</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Houses (Debug View)</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {houses.map((house) => (
          <div key={house.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">{house.name}</h2>
            <p className="text-slate-600 mt-1">{house.address}</p>
            <div className="mt-4 flex gap-4 text-sm text-slate-500">
                <span>Capacity: {house.capacity}</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium text-xs flex items-center">{house.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
