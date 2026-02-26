'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Briefcase,
  StickyNote,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { TabButton, Chip } from '@/features/deals/cockpit/cockpit-ui';
import { formatCurrencyBRL, formatAtISO } from '@/features/deals/cockpit/cockpit-utils';
import { UIChat } from '@/components/ai/UIChat';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/app/components/ui/Button';
import type { Contact, Deal } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RightTab = 'ia' | 'deals' | 'notas';

interface DealNote {
  id: string;
  deal_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface ContactCockpitRightRailProps {
  contact: Contact;
  deals: Deal[];
  notes: DealNote[];
  isNotesLoading: boolean;
  onNoteCreated: () => void;
  onNoteDeleted: (noteId: string) => void;
  /** Contact snapshot for AI context */
  contactSnapshot: Record<string, unknown> | undefined;
}

// ---------------------------------------------------------------------------
// Deal type labels
// ---------------------------------------------------------------------------

const DEAL_TYPE_LABELS: Record<string, string> = {
  VENDA: 'Venda',
  LOCACAO: 'Locacao',
  PERMUTA: 'Permuta',
};

// ---------------------------------------------------------------------------
// Stage badge (from deal status uuid — shows as neutral since we don't have board context)
// ---------------------------------------------------------------------------

function StageBadge({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContactCockpitRightRail({
  contact,
  deals,
  notes,
  isNotesLoading,
  onNoteCreated,
  onNoteDeleted,
  contactSnapshot,
}: ContactCockpitRightRailProps) {
  const router = useRouter();
  const [tab, setTab] = useState<RightTab>('deals');
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ---- Tab: Deals ----
  const sortedDeals = useMemo(
    () => [...deals].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [deals]
  );

  // ---- Tab: Notas ----
  const handleCreateNote = async () => {
    const text = noteDraft.trim();
    if (!text || !supabase) return;

    setSavingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let orgId: string | undefined;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        orgId = (profile as any)?.organization_id ?? undefined;
      }

      // If we have a deal, save as deal_note on the first deal
      const dealId = deals[0]?.id;
      if (dealId && orgId) {
        await supabase.from('deal_notes').insert({
          deal_id: dealId,
          content: text,
          organization_id: orgId,
          created_by: user?.id ?? null,
        });
      }

      setNoteDraft('');
      onNoteCreated();
    } catch (e) {
      console.error('Failed to create note:', e);
    } finally {
      setSavingNote(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    const text = editingContent.trim();
    if (!text || !supabase) return;

    try {
      await supabase
        .from('deal_notes')
        .update({ content: text, updated_at: new Date().toISOString() })
        .eq('id', noteId);
      setEditingNoteId(null);
      setEditingContent('');
      onNoteCreated(); // refresh
    } catch (e) {
      console.error('Failed to update note:', e);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!supabase) return;
    try {
      await supabase.from('deal_notes').delete().eq('id', noteId);
      setConfirmDeleteId(null);
      onNoteDeleted(noteId);
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  // ---- AI snapshot ----
  const aiSnapshotText = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Contato: ${contact.name}`);
    if (contact.classification) parts.push(`Classificacao: ${contact.classification}`);
    if (contact.temperature) parts.push(`Temperatura: ${contact.temperature}`);
    if (contact.stage) parts.push(`Estagio: ${contact.stage}`);
    parts.push(`Deals vinculados: ${deals.length}`);
    if (deals.length > 0) {
      const total = deals.reduce((sum, d) => sum + (d.value || 0), 0);
      parts.push(`Valor total: ${formatCurrencyBRL(total)}`);
    }
    return parts.join('\n');
  }, [contact, deals]);

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/3">
        {/* Tabs */}
        <div className="flex items-center border-b border-white/10 px-2 shrink-0">
          <TabButton active={tab === 'ia'} onClick={() => setTab('ia')}>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> IA
            </span>
          </TabButton>
          <TabButton active={tab === 'deals'} onClick={() => setTab('deals')}>
            <span className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> Deals ({deals.length})
            </span>
          </TabButton>
          <TabButton active={tab === 'notas'} onClick={() => setTab('notas')}>
            <span className="flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" /> Notas ({notes.length})
            </span>
          </TabButton>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {/* ---- IA TAB ---- */}
          {tab === 'ia' && (
            <div className="p-4 space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/2 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Contexto do Contato
                </div>
                <pre className="text-[11px] text-slate-400 whitespace-pre-wrap font-mono">
                  {aiSnapshotText}
                </pre>
              </div>
              <UIChat
                contactId={contact.id}
                dealId={deals[0]?.id}
                cockpitSnapshot={contactSnapshot}
                contextMode="props-only"
                startMinimized={false}
              />
            </div>
          )}

          {/* ---- DEALS TAB ---- */}
          {tab === 'deals' && (
            <div className="p-4 space-y-3">
              {sortedDeals.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                  <div className="text-sm text-slate-400">Nenhum deal vinculado</div>
                </div>
              ) : (
                sortedDeals.map((deal) => (
                  <Button
                    key={deal.id}
                    type="button"
                    className="w-full rounded-xl border border-white/10 bg-white/2 p-3 text-left hover:bg-white/5 transition-colors"
                    onClick={() => router.push(`/deals/${deal.id}/cockpit`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {deal.title}
                        </div>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {deal.dealType && (
                            <Chip tone="neutral">
                              {DEAL_TYPE_LABELS[deal.dealType] || deal.dealType}
                            </Chip>
                          )}
                          {deal.probability != null && (
                            <span className="text-[10px] text-slate-500">
                              {deal.probability}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-semibold text-emerald-300">
                          {formatCurrencyBRL(deal.value ?? 0)}
                        </div>
                        {deal.isWon && (
                          <Chip tone="success">Ganho</Chip>
                        )}
                        {deal.isLost && (
                          <Chip tone="danger">Perdido</Chip>
                        )}
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          )}

          {/* ---- NOTAS TAB ---- */}
          {tab === 'notas' && (
            <div className="p-4 space-y-3">
              {/* Create note */}
              {deals.length > 0 && (
                <div className="space-y-2">
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Escreva uma nota..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/2 p-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 min-h-[60px]"
                  />
                  <Button
                    type="button"
                    className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
                    onClick={handleCreateNote}
                    disabled={savingNote || !noteDraft.trim()}
                  >
                    {savingNote ? 'Salvando...' : 'Salvar nota'}
                  </Button>
                </div>
              )}

              {deals.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-500">
                  Vincule um deal para criar notas.
                </div>
              )}

              {/* Notes list */}
              {isNotesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-500" />
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-6">
                  <StickyNote className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                  <div className="text-sm text-slate-400">Nenhuma nota</div>
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-xl border border-white/10 bg-white/2 p-3"
                  >
                    {editingNoteId === note.id ? (
                      /* Editing mode */
                      <div className="space-y-2">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full resize-none rounded-lg border border-white/10 bg-white/2 p-2 text-xs text-slate-200 outline-none min-h-[50px]"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-300 hover:bg-emerald-500/30"
                            onClick={() => handleUpdateNote(note.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            className="rounded-lg bg-white/5 p-1.5 text-slate-400 hover:bg-white/10"
                            onClick={() => {
                              setEditingNoteId(null);
                              setEditingContent('');
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Read mode */
                      <>
                        <div className="text-xs text-slate-200 whitespace-pre-wrap">
                          {note.content}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">
                            {formatAtISO(note.created_at)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              className="rounded-lg p-1 text-slate-500 hover:text-slate-300 hover:bg-white/5"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingContent(note.content);
                              }}
                              title="Editar"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {confirmDeleteId === note.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  className="rounded-lg bg-rose-500/20 p-1 text-rose-300 hover:bg-rose-500/30"
                                  onClick={() => handleDeleteNote(note.id)}
                                  title="Confirmar exclusao"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  className="rounded-lg bg-white/5 p-1 text-slate-400 hover:bg-white/10"
                                  onClick={() => setConfirmDeleteId(null)}
                                  title="Cancelar"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                className="rounded-lg p-1 text-slate-500 hover:text-rose-400 hover:bg-white/5"
                                onClick={() => setConfirmDeleteId(note.id)}
                                title="Excluir"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
