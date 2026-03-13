'use client';

import React, { useState } from 'react';
import {
  Copy,
  Download,
  FileText,
  FolderOpen,
  Inbox,
  Sparkles,
  StickyNote,
  X,
} from 'lucide-react';
import { TabButton } from './cockpit-ui';
import { UIChat } from '@/components/ai/UIChat';
import type { Tab, CockpitSnapshot } from './cockpit-types';
import { formatAtISO, humanizeTestLabel, scriptCategoryChipClass } from './cockpit-utils';
import type { QuickScript, ScriptCategory } from '@/lib/supabase/quickScripts';
import type { DealFile } from '@/lib/supabase/dealFiles';
import { Button } from '@/components/ui/button';

interface CockpitRightRailProps {
  dealId: string;
  dealTitle: string;
  boardId: string;
  contactId?: string;
  cockpitSnapshot: CockpitSnapshot | undefined;
  notes: Array<{ id: string; content: string; created_at: string; created_by?: string | null }>;
  isNotesLoading: boolean;
  createNote: { mutateAsync: (content: string) => Promise<unknown>; isPending: boolean };
  deleteNote: { mutate: (id: string) => void };
  files: DealFile[];
  isFilesLoading: boolean;
  uploadFile: { mutateAsync: (file: File) => Promise<unknown> };
  deleteFile: { mutate: (args: { fileId: string; filePath: string }) => void };
  downloadFile: (file: DealFile) => void;
  formatFileSize: (size: number) => string;
  scripts: QuickScript[];
  isScriptsLoading: boolean;
  applyVariables: (template: string, vars: Record<string, string>) => string;
  getCategoryInfo: (category: ScriptCategory) => { label: string; color: string };
  templateVariables: Record<string, string>;
  contactNotes?: string | null;
  onUpdateContactNotes?: (notes: string | null) => void;
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
  contactNotes,
  onUpdateContactNotes,
  crmLoading,
  onRefreshCRM,
  onCopy,
  pushToast,
}: CockpitRightRailProps) {
  const [tab, setTab] = useState<Tab>('chat');
  const [dealNoteDraft, setDealNoteDraft] = useState('');

  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-white dark:bg-white/3">
        <div className="flex items-center justify-between border-b border-border px-3 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/20">
              <Sparkles className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground dark:text-muted-foreground">ZmobCRM Pilot</div>
              <div className="text-2xs text-muted-foreground truncate max-w-[200px]">
                {humanizeTestLabel(dealTitle) || dealTitle}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 shrink-0">
          <TabButton active={tab === 'chat'} onClick={() => setTab('chat')}>Chat IA</TabButton>
          <TabButton active={tab === 'notas'} onClick={() => setTab('notas')} count={notes.length}>Notas</TabButton>
          <TabButton active={tab === 'scripts'} onClick={() => setTab('scripts')} count={scripts.length}>Scripts</TabButton>
          <TabButton active={tab === 'arquivos'} onClick={() => setTab('arquivos')} count={files.length}>Arquivos</TabButton>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-3">
          {tab === 'chat' ? (
            <div className="h-full min-h-0 rounded-xl border border-border bg-white dark:bg-white/2 overflow-hidden">
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
            <div className="h-full min-h-0 rounded-xl border border-border bg-white dark:bg-white/2 p-3 overflow-auto">
              {/* Notas do contato */}
              <div className="mb-3">
                <div className="flex items-center gap-2 text-1xs font-semibold text-muted-foreground dark:text-muted-foreground mb-1.5">
                  <StickyNote className="h-3.5 w-3.5" />
                  Notas do contato
                </div>
                <textarea
                  className="w-full resize-none rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-200/90 outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                  rows={2}
                  defaultValue={contactNotes ?? ''}
                  placeholder="Notas do contato..."
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (contactNotes ?? '')) onUpdateContactNotes?.(v || null);
                  }}
                />
              </div>

              <div className="border-t border-border pt-3">
              <div className="flex items-center gap-2 text-1xs font-semibold text-muted-foreground dark:text-muted-foreground">
                <StickyNote className="h-3.5 w-3.5" />
                Notas do deal
              </div>
              <div className="mt-2">
                <textarea
                  value={dealNoteDraft}
                  onChange={(e) => setDealNoteDraft(e.target.value)}
                  className="w-full min-h-20 resize-none rounded-lg border border-border bg-white dark:bg-white/3 p-2.5 text-xs text-secondary-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground dark:placeholder:text-secondary-foreground"
                  placeholder="Escreva uma nota..."
                />
                <div className="mt-1.5 flex items-center justify-end">
                  <Button
                    type="button"
                    className="rounded-lg bg-white px-3 py-1.5 text-1xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                    disabled={!dealNoteDraft.trim() || createNote.isPending}
                    onClick={async () => {
                      const content = dealNoteDraft.trim();
                      if (!content) return;
                      try {
                        await createNote.mutateAsync(content);
                        setDealNoteDraft('');
                        pushToast('Nota salva', 'success');
                      } catch {
                        pushToast('Erro ao salvar nota.', 'danger');
                      }
                    }}
                  >
                    {createNote.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {isNotesLoading ? (
                  <div className="text-xs text-muted-foreground">Carregando...</div>
                ) : notes.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <StickyNote className="h-5 w-5 text-muted-foreground dark:text-secondary-foreground" />
                    <span className="text-xs text-muted-foreground dark:text-muted-foreground">Nenhuma nota ainda. Registre informações importantes sobre este deal.</span>
                  </div>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="rounded-xl border border-border bg-white dark:bg-white/3 p-2.5">
                      <div className="whitespace-pre-wrap text-xs text-secondary-foreground dark:text-muted-foreground line-clamp-4">{n.content}</div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <div className="text-2xs text-muted-foreground dark:text-secondary-foreground">{formatAtISO(n.created_at)}</div>
                        <div className="flex items-center gap-1">
                          <Button type="button" className="rounded p-1 text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 hover:text-foreground dark:hover:text-muted-foreground" title="Copiar" onClick={() => onCopy('Nota', n.content)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button type="button" className="rounded p-1 text-rose-400/60 hover:bg-rose-500/10 hover:text-rose-300" title="Excluir" onClick={() => deleteNote.mutate(n.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              </div>
            </div>
          ) : tab === 'scripts' ? (
            <div className="h-full min-h-0 rounded-xl border border-border bg-white dark:bg-white/2 p-3 overflow-auto">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-1xs font-semibold text-muted-foreground dark:text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" /> Scripts
                </div>
                <div className="text-2xs text-muted-foreground dark:text-secondary-foreground">{isScriptsLoading ? 'Carregando...' : `${scripts.length}`}</div>
              </div>
              <div className="mt-2 space-y-1.5">
                {scripts.map((s) => {
                  const info = getCategoryInfo(s.category);
                  const preview = applyVariables(s.template, templateVariables);
                  return (
                    <div key={s.id} className="rounded-xl border border-border bg-white dark:bg-white/3 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-3xs font-semibold px-1.5 py-0.5 rounded ${scriptCategoryChipClass(info.color)}`}>
                              {info.label}
                            </span>
                            <div className="truncate text-xs font-semibold text-secondary-foreground dark:text-muted-foreground">{s.title}</div>
                          </div>
                          <div className="mt-1 line-clamp-2 text-1xs text-muted-foreground whitespace-pre-wrap">{preview}</div>
                        </div>
                        <Button type="button" className="shrink-0 rounded p-1.5 text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 hover:text-foreground dark:hover:text-muted-foreground" title="Copiar" onClick={() => onCopy('Script', preview)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-0 rounded-xl border border-border bg-white dark:bg-white/2 p-3 overflow-auto">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-1xs font-semibold text-muted-foreground dark:text-muted-foreground">
                  <Inbox className="h-3.5 w-3.5" /> Arquivos
                </div>
                <div className="text-2xs text-muted-foreground dark:text-secondary-foreground">{isFilesLoading ? 'Carregando...' : `${files.length}`}</div>
              </div>
              <div className="mt-2">
                <input
                  type="file"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    await uploadFile.mutateAsync(f);
                    e.currentTarget.value = '';
                    pushToast('Arquivo enviado', 'success');
                  }}
                  className="block w-full text-1xs text-muted-foreground dark:text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-muted dark:file:bg-white/10 file:px-2.5 file:py-1.5 file:text-1xs file:font-semibold file:text-secondary-foreground dark:file:text-muted-foreground hover:file:bg-accent dark:hover:file:bg-white/15"
                />
              </div>
              <div className="mt-2 space-y-1.5">
                {files.length === 0 && !isFilesLoading ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <FolderOpen className="h-5 w-5 text-muted-foreground dark:text-secondary-foreground" />
                    <span className="text-xs text-muted-foreground dark:text-muted-foreground">Nenhum arquivo. Envie documentos, propostas ou fotos do imóvel.</span>
                  </div>
                ) : (
                  files.map((f) => (
                    <div key={f.id} className="rounded-xl border border-border bg-white dark:bg-white/3 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-secondary-foreground dark:text-muted-foreground">{f.file_name}</div>
                          <div className="mt-0.5 text-2xs text-muted-foreground">
                            {formatFileSize(f.file_size ?? 0)} • {formatAtISO(f.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" className="rounded p-1.5 text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 hover:text-foreground dark:hover:text-muted-foreground" onClick={() => downloadFile(f)} title="Download">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" className="rounded p-1.5 text-rose-400/60 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => deleteFile.mutate({ fileId: f.id, filePath: f.file_path })} title="Excluir">
                            <X className="h-3.5 w-3.5" />
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

      <div className="flex items-center justify-between rounded-xl border border-border bg-white dark:bg-white/3 px-3 py-2 shrink-0">
        <span className="text-2xs font-semibold text-muted-foreground dark:text-secondary-foreground">Contexto</span>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-muted-foreground dark:text-secondary-foreground">{crmLoading ? 'Sync...' : 'Pronto'}</span>
          <Button type="button" className="rounded-lg border border-border bg-white dark:bg-white/2 px-2 py-1 text-2xs font-semibold text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5" onClick={onRefreshCRM}>
            Recarregar
          </Button>
        </div>
      </div>
    </div>
  );
}
