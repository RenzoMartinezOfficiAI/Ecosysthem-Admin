import { useEffect, useState } from 'react';
import type { Member, MemberStatus, UserRole } from '../../types';
import { subscribeToMembers } from '../services/memberService';

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
      houseFilter
    );

    return () => unsubscribe();
  }, [statusFilter, role, assignedHouseIds?.join(',')]);

  return { members, loading, error };
}