import { useState, useCallback } from 'react';
import { LifecycleStage, Contact } from '@/types';
import { lifecycleStagesService } from '@/lib/supabase';

const DEFAULT_LIFECYCLE_STAGES: LifecycleStage[] = [
  { id: 'LEAD', name: 'Lead', color: 'bg-blue-500', order: 0, isDefault: true },
  { id: 'MQL', name: 'MQL', color: 'bg-yellow-500', order: 1, isDefault: true },
  { id: 'PROSPECT', name: 'Oportunidade', color: 'bg-purple-500', order: 2, isDefault: true },
  { id: 'CUSTOMER', name: 'Cliente', color: 'bg-green-500', order: 3, isDefault: true },
  { id: 'OTHER', name: 'Outros / Perdidos', color: 'bg-accent', order: 4, isDefault: true },
];

export function useLifecycleStages(setError: (msg: string) => void) {
  const [lifecycleStages, setLifecycleStages] = useState<LifecycleStage[]>(DEFAULT_LIFECYCLE_STAGES);

  const addLifecycleStage = useCallback(
    async (stage: Omit<LifecycleStage, 'id' | 'order'>): Promise<LifecycleStage | null> => {
      const newStage: Omit<LifecycleStage, 'id'> = {
        ...stage,
        order: lifecycleStages.length,
        isDefault: false,
      };

      const { data, error: addError } = await lifecycleStagesService.create(newStage);

      if (addError) {
        setError(addError.message);
        return null;
      }

      if (data) {
        setLifecycleStages(prev => [...prev, data]);
      }

      return data;
    },
    [lifecycleStages.length, setError]
  );

  const updateLifecycleStage = useCallback(
    async (id: string, updates: Partial<LifecycleStage>) => {
      const { error: updateError } = await lifecycleStagesService.update(id, updates);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setLifecycleStages(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
    },
    [setError]
  );

  const deleteLifecycleStage = useCallback(async (id: string, contacts: Contact[] = []) => {
    const stageToDelete = lifecycleStages.find(s => s.id === id);
    if (stageToDelete?.isDefault) return;

    const hasLinkedContacts = contacts.some(c => c.stage === id);
    if (hasLinkedContacts) {
      setError('Nao e possivel excluir estagio com contatos vinculados');
      return;
    }

    const { error: deleteError } = await lifecycleStagesService.delete(id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setLifecycleStages(prev => prev.filter(s => s.id !== id));
  }, [lifecycleStages, setError]);

  const reorderLifecycleStages = useCallback(async (newOrder: LifecycleStage[]) => {
    const reordered = newOrder.map((s, index) => ({ ...s, order: index }));
    setLifecycleStages(reordered);

    for (const stage of reordered) {
      await lifecycleStagesService.update(stage.id, { order: stage.order });
    }
  }, []);

  const loadLifecycleStages = useCallback(async () => {
    const { data: stages } = await lifecycleStagesService.getAll();
    if (stages && stages.length > 0) {
      setLifecycleStages(stages);
    }
  }, []);

  return {
    lifecycleStages,
    addLifecycleStage,
    updateLifecycleStage,
    deleteLifecycleStage,
    reorderLifecycleStages,
    loadLifecycleStages,
  };
}
