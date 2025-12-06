import { useEffect, useState } from 'react';
import type { Member, MemberStatus } from '../../types';
import { fetchMembers } from '../services/memberService';

export function useMembers(statusFilter?: MemberStatus) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
        const data = await fetchMembers(statusFilter);
        setMembers(data);
        setError(null);
    } catch (e: any) {
        console.error("Failed to fetch members", e);
        setError(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [statusFilter]);

  return { members, loading, error, reload };
}