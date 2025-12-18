import { useState, useEffect, useMemo } from 'react';
import { House } from '../../types';
import { subscribeToHouses } from '../services/houseService';

export function useHouses() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToHouses(
      (data) => {
        setHouses(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("useHouses Hook Error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Memoize the return value to stabilize reference across renders
  return useMemo(() => ({ houses, loading, error }), [houses, loading, error]);
}
