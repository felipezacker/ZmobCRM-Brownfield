'use client';

import React, { useState } from 'react';
import {
  Activity as ActivityIcon,
  BadgeCheck,
  CalendarClock,
  Check,
  Copy,
  FileText,
  Filter,
  HeartPulse,
  Inbox,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
  StickyNote,
  X,
} from 'lucide-react';

import { normalizePhoneE164 } from '@/lib/phone';
import { Button } from '@/components/ui/button';
import { UIChat } from '@/components/ai/UIChat';
import { CallModal } from '@/features/inbox/components/CallModal';
import { MessageComposerModal } from '@/features/inbox/components/MessageComposerModal';
import { ScheduleModal } from '@/features/inbox/components/ScheduleModal';

import type { Tab, TimelineItem } from './types';
import { buildExecutionHeader, buildSuggestedEmailBody, buildSuggestedWhatsAppMessage, formatAtISO, formatCurrencyBRL, scriptCategoryChipClass, toneToBg, uid } from './utils';
import { Chip, Panel, TabButton } from './components/CockpitPanels';
import { TemplatePickerModal } from './components/TemplatePickerModal';
import { useCockpitDealState } from './hooks/useCockpitDealState';
import { useCockpitSnapshot } from './hooks/useCockpitSnapshot';
import { useCockpitActions } from './hooks/useCockpitActions';

/**
 * Componente React `DealCockpitRealClient`.
 */
export default function DealCockpitRealClient({ dealId }: { dealId?: string }) {
  // --- Deal state (data, AI, notes, files, scripts, timeline) ---
  const ds = useCockpitDealState(dealId);

  // --- Snapshot for AI chat ---
  const cockpitSnapshot = useCockpitSnapshot({
    selectedDeal: ds.selectedDeal,
    selectedContact: ds.selectedContact,
    selectedBoard: ds.selectedBoard,
    activeStage: ds.activeStage,
    dealActivities: ds.dealActivities,
    notes: ds.notes,
    files: ds.files,
    scripts: ds.scripts,
    nextBestAction: ds.nextBestAction,
    aiAnalysis: ds.aiAnalysis,
    aiLoading: ds.aiLoading,
    isNotesLoading: ds.isNotesLoading,
    isFilesLoading: ds.isFilesLoading,
    isScriptsLoading: ds.isScriptsLoading,
  });

  // --- Actions (callbacks, modals, toast, checklist) ---
  const actions = useCockpitActions({
    selectedDeal: ds.selectedDeal,
    selectedContact: ds.selectedContact,
    selectedBoard: ds.selectedBoard,
    actor: ds.actor,
    nextBestAction: ds.nextBestAction,
    templateVariables: ds.templateVariables,
    applyVariables: ds.applyVariables,
    moveDeal: ds.moveDeal,
    addActivity: ds.addActivity,
    updateDeal: ds.updateDeal,
  });

  // --- UI-only state ---
  const [tab, setTab] = useState<Tab>('chat');
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | TimelineItem['kind']>('all');
  const [showSystemEvents, setShowSystemEvents] = useState(false);

  // --- Guard: no deal ---
  if (!ds.selectedDeal || !ds.selectedBoard) {
    return (
      <div className="h-dvh bg-background text-muted-foreground flex items-center justify-center p-8">
        <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-white/3 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold">Cockpit (real)</div>
            <div className="text-xs text-muted-foreground">/labs/deal-cockpit-mock</div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            N\u00e3o encontrei nenhum deal carregado no contexto.
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Dica: abra o app normal (Boards) para carregar dados. Quando houver deals carregados, voc\u00ea consegue trocar aqui mesmo pelo seletor no topo.
          </div>
        </div>
      </div>
    );
  }

  const deal = ds.selectedDeal;
  const board = ds.selectedBoard;
  const contact = ds.selectedContact;
  const companyName = 'Contato';
  const phoneE164 = normalizePhoneE164(contact?.phone);

  return (
    <div className="h-dvh overflow-hidden bg-background text-muted-foreground">
      {actions.toast ? (
        <div className="fixed right-6 top-6 z-50">
          <div
            className={actions.toast.tone === 'success'
              ? 'flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-xl shadow-black/30'
              : actions.toast.tone === 'danger'
                ? 'flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/15 px-4 py-3 text-sm text-rose-100 shadow-xl shadow-black/30'
                : 'flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-muted-foreground shadow-xl shadow-black/30'
            }
            role="status"
            aria-live="polite"
          >
            {actions.toast.tone === 'success' ? <Check className="h-4 w-4" /> : actions.toast.tone === 'danger' ? <X className="h-4 w-4" /> : null}
            <div className="min-w-0 truncate">{actions.toast.message}</div>
          </div>
        </div>
      ) : null}

      {/* Top pipeline bar */}
      <div className="sticky top-0 z-40 h-16 border-b border-white/5 bg-black/40 backdrop-blur">
        <div className="flex h-16 w-full items-center px-6 2xl:px-10">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <select
                  className="max-w-90 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-muted-foreground outline-none hover:bg-white/8 focus:ring-2 focus:ring-cyan-400/30"
                  value={deal.id}
                  onChange={(e) => actions.setDealInUrl(e.target.value)}
                  aria-label="Selecionar deal"
                >
                  {ds.sortedDeals.map((d) => (
                    <option key={d.id} value={d.id} className="bg-background">
                      {d.title}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-muted-foreground">|</div>
                <div className="truncate text-xs text-muted-foreground">{companyName}</div>
              </div>
              <div className="mt-1 text-[11px] text-secondary-foreground">{board.name ?? 'Pipeline'}</div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-sm font-semibold text-emerald-300">{formatCurrencyBRL(deal.value ?? 0)}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Etapa: <span className="font-semibold text-muted-foreground">{ds.activeStage?.label ?? '\u2014'}</span>
              </div>
            </div>
          </div>

          <div className="ml-8 grid flex-1 gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, ds.stages.length)}, minmax(0, 1fr))` }}>
            {ds.stages.map((s, idx) => {
              const isActive = idx === ds.stageIndex;
              const isDone = idx < ds.stageIndex;
              return (
                <Button
                  key={s.id}
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => void actions.handleStageChange(s.id)}
                  title={`Mover para ${s.label}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 flex-1 rounded-full ${isDone || isActive ? toneToBg(s.tone) : 'bg-white/10'}`} />
                    <div className={`h-2 w-2 rounded-full ${isActive ? toneToBg(s.tone) : isDone ? 'bg-white/30' : 'bg-white/10'}`} />
                  </div>
                  <div className={`mt-1 text-[11px] ${isActive ? 'text-muted-foreground' : 'text-muted-foreground'}`}>{s.label}</div>
                </Button>
              );
            })}
          </div>

          <div className="ml-8 hidden text-[11px] text-secondary-foreground xl:block">Clique nas etapas para mover o deal (real)</div>
        </div>
      </div>

      {/* Cockpit layout */}
      <div className="h-[calc(100dvh-64px)] w-full overflow-hidden px-6 py-4 2xl:px-10">
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[360px_1fr_420px] lg:items-stretch">
          {/* Left rail */}
          <div className="flex min-h-0 flex-col gap-4 overflow-auto pr-1">
            <Panel
              title="Health"
              icon={<HeartPulse className="h-4 w-4 text-emerald-300" />}
              right={<Chip tone={ds.health.status === 'excellent' || ds.health.status === 'good' ? 'success' : 'neutral'}>{ds.health.score}%</Chip>}
              className="shrink-0"
            >
              <div className="h-2 w-full rounded-full bg-white/10">
                <div
                  className={`h-2 rounded-full ${ds.health.status === 'excellent' ? 'bg-emerald-500' : ds.health.status === 'good' ? 'bg-green-500' : ds.health.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${ds.health.score}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">IA + probabilidade do deal.</div>
                <Button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/3 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-white/5"
                  onClick={() => void ds.refetchAI()}
                  title="Reanalisar com IA"
                >
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    {ds.aiLoading ? 'Analisando\u2026' : 'Reanalisar'}
                  </span>
                </Button>
              </div>
            </Panel>

            <Panel title="Pr\u00f3xima a\u00e7\u00e3o" icon={<BadgeCheck className="h-4 w-4 text-cyan-300" />} className="shrink-0">
              <div className="text-sm font-semibold text-muted-foreground">{ds.nextBestAction.action}</div>
              <div className="mt-1 text-xs text-muted-foreground">{ds.nextBestAction.reason}</div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                Aqui EXECUTA (e tenta registrar o que d\u00e1). No rodap\u00e9 da timeline voc\u00ea REGISTRA atividades r\u00e1pidas que aconteceram fora do CRM.
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/25 hover:bg-rose-500"
                  onClick={() => void actions.handleExecuteNext()}
                >
                  <ActivityIcon className="h-4 w-4" />
                  Executar agora
                </Button>

                <div className="grid w-full grid-cols-4 gap-2">
                  <Button
                    type="button"
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/3 px-2 py-2 hover:bg-white/5"
                    title="Ligar (abre modal de liga\u00e7\u00e3o)"
                    aria-label="Ligar"
                    onClick={() => actions.handleCall('Liga\u00e7\u00e3o')}
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground">Ligar</span>
                  </Button>

                  <Button
                    type="button"
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/3 px-2 py-2 hover:bg-white/5"
                    title="Preparar WhatsApp"
                    aria-label="Preparar WhatsApp"
                    onClick={() =>
                      actions.openMessageComposer('WHATSAPP', {
                        message: buildSuggestedWhatsAppMessage({
                          contact: contact ?? undefined,
                          deal,
                          actionType: ds.nextBestAction.actionType,
                          action: ds.nextBestAction.action,
                          reason: ds.nextBestAction.reason,
                        }),
                      }, { source: 'generated' as const, origin: 'nextBestAction' as const, aiSuggested: ds.nextBestAction.isAI, aiActionType: ds.nextBestAction.actionType })
                    }
                  >
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground">Gerar WA</span>
                  </Button>

                  <Button
                    type="button"
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/3 px-2 py-2 hover:bg-white/5"
                    title="Preparar e-mail"
                    aria-label="Preparar e-mail"
                    onClick={() =>
                      actions.openMessageComposer('EMAIL', {
                        subject: `Sobre ${deal.title}`,
                        message: buildSuggestedEmailBody({
                          contact: contact ?? undefined,
                          deal,
                          actionType: ds.nextBestAction.actionType,
                          action: ds.nextBestAction.action,
                          reason: ds.nextBestAction.reason,
                        }),
                      }, { source: 'generated' as const, origin: 'nextBestAction' as const, aiSuggested: ds.nextBestAction.isAI, aiActionType: ds.nextBestAction.actionType })
                    }
                  >
                    <Inbox className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground">E-mail</span>
                  </Button>

                  <Button
                    type="button"
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/3 px-2 py-2 hover:bg-white/5"
                    title="Agendar (cria uma tarefa simples)"
                    aria-label="Agendar"
                    onClick={() => actions.openScheduleModal({ type: 'TASK', title: 'Agendar pr\u00f3ximo passo', description: 'Criado no cockpit (labs).' })}
                  >
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground">Agendar</span>
                  </Button>
                </div>

                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/2 px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-white/5 disabled:opacity-50"
                    title="Usar um template persistido (Quick Scripts)"
                    onClick={() => actions.openTemplatePicker('WHATSAPP')}
                    disabled={ds.isScriptsLoading || ds.scripts.length === 0}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Template WhatsApp
                  </Button>

                  <Button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/2 px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-white/5 disabled:opacity-50"
                    title="Usar um template persistido (Quick Scripts)"
                    onClick={() => actions.openTemplatePicker('EMAIL')}
                    disabled={ds.isScriptsLoading || ds.scripts.length === 0}
                  >
                    <Inbox className="h-4 w-4" />
                    Template E-mail
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel
              title="Dados"
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              className="flex min-h-0 flex-1 flex-col"
              bodyClassName="min-h-0 flex-1 overflow-auto"
            >
              <div className="flex min-h-0 flex-col gap-3">
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">{contact?.name ?? '\u2014'}</div>
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Tel</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground">{phoneE164 ?? ''}</span>
                        <Button
                          type="button"
                          className="rounded-lg border border-white/10 bg-white/2 p-1.5 text-muted-foreground hover:bg-white/5"
                          title="Copiar telefone"
                          onClick={() => phoneE164 && void actions.copyToClipboard('Telefone', phoneE164)}
                          disabled={!phoneE164}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Email</span>
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="truncate text-muted-foreground">{contact?.email ?? ''}</span>
                        <Button
                          type="button"
                          className="shrink-0 rounded-lg border border-white/10 bg-white/2 p-1.5 text-muted-foreground hover:bg-white/5"
                          title="Copiar email"
                          onClick={() => contact?.email && void actions.copyToClipboard('Email', contact.email)}
                          disabled={!contact?.email}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Origem</span>
                      <span className="text-muted-foreground">{contact?.source ?? '\u2014'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Status</span>
                      <span className="text-muted-foreground">{contact?.status ?? '\u2014'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/2 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sinais</div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">\u00daltimo evento</span>
                      <span className="truncate text-muted-foreground">
                        {ds.latestNonSystem ? `${ds.latestNonSystem.title}${ds.latestNonSystem.subtitle ? ` \u2014 ${ds.latestNonSystem.subtitle}` : ''}` : '\u2014'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">\u00daltima liga\u00e7\u00e3o</span>
                      <span className="truncate text-muted-foreground">{ds.latestCall ? ds.latestCall.at : '\u2014'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Etapa</span>
                      <span className="text-muted-foreground">{ds.activeStage?.label ?? '\u2014'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/2 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Resumo</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-white/10 bg-white/2 p-2">
                      <div className="text-muted-foreground">Valor</div>
                      <div className="mt-0.5 font-semibold text-muted-foreground">{formatCurrencyBRL(deal.value ?? 0)}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/2 p-2">
                      <div className="text-muted-foreground">Probabilidade</div>
                      <div className="mt-0.5 font-semibold text-muted-foreground">{deal.probability ?? 50}%</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/2 p-2">
                      <div className="text-muted-foreground">Dono</div>
                      <div className="mt-0.5 font-semibold text-muted-foreground">{deal.owner?.name ?? '\u2014'}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/2 p-2">
                      <div className="text-muted-foreground">\u00daltima mudan\u00e7a</div>
                      <div className="mt-0.5 truncate font-semibold text-muted-foreground">{ds.latestMove ? ds.latestMove.at : formatAtISO(deal.updatedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* Center */}
          <div className="flex min-h-0 flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-muted-foreground">Atividades</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    className={kindFilter === 'all'
                      ? 'rounded-full bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-white/10'
                      : 'rounded-full bg-white/3 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-white/10 hover:bg-white/5'
                    }
                    onClick={() => setKindFilter('all')}
                  >
                    Tudo
                  </Button>
                  {(['call', 'note', 'status'] as const).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      className={kindFilter === k
                        ? 'rounded-full bg-cyan-500/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 ring-1 ring-cyan-500/20'
                        : 'rounded-full bg-white/3 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-white/10 hover:bg-white/5'
                      }
                      onClick={() => setKindFilter(k)}
                    >
                      {k === 'call' ? 'Liga\u00e7\u00f5es' : k === 'note' ? 'Notas' : 'Mudan\u00e7as'}
                    </Button>
                  ))}

                  <Button
                    type="button"
                    className={showSystemEvents
                      ? 'rounded-full bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold text-amber-100 ring-1 ring-amber-500/20'
                      : 'rounded-full bg-white/3 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-white/10 hover:bg-white/5'
                    }
                    onClick={() => setShowSystemEvents((v) => !v)}
                    title="System events (hoje: quase tudo vem de Activity)"
                  >
                    Sistemas
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/3 px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar"
                    className="w-44 bg-transparent text-xs text-muted-foreground outline-none placeholder:text-secondary-foreground"
                  />
                </div>
                <Button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/3 p-2 hover:bg-white/5"
                  title="Filtros"
                  onClick={() => actions.pushToast('Use os chips para filtrar', 'neutral')}
                >
                  <Filter className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/3">
              <div className="flex-1 min-h-0 overflow-auto divide-y divide-white/10">
                {ds.timelineItems
                  .filter((t) => {
                    if (!showSystemEvents && t.kind === 'system') return false;
                    if (kindFilter !== 'all' && t.kind !== kindFilter) return false;
                    if (!query.trim()) return true;
                    const q = query.toLowerCase();
                    return `${t.title} ${t.subtitle ?? ''}`.toLowerCase().includes(q);
                  })
                  .map((t) => (
                    <div key={t.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">{t.title}</span>
                            {t.subtitle ? (
                              t.title === 'Moveu para' ? (
                                <Chip tone={t.tone === 'success' ? 'success' : t.tone === 'danger' ? 'danger' : 'neutral'}>{t.subtitle}</Chip>
                              ) : (
                                <span className="truncate text-xs text-muted-foreground">{t.subtitle}</span>
                              )
                            ) : null}
                          </div>
                          {t.title !== 'Moveu para' && t.subtitle ? (
                            <div className="mt-0.5 text-[11px] text-muted-foreground">{t.subtitle}</div>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-[11px] text-muted-foreground">{t.at}</div>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="border-t border-white/10 px-4 py-3">
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground"
                    title="Use quando a atividade aconteceu fora do CRM"
                  >
                    Registrar (fora do CRM):
                  </span>

                  <Button
                    type="button"
                    className="inline-flex items-center gap-2 hover:text-muted-foreground"
                    onClick={async () => {
                      const header = buildExecutionHeader({
                        channel: 'WHATSAPP',
                        context: { source: 'manual', origin: 'quickAction' },
                        outsideCRM: true,
                      });
                      await ds.addActivity({
                        dealId: deal.id,
                        dealTitle: deal.title,
                        type: 'NOTE',
                        title: 'WhatsApp',
                        description: `${header}\n\n---\n\nMensagem enviada (registrado fora do CRM).`,
                        date: new Date().toISOString(),
                        completed: true,
                        user: ds.actor,
                      });
                      actions.pushToast('WhatsApp registrado', 'success');
                    }}
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>

                  <Button
                    type="button"
                    className="inline-flex items-center gap-2 hover:text-muted-foreground"
                    onClick={async () => {
                      const header = buildExecutionHeader({
                        channel: 'EMAIL',
                        context: { source: 'manual', origin: 'quickAction' },
                        outsideCRM: true,
                      });
                      await ds.addActivity({
                        dealId: deal.id,
                        dealTitle: deal.title,
                        type: 'EMAIL',
                        title: 'Email',
                        description: `${header}\nAssunto: Email\n\n---\n\nEnviado (registrado fora do CRM).`,
                        date: new Date().toISOString(),
                        completed: true,
                        user: ds.actor,
                      });
                      actions.pushToast('Email registrado', 'success');
                    }}
                  >
                    <Inbox className="h-4 w-4" /> Email
                  </Button>

                  <Button
                    type="button"
                    className="inline-flex items-center gap-2 hover:text-muted-foreground"
                    onClick={async () => {
                      await ds.addActivity({
                        dealId: deal.id,
                        dealTitle: deal.title,
                        type: 'CALL',
                        title: 'Liga\u00e7\u00e3o',
                        description: 'Fonte: Cockpit\nFora do CRM: sim\n\n---\n\nRealizada (registrado fora do CRM).',
                        date: new Date().toISOString(),
                        completed: true,
                        user: ds.actor,
                      });
                      actions.pushToast('Liga\u00e7\u00e3o registrada', 'success');
                    }}
                  >
                    <Phone className="h-4 w-4" /> Liga\u00e7\u00e3o
                  </Button>

                  <Button
                    type="button"
                    className="inline-flex items-center gap-2 hover:text-muted-foreground"
                    onClick={async () => {
                      await ds.addActivity({
                        dealId: deal.id,
                        dealTitle: deal.title,
                        type: 'MEETING',
                        title: 'Reuni\u00e3o',
                        description: 'Fonte: Cockpit\nFora do CRM: sim\n\n---\n\nRegistrada fora do CRM.',
                        date: new Date().toISOString(),
                        completed: true,
                        user: ds.actor,
                      });
                      actions.pushToast('Reuni\u00e3o registrada', 'success');
                    }}
                  >
                    <CalendarClock className="h-4 w-4" /> Reuni\u00e3o
                  </Button>

                  <Button
                    type="button"
                    className="inline-flex items-center gap-2 hover:text-muted-foreground"
                    onClick={async () => {
                      await ds.addActivity({
                        dealId: deal.id,
                        dealTitle: deal.title,
                        type: 'TASK',
                        title: 'Tarefa',
                        description: 'Fonte: Cockpit\nFora do CRM: sim\n\n---\n\nCriada (registrado fora do CRM).',
                        date: new Date().toISOString(),
                        completed: true,
                        user: ds.actor,
                      });
                      actions.pushToast('Tarefa registrada', 'success');
                    }}
                  >
                    <ActivityIcon className="h-4 w-4" /> Tarefa
                  </Button>
                </div>
              </div>
            </div>

            {/* Bottom row: nota + checklist */}
            <div className="grid min-h-0 gap-4 lg:grid-cols-2 lg:max-h-[30dvh]">
              <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/3 p-4">
                <label className="block text-xs font-semibold text-muted-foreground">Escreva\u2026</label>
                <textarea
                  value={actions.noteDraftTimeline}
                  onChange={(e) => actions.setNoteDraftTimeline(e.target.value)}
                  className="mt-2 min-h-0 flex-1 w-full resize-none rounded-xl border border-white/10 bg-white/2 p-3 text-sm text-muted-foreground outline-none placeholder:text-secondary-foreground"
                  placeholder="Notas, resumo da call, pr\u00f3ximos passos\u2026"
                />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-muted-foreground">Isso vira uma Activity NOTE (log do deal).</div>
                  <Button
                    type="button"
                    className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                    onClick={async () => {
                      const text = actions.noteDraftTimeline.trim();
                      if (!text) {
                        actions.pushToast('Escreva uma nota antes de salvar', 'danger');
                        return;
                      }

                      await ds.addActivity({
                        dealId: deal.id,
                        dealTitle: deal.title,
                        type: 'NOTE',
                        title: 'Nota',
                        description: text,
                        date: new Date().toISOString(),
                        completed: true,
                        user: ds.actor,
                      });

                      actions.setNoteDraftTimeline('');
                      actions.pushToast('Nota salva', 'success');
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </div>

              <Panel
                title="Execu\u00e7\u00e3o"
                icon={<ActivityIcon className="h-4 w-4 text-amber-200" />}
                right={<Chip tone="success">Real</Chip>}
                className="flex min-h-0 flex-col"
                bodyClassName="min-h-0 flex-1 overflow-auto"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-muted-foreground">Checklist persistido por deal (salvo em customFields).</div>
                  <Button
                    type="button"
                    className="rounded-lg border border-white/10 bg-white/2 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-white/5"
                    onClick={actions.loadChecklistFromDeal}
                    title="Recarregar do deal"
                  >
                    Recarregar
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  {actions.checklist.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Sem itens. Adicione abaixo.</div>
                  ) : (
                    actions.checklist.map((it) => (
                      <div key={it.id} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/2 p-2.5">
                        <Button
                          type="button"
                          className={it.done
                            ? 'mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-foreground'
                            : 'mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border border-white/15 bg-white/3 text-muted-foreground hover:bg-white/5'
                          }
                          aria-label={it.done ? 'Marcar como n\u00e3o feito' : 'Marcar como feito'}
                          onClick={() => {
                            const next = actions.checklist.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x));
                            void actions.persistChecklist(next);
                          }}
                        >
                          {it.done ? <Check className="h-3.5 w-3.5" /> : null}
                        </Button>
                        <div className={it.done ? 'flex-1 text-sm text-muted-foreground line-through' : 'flex-1 text-sm text-muted-foreground'}>
                          {it.text}
                        </div>
                        <Button
                          type="button"
                          className="rounded-lg border border-white/10 bg-white/2 p-1.5 text-muted-foreground hover:bg-white/5"
                          title="Remover"
                          onClick={() => {
                            const next = actions.checklist.filter((x) => x.id !== it.id);
                            void actions.persistChecklist(next);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={actions.checklistDraft}
                    onChange={(e) => actions.setChecklistDraft(e.target.value)}
                    placeholder="Adicionar item\u2026"
                    className="h-10 flex-1 rounded-xl border border-white/10 bg-white/2 px-3 text-sm text-muted-foreground outline-none placeholder:text-secondary-foreground"
                  />
                  <Button
                    type="button"
                    className="h-10 rounded-xl bg-white px-4 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                    disabled={!actions.checklistDraft.trim()}
                    onClick={() => {
                      const text = actions.checklistDraft.trim();
                      if (!text) return;
                      actions.setChecklistDraft('');
                      const next = [...actions.checklist, { id: uid('chk'), text, done: false }];
                      void actions.persistChecklist(next);
                    }}
                  >
                    Adicionar
                  </Button>
                </div>

                <div className="mt-2 text-[11px] text-secondary-foreground">Dica: isso fica no deal atual e aparece igual quando voc\u00ea trocar de deal.</div>
              </Panel>
            </div>
          </div>

          {/* Right rail */}
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/3">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/20">
                    <Sparkles className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground">ZmobCRM Pilot</div>
                    <div className="text-[11px] text-muted-foreground">Deal: {deal.title}</div>
                  </div>
                </div>
                <Chip tone="success">Real</Chip>
              </div>

              <div className="flex items-center gap-4 px-4 shrink-0">
                <TabButton active={tab === 'chat'} onClick={() => setTab('chat')}>Chat IA</TabButton>
                <TabButton active={tab === 'notas'} onClick={() => setTab('notas')}>Notas</TabButton>
                <TabButton active={tab === 'scripts'} onClick={() => setTab('scripts')}>Scripts</TabButton>
                <TabButton active={tab === 'arquivos'} onClick={() => setTab('arquivos')}>Arquivos</TabButton>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden p-4">
                {tab === 'chat' ? (
                  <div className="h-full min-h-0 rounded-2xl border border-white/10 bg-white/2 overflow-hidden">
                    <UIChat
                      boardId={board.id}
                      dealId={deal.id}
                      contactId={contact?.id}
                      cockpitSnapshot={cockpitSnapshot ?? undefined}
                      contextMode="props-only"
                      floating={false}
                      startMinimized={false}
                    />
                  </div>
                ) : tab === 'notas' ? (
                  <div className="h-full min-h-0 rounded-2xl border border-white/10 bg-white/2 p-4 overflow-auto">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <StickyNote className="h-4 w-4" />
                      Notas do deal (persistidas)
                    </div>

                    <div className="mt-3">
                      <textarea
                        value={actions.dealNoteDraft}
                        onChange={(e) => actions.setDealNoteDraft(e.target.value)}
                        className="w-full min-h-27.5 resize-none rounded-xl border border-white/10 bg-white/3 p-3 text-sm text-muted-foreground outline-none placeholder:text-secondary-foreground"
                        placeholder="Escreva uma nota persistida\u2026"
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="text-[11px] text-muted-foreground">Salva em deal_notes.</div>
                        <Button
                          type="button"
                          className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                          disabled={!actions.dealNoteDraft.trim() || ds.createNote.isPending}
                          onClick={async () => {
                            const content = actions.dealNoteDraft.trim();
                            if (!content) return;
                            await ds.createNote.mutateAsync(content);
                            actions.setDealNoteDraft('');
                            actions.pushToast('Nota persistida salva', 'success');
                          }}
                        >
                          {ds.createNote.isPending ? 'Salvando\u2026' : 'Adicionar'}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4">
                      {ds.isNotesLoading ? (
                        <div className="text-sm text-muted-foreground">Carregando\u2026</div>
                      ) : ds.notes.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Sem notas ainda.</div>
                      ) : (
                        <div className="space-y-2">
                          {ds.notes.map((n) => (
                            <div key={n.id} className="rounded-2xl border border-white/10 bg-white/3 p-3">
                              <div className="whitespace-pre-wrap text-sm text-muted-foreground">{n.content}</div>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <div className="text-[11px] text-muted-foreground">{formatAtISO(n.created_at)}</div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    className="rounded-lg border border-white/10 bg-white/2 p-1.5 text-muted-foreground hover:bg-white/5"
                                    title="Copiar nota"
                                    onClick={() => void actions.copyToClipboard('Nota', n.content)}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-200 hover:bg-rose-500/15"
                                    title="Excluir"
                                    onClick={() => void ds.deleteNote.mutate(n.id)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : tab === 'scripts' ? (
                  <div className="h-full min-h-0 rounded-2xl border border-white/10 bg-white/2 p-4 overflow-auto">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <FileText className="h-4 w-4" /> Scripts (persistidos)
                      </div>
                      <div className="text-[11px] text-muted-foreground">{ds.isScriptsLoading ? 'Carregando\u2026' : `${ds.scripts.length} itens`}</div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {ds.scripts.map((s) => {
                        const info = ds.getCategoryInfo(s.category);
                        const preview = ds.applyVariables(s.template, ds.templateVariables);
                        return (
                          <div key={s.id} className="rounded-2xl border border-white/10 bg-white/3 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${scriptCategoryChipClass(info.color)}`}>
                                    {info.label}
                                  </span>
                                  <div className="truncate text-sm font-semibold text-muted-foreground">{s.title}</div>
                                </div>
                                <div className="mt-1 line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">{preview}</div>
                              </div>
                              <Button
                                type="button"
                                className="shrink-0 rounded-lg border border-white/10 bg-white/2 p-2 text-muted-foreground hover:bg-white/5"
                                title="Copiar"
                                onClick={() => void actions.copyToClipboard('Script', preview)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-0 rounded-2xl border border-white/10 bg-white/2 p-4 overflow-auto">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <Inbox className="h-4 w-4" /> Arquivos (storage)
                      </div>
                      <div className="text-[11px] text-muted-foreground">{ds.isFilesLoading ? 'Carregando\u2026' : `${ds.files.length} itens`}</div>
                    </div>

                    <div className="mt-3">
                      <input
                        type="file"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          await ds.uploadFile.mutateAsync(f);
                          e.currentTarget.value = '';
                          actions.pushToast('Arquivo enviado', 'success');
                        }}
                        className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-muted-foreground hover:file:bg-white/15"
                      />
                    </div>

                    <div className="mt-3 space-y-2">
                      {ds.files.length === 0 && !ds.isFilesLoading ? (
                        <div className="text-sm text-muted-foreground">Nenhum arquivo.</div>
                      ) : (
                        ds.files.map((f) => (
                          <div key={f.id} className="rounded-2xl border border-white/10 bg-white/3 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-muted-foreground">{f.file_name}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {ds.formatFileSize(f.file_size)} \u2022 {formatAtISO(f.created_at)}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  className="rounded-lg border border-white/10 bg-white/2 p-2 text-muted-foreground hover:bg-white/5"
                                  onClick={() => ds.downloadFile(f)}
                                  title="Download"
                                >
                                  <Inbox className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-rose-200 hover:bg-rose-500/15"
                                  onClick={() => void ds.deleteFile.mutate({ fileId: f.id, filePath: f.file_path })}
                                  title="Excluir"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/3 px-4 py-3 shrink-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                Cockpit
              </div>
              <div className="text-[11px] font-semibold text-muted-foreground">Padr\u00f5es hardcoded no c\u00f3digo</div>
            </div>
          </div>
        </div>
      </div>

      <CallModal
        isOpen={actions.isCallModalOpen}
        onClose={() => actions.setIsCallModalOpen(false)}
        onSave={actions.handleCallLogSave}
        contactName={contact?.name || 'Contato'}
        contactPhone={contact?.phone || ''}
        suggestedTitle={actions.callSuggestedTitle}
      />

      <TemplatePickerModal
        isOpen={actions.isTemplatePickerOpen}
        onClose={actions.closeTemplatePicker}
        mode={actions.templatePickerMode}
        scripts={ds.scripts}
        isLoading={ds.isScriptsLoading}
        variables={ds.templateVariables}
        applyVariables={ds.applyVariables}
        getCategoryInfo={ds.getCategoryInfo}
        onPick={actions.handlePickTemplate}
      />

      <MessageComposerModal
        isOpen={actions.isMessageModalOpen}
        onClose={actions.closeMessageModal}
        channel={actions.messageChannel}
        contactName={contact?.name || 'Contato'}
        contactEmail={contact?.email}
        contactPhone={contact?.phone}
        initialSubject={actions.messagePrefill?.subject}
        initialMessage={actions.messagePrefill?.message}
        onExecuted={(ev) => void actions.handleMessageExecuted(ev)}
        aiContext={{
          cockpitSnapshot: cockpitSnapshot ?? undefined,
          nextBestAction: {
            action: ds.nextBestAction.action,
            reason: ds.nextBestAction.reason,
            actionType: ds.nextBestAction.actionType,
            urgency: ds.nextBestAction.urgency,
          },
        }}
      />

      <ScheduleModal
        isOpen={actions.isScheduleModalOpen}
        onClose={actions.closeScheduleModal}
        onSave={(data) => void actions.handleScheduleSave(data)}
        contactName={contact?.name || 'Contato'}
        initialType={actions.scheduleInitial?.type}
        initialTitle={actions.scheduleInitial?.title}
        initialDescription={actions.scheduleInitial?.description}
      />
    </div>
  );
}
