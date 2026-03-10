import { useCallback, useEffect, useState } from 'react';

interface Profile {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  created_at: string;
  status: 'active' | 'pending';
  invited_at?: string;
  confirmed_at?: string;
  last_sign_in_at?: string;
}

interface UseUserListParams {
  addToast: (message: string, type: 'success' | 'error') => void;
}

export type { Profile };

export function useUserList({ addToast }: UseUserListParams) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'GET',
        headers: { accept: 'application/json' },
        credentials: 'include',
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Falha ao carregar usuários (HTTP ${res.status})`);
      }

      setUsers(data?.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = (user: Profile) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setActionLoading(userToDelete.id);
    setUserToDelete(null);

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { accept: 'application/json' },
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Erro ao remover usuário (HTTP ${res.status})`);
      }

      addToast(
        userToDelete.status === 'pending' ? 'Convite cancelado' : 'Usuário removido',
        'success'
      );
      fetchUsers();
    } catch (err: unknown) {
      addToast(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return {
    users,
    loading,
    actionLoading,
    userToDelete,
    setUserToDelete,
    handleDeleteUser,
    confirmDeleteUser,
  };
}
