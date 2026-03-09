import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ContactSortableColumn } from '@/types';
import { supabase } from '@/lib/supabase/client';

export const useContactFilters = () => {
  const searchParams = useSearchParams();

  // Sorting state
  const [sortBy, setSortBy] = useState<ContactSortableColumn>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Advanced filter state
  const [classificationFilter, setClassificationFilter] = useState<string[]>(() => {
    const param = searchParams?.get('classification');
    return param ? param.split(',').filter(Boolean) : [];
  });
  const [temperatureFilter, setTemperatureFilter] = useState<string>(() => {
    return searchParams?.get('temperature') || 'ALL';
  });
  const [contactTypeFilter, setContactTypeFilter] = useState<string>(() => {
    return searchParams?.get('contactType') || 'ALL';
  });
  const [ownerFilter, setOwnerFilter] = useState<string>(() => {
    return searchParams?.get('ownerId') || '';
  });
  const [sourceFilter, setSourceFilter] = useState<string>(() => {
    return searchParams?.get('source') || 'ALL';
  });

  // View/UI state
  const [viewMode, setViewMode] = useState<'people' | 'companies'>('people');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const set = (key: string, val: string, defaultVal: string) => {
      if (val && val !== defaultVal) params.set(key, val);
      else params.delete(key);
    };
    set('temperature', temperatureFilter, 'ALL');
    set('contactType', contactTypeFilter, 'ALL');
    set('ownerId', ownerFilter, '');
    set('source', sourceFilter, 'ALL');
    if (classificationFilter.length > 0) params.set('classification', classificationFilter.join(','));
    else params.delete('classification');

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [classificationFilter, temperatureFilter, contactTypeFilter, ownerFilter, sourceFilter]);

  // Fetch org profiles for owner filter/column
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      return (data || []).map(p => ({
        id: p.id,
        name: p.full_name || 'Sem nome',
        avatar: p.avatar_url || undefined,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    sortBy, setSortBy, sortOrder, setSortOrder,
    classificationFilter, setClassificationFilter,
    temperatureFilter, setTemperatureFilter,
    contactTypeFilter, setContactTypeFilter,
    ownerFilter, setOwnerFilter,
    sourceFilter, setSourceFilter,
    profiles,
    viewMode, setViewMode,
    isFilterOpen, setIsFilterOpen,
  };
};
