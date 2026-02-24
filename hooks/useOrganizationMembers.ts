import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'diretor' | 'corretor';
  avatar_url: string | null;
}

export function useOrganizationMembers() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const { data: members = [], isLoading: loading } = useQuery({
    queryKey: ['organization-members', orgId],
    queryFn: async () => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, avatar_url')
        .eq('organization_id', orgId!)
        .order('first_name');

      if (error || !data) return [];

      return data.map((d): OrgMember => ({
        id: d.id,
        name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email?.split('@')[0] || 'Sem nome',
        email: d.email || '',
        role: d.role as OrgMember['role'],
        avatar_url: d.avatar_url || null,
      }));
    },
    enabled: !!orgId && !!supabase,
    staleTime: 5 * 60 * 1000, // 5 min — members don't change often
  });

  return { members, loading };
}
