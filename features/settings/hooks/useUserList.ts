import { useCallback, useEffect, useState } from 'react';

interface Profile {
  id: string;
  email: string;
  role: string;
  full_name?: string | null;
  is_active?: boolean;
  organization_id: string;
  created_at: string;
  status: 'active' | 'pending';
  invited_at?: string;
  confirmed_at?: string;
  last_sign_in_at?: string | null;
}

interface UseUserListParams {
  addToast: (message: string, type: 'success' | 'error') => void;
}

export type { Profile };

export function useUserList({ addToast }: UseUserListParams) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [maxUsers, setMaxUsers] = useState<number | null>(null);
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
      setMaxUsers(data?.maxUsers ?? null);
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

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Erro ao alterar role (HTTP ${res.status})`);
      }

      // Optimistic update
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      addToast('Role atualizado com sucesso', 'success');
    } catch (err: unknown) {
      addToast(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`, 'error');
      fetchUsers(); // Re-sync on error
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (userId: string, newIsActive: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: newIsActive }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Erro ao ${newIsActive ? 'reativar' : 'desativar'} usuário (HTTP ${res.status})`);
      }

      // Optimistic update
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: newIsActive } : u)));
      addToast(newIsActive ? 'Usuário reativado' : 'Usuário desativado', 'success');
    } catch (err: unknown) {
      addToast(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`, 'error');
      fetchUsers(); // Re-sync on error
    } finally {
      setActionLoading(null);
    }
  };

  const activeCount = users.filter((u) => u.is_active !== false).length;
  const isAtLimit = maxUsers !== null && activeCount >= maxUsers;

  return {
    users,
    loading,
    actionLoading,
    userToDelete,
    setUserToDelete,
    handleDeleteUser,
    confirmDeleteUser,
    handleUpdateRole,
    handleToggleActive,
    activeCount,
    maxUsers,
    isAtLimit,
  };
}
