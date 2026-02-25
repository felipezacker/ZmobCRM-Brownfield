import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
import type { DatePreset, RecurrenceType, SortOrder } from '@/features/activities/types';

export const useActivitiesController = () => {
  const searchParams = useSearchParams();

  useAuth(); // ensures auth context is active

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

  const [activeTab, setActiveTab] = useState<'activities' | 'history'>('activities');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<Activity['type'] | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'completed' | 'overdue'>('ALL');
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
    recurrenceType: 'none' as 'none' | RecurrenceType,
    recurrenceEndDate: '',
  });

  const isLoading = activitiesLoading || dealsLoading || contactsLoading;

  // Performance: build lookups once (avoid `.find(...)` in handlers).
  const activitiesById = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);
  const dealsById = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);
  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  // Tab counts (unfiltered) for badge display
  const tabCounts = useMemo(() => {
    let activitiesCount = 0;
    let historyCount = 0;
    for (const a of activities) {
      if (a.type === 'STATUS_CHANGE') historyCount++;
      else activitiesCount++;
    }
    return { activities: activitiesCount, history: historyCount };
  }, [activities]);

  // Performance: compute date boundaries once per render (used inside memoized filters).
  const dateBoundaries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { todayTs: today.getTime(), tomorrowTs: tomorrow.getTime() };
  }, []);

  // Overdue count: pending activities with date < start of today
  const overdueCount = useMemo(() => {
    const { todayTs } = dateBoundaries;
    let count = 0;
    for (const a of activities) {
      if (a.type === 'STATUS_CHANGE') continue;
      if (!a.completed && Date.parse(a.date) < todayTs) count++;
    }
    return count;
  }, [activities, dateBoundaries]);

  // Resolve datePreset em range (fromTs, toTs)
  const presetRange = useMemo(() => {
    const { todayTs, tomorrowTs } = dateBoundaries;

    switch (datePreset) {
      case 'overdue':
        return { fromTs: 0, toTs: todayTs - 1 };
      case 'today':
        return { fromTs: todayTs, toTs: tomorrowTs - 1 };
      case 'tomorrow': {
        const dayAfterTomorrow = tomorrowTs + 86_400_000;
        return { fromTs: tomorrowTs, toTs: dayAfterTomorrow - 1 };
      }
      case 'thisWeek': {
        const dayOfWeek = new Date(todayTs).getDay(); // 0=dom
        const weekStart = todayTs - dayOfWeek * 86_400_000;
        const weekEnd = weekStart + 7 * 86_400_000 - 1;
        return { fromTs: weekStart, toTs: weekEnd };
      }
      case 'thisMonth': {
        const d = new Date(todayTs);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
        return { fromTs: monthStart, toTs: monthEnd };
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
        // Separacao por aba
        const isStatusChange = activity.type === 'STATUS_CHANGE';
        if (activeTab === 'activities' && isStatusChange) return false;
        if (activeTab === 'history' && !isStatusChange) return false;

        const matchesSearch = (activity.title || '').toLowerCase().includes(q);
        const matchesType = activeTab === 'history' || filterType === 'ALL' || activity.type === filterType;
        // Skip status filter on history tab — STATUS_CHANGE items have no completed state
        const matchesStatus = isStatusChange || statusFilter === 'ALL'
          ? true
          : statusFilter === 'pending'
            ? !activity.completed
            : statusFilter === 'completed'
              ? activity.completed
              : /* overdue */ !activity.completed && ts < dateBoundaries.todayTs;
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

        return matchesSearch && matchesType && matchesStatus && matchesDateFilter && matchesDateRange;
      })
      .sort((a, b) => sortOrder === 'newest' ? b.ts - a.ts : a.ts - b.ts)
      .map(({ activity }) => activity);
  }, [activities, dateBoundaries, presetRange, searchTerm, filterType, statusFilter, dateFilter, sortOrder, activeTab]);

  const handleNewActivity = () => {
    setEditingActivity(null);
    setFormData({
      title: '',
      type: 'CALL',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      description: '',
      dealId: '',
      recurrenceType: 'none',
      recurrenceEndDate: '',
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
      recurrenceType: activity.recurrenceType || 'none',
      recurrenceEndDate: activity.recurrenceEndDate || '',
    });
    setIsModalOpen(true);
  };

  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

  const handleDeleteActivity = (id: string) => {
    setDeletingActivityId(id);
  };

  const confirmDeleteActivity = () => {
    if (!deletingActivityId) return;
    deleteActivityMutation.mutate(deletingActivityId, {
      onSuccess: () => {
        showToast('Atividade excluída com sucesso', 'success');
        setDeletingActivityId(null);
      },
      onError: (error: Error) => {
        showToast(`Erro ao excluir atividade: ${error.message}`, 'error');
      },
    });
  };

  const cancelDeleteActivity = () => {
    setDeletingActivityId(null);
  };

  const calculateNextDate = useCallback((dateStr: string, type: RecurrenceType): string => {
    const d = new Date(dateStr);
    switch (type) {
      case 'daily':
        d.setDate(d.getDate() + 1);
        break;
      case 'weekly':
        d.setDate(d.getDate() + 7);
        break;
      case 'monthly': {
        const dayOfMonth = d.getDate();
        d.setMonth(d.getMonth() + 1);
        // Clamp para ultimo dia do mes (ex: 31 jan → 28 fev)
        if (d.getDate() !== dayOfMonth) d.setDate(0);
        break;
      }
    }
    return d.toISOString();
  }, []);

  const handleToggleComplete = useCallback(
    (id: string) => {
      const activity = activitiesById.get(id);
      if (!activity) return;

      // Se esta reabrindo (uncomplete), nao faz logica de recorrencia
      if (activity.completed) {
        updateActivityMutation.mutate(
          { id, updates: { completed: false } },
          { onSuccess: () => showToast('Atividade reaberta', 'success') }
        );
        return;
      }

      // Completar atividade
      updateActivityMutation.mutate(
        { id, updates: { completed: true } },
        {
          onSuccess: () => {
            // Se e recorrente, criar proxima ocorrencia
            if (activity.recurrenceType) {
              const nextDateStr = calculateNextDate(activity.date, activity.recurrenceType);
              const nextDate = new Date(nextDateStr);

              // Checar data limite
              if (activity.recurrenceEndDate && nextDate > new Date(activity.recurrenceEndDate + 'T23:59:59')) {
                showToast('Última ocorrência concluída (data limite atingida)', 'success');
                return;
              }

              // Criar proxima atividade
              const selectedDeal = activity.dealId ? dealsById.get(activity.dealId) : undefined;
              createActivityMutation.mutate(
                {
                  activity: {
                    title: activity.title,
                    type: activity.type,
                    description: activity.description,
                    date: nextDateStr,
                    dealId: activity.dealId,
                    contactId: activity.contactId,
                    participantContactIds: activity.participantContactIds,
                    dealTitle: selectedDeal?.title || activity.dealTitle || '',
                    completed: false,
                    user: { name: 'Eu', avatar: '' },
                    recurrenceType: activity.recurrenceType,
                    recurrenceEndDate: activity.recurrenceEndDate,
                  },
                },
                {
                  onSuccess: () => showToast('Atividade concluída — próxima criada', 'success'),
                  onError: () => {
                    // Rollback: reabrir a atividade se a criacao da proxima falhou
                    updateActivityMutation.mutate({ id, updates: { completed: false } });
                    showToast('Erro ao criar próxima ocorrência — atividade reaberta', 'error');
                  },
                }
              );
            } else {
              showToast('Atividade concluída', 'success');
            }
          },
        }
      );
    },
    [activitiesById, showToast, updateActivityMutation, createActivityMutation, calculateNextDate, dealsById]
  );

  const handleSnoozeActivity = useCallback(
    (id: string) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      updateActivityMutation.mutate(
        { id, updates: { date: tomorrow.toISOString(), completed: false } },
        {
          onSuccess: () => showToast('Atividade adiada para amanhã', 'success'),
          onError: (error: Error) => showToast(`Erro ao adiar atividade: ${error.message}`, 'error'),
        }
      );
    },
    [updateActivityMutation, showToast]
  );

  const handleBulkComplete = useCallback(
    async (ids: string[]): Promise<{ succeeded: number; failed: number }> => {
      let succeeded = 0;
      const failed = 0;
      for (const id of ids) {
        const activity = activitiesById.get(id);
        if (!activity || activity.completed) continue;
        // Delega para handleToggleComplete que cuida da recorrencia
        handleToggleComplete(id);
        succeeded++;
      }
      return { succeeded, failed };
    },
    [activitiesById, handleToggleComplete]
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]): Promise<{ succeeded: number; failed: number }> => {
      let succeeded = 0;
      let failed = 0;
      const promises = ids.map((id) =>
        new Promise<void>((resolve) => {
          deleteActivityMutation.mutate(id, {
            onSuccess: () => { succeeded++; resolve(); },
            onError: () => { failed++; resolve(); },
          });
        })
      );
      await Promise.all(promises);
      return { succeeded, failed };
    },
    [deleteActivityMutation]
  );

  const handleDuplicateActivity = (activity: Activity) => {
    if (activity.type === 'STATUS_CHANGE') return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setEditingActivity(null);
    setFormData({
      title: activity.title,
      type: activity.type,
      date: tomorrow.toISOString().split('T')[0],
      time: new Date(activity.date).toTimeString().slice(0, 5),
      description: activity.description || '',
      dealId: activity.dealId,
      recurrenceType: activity.recurrenceType || 'none',
      recurrenceEndDate: activity.recurrenceEndDate || '',
    });
    setIsModalOpen(true);
  };

  const handleCreateFromProjected = (activity: Activity) => {
    const date = new Date(activity.date);
    setEditingActivity(null);
    setFormData({
      title: activity.title,
      type: activity.type,
      date: date.toISOString().split('T')[0],
      time: date.toTimeString().slice(0, 5),
      description: activity.description || '',
      dealId: activity.dealId,
      recurrenceType: activity.recurrenceType || 'none',
      recurrenceEndDate: activity.recurrenceEndDate || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const date = new Date(`${formData.date}T${formData.time}`);
    const selectedDeal = formData.dealId ? dealsById.get(formData.dealId) : undefined;
    const selectedContact = selectedDeal?.contactId ? contactsById.get(selectedDeal.contactId) : undefined;
    const participantContactIds = selectedContact?.id ? [selectedContact.id] : [];

    const recurrenceType = formData.recurrenceType === 'none' ? null : formData.recurrenceType;
    const recurrenceEndDate = formData.recurrenceEndDate || null;

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
            recurrenceType,
            recurrenceEndDate,
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
            recurrenceType,
            recurrenceEndDate,
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
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    statusFilter,
    setStatusFilter,
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
    tabCounts,
    overdueCount,
    deletingActivityId,
    handleNewActivity,
    handleEditActivity,
    handleDeleteActivity,
    confirmDeleteActivity,
    cancelDeleteActivity,
    handleToggleComplete,
    handleSnoozeActivity,
    handleDuplicateActivity,
    handleBulkComplete,
    handleBulkDelete,
    handleCreateFromProjected,
    handleSubmit,
  };
};
