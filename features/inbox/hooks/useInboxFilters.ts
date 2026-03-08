import { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, Contact, DealView } from '@/types';
import { useHiddenSuggestionIds, useRecordSuggestionInteraction } from '@/lib/query/hooks/useAISuggestionsQuery';
import type { AISuggestion, FocusItem } from './useInboxMessages';

interface UseInboxFiltersParams {
  overdueActivities: Activity[];
  todayActivities: Activity[];
  todayMeetings: Activity[];
  todayTasks: Activity[];
  stalledDeals: DealView[];
  upsellDeals: DealView[];
  rescueContacts: Contact[];
  birthdaysThisMonth: Contact[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const daysSince = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / MS_PER_DAY);

/** Sub-hook: AI suggestions, focus queue, stats, briefing, hidden suggestions. */
export const useInboxFilters = (p: UseInboxFiltersParams) => {
  const [focusIndex, setFocusIndex] = useState(0);
  const { data: hiddenSuggestionIds = new Set<string>() } = useHiddenSuggestionIds();
  const recordInteraction = useRecordSuggestionInteraction();
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);

  const calculateDealScore = useCallback((deal: DealView, type: 'STALLED' | 'UPSELL'): number => {
    const valueScore = Math.log10(Math.max(deal.value || 1, 1)) * 10;
    const prob = deal.probability || 50;
    const probFactor = type === 'STALLED' ? prob / 100 : (100 - prob) / 100;
    const timeFactor = Math.min(daysSince(deal.updatedAt) / 30, 2);
    return valueScore * probFactor * (1 + timeFactor);
  }, []);

  const aiSuggestions = useMemo((): AISuggestion[] => {
    const out: AISuggestion[] = [];
    const now = new Date().toISOString();

    p.stalledDeals
      .map(d => ({ d, s: calculateDealScore(d, 'STALLED') }))
      .sort((a, b) => b.s - a.s)
      .forEach(({ d, s }) => {
        const id = `stalled-${d.id}`;
        if (hiddenSuggestionIds.has(id)) return;
        const days = daysSince(d.updatedAt);
        out.push({ id, type: 'STALLED', title: `Negocio Parado (${days}d)`,
          description: `${d.title} - R$ ${d.value.toLocaleString('pt-BR')} \u2022 ${d.probability}% probabilidade`,
          priority: s > 30 ? 'high' : s > 15 ? 'medium' : 'low', data: { deal: d }, createdAt: now });
      });

    p.upsellDeals
      .map(d => ({ d, s: calculateDealScore(d, 'UPSELL') }))
      .sort((a, b) => b.s - a.s)
      .forEach(({ d, s }) => {
        const id = `upsell-${d.id}`;
        if (hiddenSuggestionIds.has(id)) return;
        const days = daysSince(d.updatedAt);
        out.push({ id, type: 'UPSELL', title: 'Oportunidade de Upsell',
          description: `Fechou ha ${days} dias \u2022 R$ ${d.value.toLocaleString('pt-BR')}`,
          priority: s > 25 ? 'high' : s > 10 ? 'medium' : 'low', data: { deal: d }, createdAt: now });
      });

    p.rescueContacts.forEach(c => {
      const id = `rescue-${c.id}`;
      if (hiddenSuggestionIds.has(id)) return;
      const last = c.lastInteraction || c.lastPurchaseDate;
      const days = last ? daysSince(last) : null;
      out.push({ id, type: 'RESCUE', title: 'Risco de Churn',
        description: days ? `${c.name} nao interage ha ${days} dias` : `${c.name} nunca interagiu - reative!`,
        priority: days && days > 60 ? 'high' : 'medium', data: { contact: c }, createdAt: now });
    });

    const pri = { high: 0, medium: 1, low: 2 } as const;
    return out.sort((a, b) => pri[a.priority] - pri[b.priority]);
  }, [p.upsellDeals, p.stalledDeals, p.rescueContacts, hiddenSuggestionIds, calculateDealScore]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (briefing) return;
      const hasData = p.birthdaysThisMonth.length + p.stalledDeals.length + p.overdueActivities.length + p.upsellDeals.length > 0;
      if (!hasData) { setBriefing('Sua inbox esta limpa! Nenhuma pendencia no momento. \ud83c\udf89'); return; }
      setIsGeneratingBriefing(true);
      try {
        const { generateDailyBriefing } = await import('@/lib/ai/tasksClient');
        const text = await generateDailyBriefing({
          birthdays: p.birthdaysThisMonth.map(c => ({ name: c.name, birthDate: c.birthDate })),
          stalledDeals: p.stalledDeals.length, overdueActivities: p.overdueActivities.length, upsellDeals: p.upsellDeals.length,
        });
        if (alive) setBriefing(text || 'Nenhuma pendencia critica. Bom trabalho!');
      } catch {
        if (alive) setBriefing(`Voce tem ${p.overdueActivities.length} atividades atrasadas, ${p.stalledDeals.length} negocios parados e ${p.upsellDeals.length} oportunidades de upsell.`);
      } finally { if (alive) setIsGeneratingBriefing(false); }
    })();
    return () => { alive = false; };
  }, [p.birthdaysThisMonth.length, p.stalledDeals.length, p.overdueActivities.length, p.upsellDeals.length]);

  const stats = useMemo(() => {
    const oc = p.overdueActivities.length, tc = p.todayActivities.length, sc = aiSuggestions.length;
    return { overdueCount: oc, todayCount: tc, suggestionsCount: sc, totalPending: oc + tc + sc };
  }, [p.overdueActivities, p.todayActivities, aiSuggestions]);

  const isInboxZero = stats.totalPending === 0;

  const focusQueue = useMemo((): FocusItem[] => {
    const items: FocusItem[] = [];
    p.overdueActivities.forEach((a, i) => items.push({ id: a.id, type: 'activity', priority: i, data: a }));
    aiSuggestions.filter(s => s.priority === 'high').forEach((s, i) => items.push({ id: s.id, type: 'suggestion', priority: 100 + i, data: s }));
    p.todayMeetings.forEach((a, i) => items.push({ id: a.id, type: 'activity', priority: 200 + i, data: a }));
    p.todayTasks.forEach((a, i) => items.push({ id: a.id, type: 'activity', priority: 300 + i, data: a }));
    aiSuggestions.filter(s => s.priority !== 'high').forEach((s, i) => items.push({ id: s.id, type: 'suggestion', priority: 400 + i, data: s }));
    return items.sort((a, b) => a.priority - b.priority);
  }, [p.overdueActivities, p.todayMeetings, p.todayTasks, aiSuggestions]);

  const currentFocusItem = focusQueue[focusIndex] || null;

  const handleFocusNext = useCallback(() => {
    if (focusIndex < focusQueue.length - 1) setFocusIndex(i => i + 1);
  }, [focusIndex, focusQueue.length]);

  const handleFocusPrev = useCallback(() => {
    if (focusIndex > 0) setFocusIndex(i => i - 1);
  }, [focusIndex]);

  useEffect(() => {
    if (focusIndex >= focusQueue.length) setFocusIndex(Math.max(0, focusQueue.length - 1));
  }, [focusQueue.length, focusIndex]);

  return {
    aiSuggestions, focusQueue, focusIndex, setFocusIndex, currentFocusItem,
    handleFocusNext, handleFocusPrev, stats, isInboxZero,
    briefing, isGeneratingBriefing, hiddenSuggestionIds, recordInteraction,
  };
};
