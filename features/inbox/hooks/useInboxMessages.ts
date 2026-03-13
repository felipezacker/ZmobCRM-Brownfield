import { useMemo } from 'react';
import { Activity, Contact, DealView } from '@/types';
import {
  useActivities,
} from '@/lib/query/hooks/useActivitiesQuery';
import { useContacts } from '@/lib/query/hooks/useContactsQuery';
import {
  useDealsView,
} from '@/lib/query/hooks/useDealsQuery';
import { useDefaultBoard } from '@/lib/query/hooks/useBoardsQuery';

// Re-exported types for backward compatibility
export type AISuggestionType = 'UPSELL' | 'RESCUE' | 'STALLED';

export interface AISuggestion {
  id: string;
  type: AISuggestionType;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  data: {
    deal?: DealView;
    contact?: Contact;
  };
  createdAt: string;
}

export type ViewMode = 'overview' | 'list' | 'focus';

export interface FocusItem {
  id: string;
  type: 'activity' | 'suggestion';
  priority: number;
  data: Activity | AISuggestion;
}

/**
 * Sub-hook: data fetching, realtime sync, date references,
 * activity buckets, and computed entity lists.
 */
export const useInboxMessages = () => {
  // TanStack Query hooks
  const { data: activities = [], isLoading: activitiesLoading } = useActivities();
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: deals = [], isLoading: dealsLoading } = useDealsView();
  const { data: defaultBoard } = useDefaultBoard();

  const isLoading = activitiesLoading || contactsLoading || dealsLoading;

  // --- Date references ---
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const tomorrow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }, [today]);

  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  // --- Activity buckets (single pass) ---
  const activityBuckets = useMemo(() => {
    const overdue: Array<{ a: Activity; ts: number }> = [];
    const todayList: Array<{ a: Activity; ts: number }> = [];
    const upcoming: Array<{ a: Activity; ts: number }> = [];

    const todayTs = today.getTime();
    const tomorrowTs = tomorrow.getTime();

    for (const a of activities) {
      if (a.completed) continue;
      const ts = Date.parse(a.date);
      if (ts < todayTs) overdue.push({ a, ts });
      else if (ts < tomorrowTs) todayList.push({ a, ts });
      else upcoming.push({ a, ts });
    }

    overdue.sort((x, y) => x.ts - y.ts);
    todayList.sort((x, y) => x.ts - y.ts);
    upcoming.sort((x, y) => x.ts - y.ts);

    return {
      overdue: overdue.map(x => x.a),
      today: todayList.map(x => x.a),
      upcoming: upcoming.map(x => x.a),
    };
  }, [activities, today, tomorrow]);

  const overdueActivities = activityBuckets.overdue;
  const todayActivities = activityBuckets.today;
  const upcomingActivities = activityBuckets.upcoming;

  // Meetings vs Tasks split
  const todayMeetings = useMemo(
    () => todayActivities.filter(a => a.type === 'CALL' || a.type === 'MEETING'),
    [todayActivities]
  );

  const todayTasks = useMemo(
    () => todayActivities.filter(a => a.type !== 'CALL' && a.type !== 'MEETING'),
    [todayActivities]
  );

  // --- Computed entity lists ---
  const currentMonth = new Date().getMonth() + 1;

  const birthdaysThisMonth = useMemo(
    () =>
      contacts.filter(c => {
        if (!c.birthDate) return false;
        const birthMonth = parseInt(c.birthDate.split('-')[1]);
        return birthMonth === currentMonth;
      }),
    [contacts, currentMonth]
  );

  const stalledDeals = useMemo(
    () =>
      deals.filter(d => {
        const isClosed = d.isWon || d.isLost;
        const lastUpdateTs = Date.parse(d.updatedAt);
        return !isClosed && lastUpdateTs < sevenDaysAgo.getTime();
      }),
    [deals, sevenDaysAgo]
  );

  const upsellDeals = useMemo(
    () =>
      deals.filter(d => {
        const isWon = d.isWon;
        const lastUpdateTs = Date.parse(d.updatedAt);
        return isWon && lastUpdateTs < thirtyDaysAgo.getTime();
      }),
    [deals, thirtyDaysAgo]
  );

  const rescueContacts = useMemo(
    () =>
      contacts.filter(c => {
        if (c.status !== 'ACTIVE' || c.stage !== 'CUSTOMER') return false;
        const createdAtTs = Date.parse(c.createdAt);
        if (!c.lastInteraction && !c.lastPurchaseDate) {
          return createdAtTs < thirtyDaysAgo.getTime();
        }
        const lastInteractionTs = c.lastInteraction ? Date.parse(c.lastInteraction) : null;
        const lastPurchaseTs = c.lastPurchaseDate ? Date.parse(c.lastPurchaseDate) : null;
        const lastActivityTs =
          lastInteractionTs != null && lastPurchaseTs != null
            ? Math.max(lastInteractionTs, lastPurchaseTs)
            : lastInteractionTs ?? lastPurchaseTs;
        return lastActivityTs !== null && lastActivityTs < thirtyDaysAgo.getTime();
      }),
    [contacts, thirtyDaysAgo]
  );

  return {
    activities,
    contacts,
    deals,
    defaultBoard,
    isLoading,
    overdueActivities,
    todayActivities,
    upcomingActivities,
    todayMeetings,
    todayTasks,
    birthdaysThisMonth,
    stalledDeals,
    upsellDeals,
    rescueContacts,
  };
};
