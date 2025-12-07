import { useState, useEffect } from 'react';
import { House } from '../../types';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useHouses() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'houses'), orderBy('name'));

    // subscribeToHouses logic inlined here or essentially replaced by this direct implementation
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: House[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.name,
            address: d.address,
            capacity: d.capacity,
            status: d.status,
            tags: d.tags ?? [],
            notes: d.notes,
            city: d.city,
            state: d.state,
            postalCode: d.postalCode,
            createdAt: d.createdAt ?? new Date().toISOString(),
            updatedAt: d.updatedAt ?? new Date().toISOString(),
          };
        });
        setHouses(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Handle error by setting error state and ensuring loading stops
        console.error("useHouses Hook Error:", err);
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return { houses, loading, error };
}