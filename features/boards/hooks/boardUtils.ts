import { DealView } from '@/types';

export const isDealRotting = (deal: DealView) => {
  const dateToCheck = deal.lastStageChangeDate || deal.updatedAt;
  const diff = new Date().getTime() - new Date(dateToCheck).getTime();
  const days = diff / (1000 * 3600 * 24);
  return days > 10;
};

export const getActivityStatus = (deal: DealView): 'yellow' | 'red' | 'green' | 'gray' => {
  if (!deal.nextActivity) return 'yellow';
  if (deal.nextActivity.isOverdue) return 'red';
  const activityDate = new Date(deal.nextActivity.date);
  const today = new Date();
  if (activityDate.toDateString() === today.toDateString()) return 'green';
  return 'gray';
};

export const formatRelativeActivityDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 3600 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays < 0) return `Atrasada ${Math.abs(diffDays)}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const formatStageAge = (lastStageChangeDate: string | null | undefined): string | null => {
  if (!lastStageChangeDate) return null;
  const date = new Date(lastStageChangeDate);
  if (isNaN(date.getTime())) return null;
  const diff = new Date().getTime() - date.getTime();
  const days = Math.max(0, Math.floor(diff / (1000 * 3600 * 24)));
  return `ha ${days}d`;
};
