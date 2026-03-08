import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasMinRole, type Role } from '@/lib/auth/roles';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { User } from 'lucide-react';

interface CorretorSelectProps {
  value: string | undefined;
  onChange: (ownerId: string) => void;
  disabled?: boolean;
}

export const CorretorSelect: React.FC<CorretorSelectProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { profile } = useAuth();
  const { members, loading } = useOrganizationMembers();

  const userRole = (profile?.role as Role) || 'corretor';
  const canEdit = hasMinRole(userRole, 'diretor') && !disabled;

  const selectedMember = members.find((m) => m.id === value);
  const displayName = selectedMember?.name || 'Não atribuído';

  if (loading) {
    return (
      <div className="animate-pulse h-9 bg-muted dark:bg-white/5 rounded-lg" />
    );
  }

  if (!canEdit) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted dark:bg-white/5 border border-border rounded-lg text-sm text-foreground dark:text-muted-foreground">
        <User size={14} className="text-muted-foreground" />
        <span>{displayName}</span>
      </div>
    );
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-muted dark:bg-black/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="">Selecione...</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name} ({m.role})
        </option>
      ))}
    </select>
  );
};
