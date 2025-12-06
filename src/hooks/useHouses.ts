import { useState, useEffect } from 'react';
import { House } from '../../types';
import { subscribeToHouses } from '../services/houseService';

export function useHouses() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    // subscribeToHouses returns an unsubscribe function
    const unsubscribe = subscribeToHouses((data) => {
      setHouses(data);
      setLoading(false);
      setError(null);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return { houses, loading, error };
}