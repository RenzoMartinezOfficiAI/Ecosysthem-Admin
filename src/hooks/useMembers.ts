import { useEffect, useState, useMemo } from 'react';
import type { Member, MemberStatus, UserRole } from '../../types';
import { subscribeToMembers } from '../services/memberService';

// Original hook - kept for backward compatibility if needed, but we encourage using the specialized ones
export function useMembers(statusFilter?: MemberStatus, role?: UserRole, assignedHouseIds?: string[]) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    let houseFilter: string[] | undefined = undefined;

    // RBAC: If House Lead, strict filtering applies
    if (role === 'HOUSE_LEAD') {
       if (assignedHouseIds && assignedHouseIds.length > 0) {
           houseFilter = assignedHouseIds;
       } else {
           // House Lead with no houses = empty list
           setMembers([]);
           setLoading(false);
           return;
       }
    }

    const unsubscribe = subscribeToMembers(
      (data) => {
        setMembers(data);
        setLoading(false);
        setError(null);
      },
      statusFilter,
      houseFilter,
      (err) => {
        // Handle error by setting error state and ensuring loading stops
        console.error("useMembers Hook Error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [statusFilter, role, assignedHouseIds?.join(',')]);

  return { members, loading, error };
}

// New specialized hooks for better performance

export function useMembersSummary(role?: UserRole, assignedHouseIds?: string[]) {
    // This hook could be optimized further by creating a specific Firestore query 
    // that only returns summary fields, but for now we reuse the main subscription 
    // and memoize the result to prevent unnecessary re-renders downstream.
    
    const { members, loading, error } = useMembers(undefined, role, assignedHouseIds);
    
    const summary = useMemo(() => {
        return members.map(m => ({
            id: m.id,
            fullName: m.fullName,
            status: m.status,
            houseId: m.houseId,
            label: m.label
        }));
    }, [members]);

    return { members: summary, loading, error };
}

export function useActiveMembers(role?: UserRole, assignedHouseIds?: string[]) {
    return useMembers('ACTIVE' as MemberStatus, role, assignedHouseIds);
}
