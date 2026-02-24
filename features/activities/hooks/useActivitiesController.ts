import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { Activity } from '@/types';
import {
  useActivities,
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
} from '@/lib/query/hooks/useActivitiesQuery';
import { useDeals } from '@/lib/query/hooks/useDealsQuery';
import { useContacts } from '@/lib/query/hooks/useContactsQuery';
import { useRealtimeSync } from '@/lib/realtime/useRealtimeSync';
import type { DatePreset, SortOrder } from '../components/ActivitiesFilters';

/**
 * Hook React `useActivitiesController` que encapsula uma lógica reutilizável.
 * @returns {{ viewMode: "list" | "calendar"; setViewMode: Dispatch<SetStateAction<"list" | "calendar">>; searchTerm: string; setSearchTerm: Dispatch<SetStateAction<string>>; ... 18 more ...; handleSubmit: (e: FormEvent<...>) => void; }} Retorna um valor do tipo `{ viewMode: "list" | "calendar"; setViewMode: Dispatch<SetStateAction<"list" | "calendar">>; searchTerm: string; setSearchTerm: Dispatch<SetStateAction<string>>; ... 18 more ...; handleSubmit: (e: FormEvent<...>) => void; }`.
 */
export const useActivitiesController = () => {
  const searchParams = useSearchParams();

  // Auth for tenant organization_id
  const { profile, organizationId } = useAuth();

  // TanStack Query hooks
  const { data: activities = [], isLoading: activitiesLoading } = useActivities();
  const { data: deals = [], isLoading: dealsLoading } = useDeals();
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const createActivityMutation = useCreateActivity();
  const updateActivityMutation = useUpdateActivity();
  const deleteActivityMutation = useDeleteActivity();

  // Enable realtime sync
  useRealtimeSync('activities');

  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<Activity['type'] | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'overdue' | 'today' | 'upcoming'>('ALL');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Permite deep-link do Inbox: /activities?filter=overdue|today|upcoming
  useEffect(() => {
    const filter = (searchParams.get('filter') || '').toLowerCase();

    if (filter === 'overdue' || filter === 'today' || filter === 'upcoming') {
      setDateFilter(filter);
      setViewMode('list');
      return;
    }

    // Qualquer outro valor (inclui vazio) cai no padrão.
    setDateFilter('ALL');
  }, [searchParams]);

  const [formData, setFormData] = useState({
    title: '',
    type: 'CALL' as Activity['type'],
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    description: '',
    dealId: '',
  });

  const isLoading = activitiesLoading || dealsLoading || contactsLoading;

  // Performance: build lookups once (avoid `.find(...)` in handlers).
  const activitiesById = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);
  const dealsById = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);
  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  // Performance: compute date boundaries once per render (used inside memoized filters).
  const dateBoundaries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { todayTs: today.getTime(), tomorrowTs: tomorrow.getTime() };
  }, []);

  // Resolve datePreset em range (fromTs, toTs)
  const presetRange = useMemo(() => {
    const { todayTs, tomorrowTs } = dateBoundaries;

    switch (datePreset) {
      case 'today':
        return { fromTs: todayTs, toTs: tomorrowTs - 1 };
      case 'yesterday': {
        const yesterdayTs = todayTs - 86_400_000;
        return { fromTs: yesterdayTs, toTs: todayTs - 1 };
      }
      case 'last7': {
        const sevenDaysAgo = todayTs - 7 * 86_400_000;
        return { fromTs: sevenDaysAgo, toTs: tomorrowTs - 1 };
      }
      case 'last30': {
        const thirtyDaysAgo = todayTs - 30 * 86_400_000;
        return { fromTs: thirtyDaysAgo, toTs: tomorrowTs - 1 };
      }
      case 'custom': {
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : 0;
        const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : 0;
        return { fromTs: from, toTs: to };
      }
      default: // 'ALL'
        return { fromTs: 0, toTs: 0 };
    }
  }, [datePreset, dateBoundaries, dateFrom, dateTo]);

  const filteredActivities = useMemo(() => {
    const { todayTs, tomorrowTs } = dateBoundaries;
    const { fromTs, toTs } = presetRange;
    const q = searchTerm.toLowerCase();

    return activities
      .map((activity) => ({ activity, ts: Date.parse(activity.date) }))
      .filter(({ activity, ts }) => {
        const matchesSearch = (activity.title || '').toLowerCase().includes(q);
        const matchesType = filterType === 'ALL' || activity.type === filterType;
        const isPending = !activity.completed;

        // Deep-link filter (overdue/today/upcoming via URL)
        const matchesDateFilter =
          dateFilter === 'ALL'
            ? true
            : dateFilter === 'overdue'
              ? isPending && ts < todayTs
              : dateFilter === 'today'
                ? isPending && ts >= todayTs && ts < tomorrowTs
                : isPending && ts >= tomorrowTs;

        // Preset/custom date range
        const matchesDateRange =
          (!fromTs || ts >= fromTs) && (!toTs || ts <= toTs);

        return matchesSearch && matchesType && matchesDateFilter && matchesDateRange;
      })
      .sort((a, b) => sortOrder === 'newest' ? b.ts - a.ts : a.ts - b.ts)
      .map(({ activity }) => activity);
  }, [activities, dateBoundaries, presetRange, searchTerm, filterType, dateFilter, sortOrder]);

  const handleNewActivity = () => {
    setEditingActivity(null);
    setFormData({
      title: '',
      type: 'CALL',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      description: '',
      dealId: '',
    });
    setIsModalOpen(true);
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    const date = new Date(activity.date);
    setFormData({
      title: activity.title,
      type: activity.type,
      date: date.toISOString().split('T')[0],
      time: date.toTimeString().slice(0, 5),
      description: activity.description || '',
      dealId: activity.dealId,
    });
    setIsModalOpen(true);
  };

  const handleDeleteActivity = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta atividade?')) {
      deleteActivityMutation.mutate(id, {
        onSuccess: () => {
          showToast('Atividade excluída com sucesso', 'success');
        },
      });
    }
  };

  const handleToggleComplete = useCallback(
    (id: string) => {
      const activity = activitiesById.get(id);
      if (!activity) return;

      updateActivityMutation.mutate(
        {
          id,
          updates: { completed: !activity.completed },
        },
        {
          onSuccess: () => {
            showToast(activity.completed ? 'Atividade reaberta' : 'Atividade concluída', 'success');
          },
        }
      );
    },
    [activitiesById, showToast, updateActivityMutation]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const date = new Date(`${formData.date}T${formData.time}`);
    const selectedDeal = formData.dealId ? dealsById.get(formData.dealId) : undefined;
    const selectedContact = selectedDeal?.contactId ? contactsById.get(selectedDeal.contactId) : undefined;
    const participantContactIds = selectedContact?.id ? [selectedContact.id] : [];

    if (editingActivity) {
      updateActivityMutation.mutate(
        {
          id: editingActivity.id,
          updates: {
            title: formData.title,
            type: formData.type,
            description: formData.description,
            date: date.toISOString(),
            dealId: formData.dealId || '',
            contactId: selectedContact?.id || '',
            participantContactIds,
          },
        },
        {
          onSuccess: () => {
            showToast('Atividade atualizada com sucesso', 'success');
            setIsModalOpen(false);
          },
        }
      );
    } else {
      createActivityMutation.mutate(
        {
          activity: {
            title: formData.title,
            type: formData.type,
            description: formData.description,
            date: date.toISOString(),
            dealId: formData.dealId || '',
            contactId: selectedContact?.id || '',
            participantContactIds,
            dealTitle: selectedDeal?.title || '',
            completed: false,
            user: { name: 'Eu', avatar: '' },
          },
        },
        {
          onSuccess: () => {
            showToast('Atividade criada com sucesso', 'success');
            setIsModalOpen(false);
          },
          onError: (error: Error) => {
            showToast(`Erro ao criar atividade: ${error.message}`, 'error');
          },
        }
      );
    }
  };

  return {
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    dateFilter,
    setDateFilter,
    datePreset,
    setDatePreset,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortOrder,
    setSortOrder,
    currentDate,
    setCurrentDate,
    isModalOpen,
    setIsModalOpen,
    editingActivity,
    formData,
    setFormData,
    filteredActivities,
    deals,
    contacts,
    isLoading,
    handleNewActivity,
    handleEditActivity,
    handleDeleteActivity,
    handleToggleComplete,
    handleSubmit,
  };
};
