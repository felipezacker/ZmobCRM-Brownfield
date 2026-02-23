'use client';

import React, { useState } from 'react';
import { Copy, FileText, Inbox, Sparkles, StickyNote, X } from 'lucide-react';
import { Chip, TabButton } from './cockpit-ui';
import { UIChat } from '@/components/ai/UIChat';
import type { Tab, CockpitSnapshot } from './cockpit-types';
import { formatAtISO, humanizeTestLabel, scriptCategoryChipClass } from './cockpit-utils';
import type { QuickScript, ScriptCategory } from '@/lib/supabase/quickScripts';

interface CockpitRightRailProps {
  dealId: string;
  dealTitle: string;
  boardId: string;
  contactId?: string;
  cockpitSnapshot: CockpitSnapshot | undefined;
  notes: Array<{ id: string; content: string; created_at: string; created_by?: string | null }>;
  isNotesLoading: boolean;
  createNote: { mutateAsync: (content: string) => Promise<any>; isPending: boolean };
  deleteNote: { mutate: (id: string) => void };
  files: Array<{ id: string; file_name: string; file_size: number | null; mime_type: string | null; file_path: string; created_at: string }>;
  isFilesLoading: boolean;
  uploadFile: { mutateAsync: (file: File) => Promise<any> };
  deleteFile: { mutate: (args: { fileId: string; filePath: string }) => void };
  downloadFile: (file: any) => void;
  formatFileSize: (size: number) => string;
  scripts: QuickScript[];
  isScriptsLoading: boolean;
  applyVariables: (template: string, vars: Record<string, string>) => string;
  getCategoryInfo: (category: ScriptCategory) => { label: string; color: string };
  templateVariables: Record<string, string>;
  crmLoading: boolean;
  onRefreshCRM: () => void;
  onCopy: (label: string, text: string) => void;
  pushToast: (message: string, tone?: 'neutral' | 'success' | 'danger') => void;
}

export function CockpitRightRail({
  dealId,
  dealTitle,
  boardId,
  contactId,
  cockpitSnapshot,
  notes,
  isNotesLoading,
  createNote,
  deleteNote,
  files,
  isFilesLoading,
  uploadFile,
  deleteFile,
  downloadFile,
  formatFileSize,
  scripts,
  isScriptsLoading,
  applyVariables,
  getCategoryInfo,
  templateVariables,
  crmLoading,
  onRefreshCRM,
  onCopy,
  pushToast,
}: CockpitRightRailProps) {
  const [tab, setTab] = useState<Tab>('chat');
  const [dealNoteDraft, setDealNoteDraft] = useState('');

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/3">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/20">
              <Sparkles className="h-4 w-4 text-cyan-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">ZmobCRM Pilot</div>
              <div className="text-[11px] text-slate-500">Deal: {humanizeTestLabel(dealTitle) || dealTitle}</div>
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
                boardId={boardId}
                dealId={dealId}
                contactId={contactId}
                cockpitSnapshot={cockpitSnapshot}
                contextMode="props-only"
                floating={false}
                startMinimized={false}
              />
            </div>
          ) : tab === 'notas' ? (
            <div className="h-full min-h-0 rounded-2xl border border-white/10 bg-white/2 p-4 overflow-auto">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <StickyNote className="h-4 w-4" />
                Notas do deal (persistidas)
              </div>
              <div className="mt-3">
                <textarea
                  value={dealNoteDraft}
                  onChange={(e) => setDealNoteDraft(e.target.value)}
                  className="w-full min-h-27.5 resize-none rounded-xl border border-white/10 bg-white/3 p-3 text-sm text-slate-200 outline-none placeholder:text-slate-600"
                  placeholder="Escreva uma nota persistida…"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500">Salva em deal_notes.</div>
                  <button
                    type="button"
                    className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
                    disabled={!dealNoteDraft.trim() || createNote.isPending}
                    onClick={async () => {
                      const content = dealNoteDraft.trim();
                      if (!content) return;
                      await createNote.mutateAsync(content);
                      setDealNoteDraft('');
                      pushToast('Nota persistida salva', 'success');
                    }}
                  >
                    {createNote.isPending ? 'Salvando…' : 'Adicionar'}
                  </button>
                </div>
              </div>
              <div className="mt-4">
                {isNotesLoading ? (
                  <div className="text-sm text-slate-400">Carregando…</div>
                ) : notes.length === 0 ? (
                  <div className="text-sm text-slate-400">Sem notas ainda.</div>
                ) : (
                  <div className="space-y-2">
                    {notes.map((n) => (
                      <div key={n.id} className="rounded-2xl border border-white/10 bg-white/3 p-3">
                        <div className="whitespace-pre-wrap text-sm text-slate-200">{n.content}</div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-slate-500">{formatAtISO(n.created_at)}</div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-white/10 bg-white/2 p-1.5 text-slate-300 hover:bg-white/5"
                              title="Copiar nota"
                              onClick={() => onCopy('Nota', n.content)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-200 hover:bg-rose-500/15"
                              title="Excluir"
                              onClick={() => deleteNote.mutate(n.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
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
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <FileText className="h-4 w-4" /> Scripts (persistidos)
                </div>
                <div className="text-[11px] text-slate-500">{isScriptsLoading ? 'Carregando…' : `${scripts.length} itens`}</div>
              </div>
              <div className="mt-3 space-y-2">
                {scripts.map((s) => {
                  const info = getCategoryInfo(s.category);
                  const preview = applyVariables(s.template, templateVariables);
                  return (
                    <div key={s.id} className="rounded-2xl border border-white/10 bg-white/3 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${scriptCategoryChipClass(info.color)}`}>
                              {info.label}
                            </span>
                            <div className="truncate text-sm font-semibold text-slate-100">{s.title}</div>
                          </div>
                          <div className="mt-1 line-clamp-3 text-xs text-slate-400 whitespace-pre-wrap">{preview}</div>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded-lg border border-white/10 bg-white/2 p-2 text-slate-200 hover:bg-white/5"
                          title="Copiar"
                          onClick={() => onCopy('Script', preview)}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-0 rounded-2xl border border-white/10 bg-white/2 p-4 overflow-auto">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Inbox className="h-4 w-4" /> Arquivos (storage)
                </div>
                <div className="text-[11px] text-slate-500">{isFilesLoading ? 'Carregando…' : `${files.length} itens`}</div>
              </div>
              <div className="mt-3">
                <input
                  type="file"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    await uploadFile.mutateAsync(f);
                    e.currentTarget.value = '';
                    pushToast('Arquivo enviado', 'success');
                  }}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-100 hover:file:bg-white/15"
                />
              </div>
              <div className="mt-3 space-y-2">
                {files.length === 0 && !isFilesLoading ? (
                  <div className="text-sm text-slate-400">Nenhum arquivo.</div>
                ) : (
                  files.map((f) => (
                    <div key={f.id} className="rounded-2xl border border-white/10 bg-white/3 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-100">{f.file_name}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {formatFileSize(f.file_size ?? 0)} • {formatAtISO(f.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-white/10 bg-white/2 p-2 text-slate-200 hover:bg-white/5"
                            onClick={() => downloadFile(f)}
                            title="Download"
                          >
                            <Inbox className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-rose-200 hover:bg-rose-500/15"
                            onClick={() => deleteFile.mutate({ fileId: f.id, filePath: f.file_path })}
                            title="Excluir"
                          >
                            <X className="h-4 w-4" />
                          </button>
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
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span>Contexto</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] font-semibold text-slate-500">{crmLoading ? 'Sincronizando…' : 'Pronto'}</div>
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/2 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/5"
            onClick={onRefreshCRM}
            title="Recarregar dados do CRM"
          >
            Recarregar
          </button>
        </div>
      </div>
    </div>
  );
}
