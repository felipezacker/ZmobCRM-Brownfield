import React, { useEffect, useState } from 'react';
import { Copy, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { Board, BoardStage, JourneyDefinition } from '@/types';
import { useToast } from '@/context/ToastContext';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { useJourneyExport, useJourneyImport } from './hooks';

export function slugify(input: string) {
  // NOTE: avoid Unicode property escapes (\p{L}) for broader browser compatibility (Safari).
  // Normalize accents → ASCII-ish, then keep [a-z0-9-].
  const ascii = (input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return ascii
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);

  // Note: some browsers (notably Safari) may cancel the download if the object URL
  // is revoked immediately after click. Keep it alive briefly.
  try {
    // Ensure the node is in the DOM before triggering the click (some browsers are picky).
    requestAnimationFrame(() => {
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
  } catch {
    // Fallback: open the blob URL (user can save manually).
    window.open(url, '_blank', 'noopener,noreferrer');
  } finally {
    a.remove();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 2000);
  }
}

export function buildJourneyFromBoards(
  opts: { schemaVersion: string; journeyName?: string; boards: Board[]; slugPrefix?: string }
): JourneyDefinition {
  const { schemaVersion, journeyName, boards, slugPrefix } = opts;

  const usedSlugs = new Set<string>();
  const mkSlug = (name: string) => {
    const base = slugify(`${slugPrefix ? `${slugPrefix}-` : ''}${name}`) || 'board';
    let s = base;
    let i = 2;
    while (usedSlugs.has(s)) {
      s = `${base}-${i}`;
      i += 1;
    }
    usedSlugs.add(s);
    return s;
  };

  return {
    schemaVersion,
    name: journeyName,
    boards: boards.map(b => ({
      slug: mkSlug(b.name),
      name: b.name,
      columns: b.stages.map(s => ({
        name: s.label,
        color: s.color,
        linkedLifecycleStage: s.linkedLifecycleStage,
      })),
      strategy: {
        agentPersona: b.agentPersona,
        goal: b.goal,
        entryTrigger: b.entryTrigger,
      },
    })),
  };
}

type Panel = 'export' | 'import';

export function buildDefaultJourneyName(selectedBoards: Board[]) {
  if (selectedBoards.length <= 1) return selectedBoards[0]?.name || 'Jornada';
  const first = selectedBoards[0]?.name ?? 'Board 1';
  const last = selectedBoards[selectedBoards.length - 1]?.name ?? 'Board N';
  return `Jornada - ${first} → ${last}`;
}

export const JourneySchema = z.object({
  schemaVersion: z.string().min(1),
  name: z.string().optional(),
  boards: z.array(z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    columns: z.array(z.object({
      name: z.string().min(1),
      color: z.string().optional(),
      linkedLifecycleStage: z.string().optional(),
    })).min(1),
    strategy: z.object({
      agentPersona: z.object({
        name: z.string().optional(),
        role: z.string().optional(),
        behavior: z.string().optional(),
      }).optional(),
      goal: z.object({
        description: z.string().optional(),
        kpi: z.string().optional(),
        targetValue: z.string().optional(),
        type: z.string().optional(),
      }).optional(),
      entryTrigger: z.string().optional(),
    }).optional(),
  })).min(1),
});

export function guessWonLostStageIds(stages: BoardStage[]) {
  const won = stages.find(s => /\b(ganho|won|fechado ganho|conclu[ií]do)\b/i.test(s.label))?.id;
  const lost = stages.find(s => /\b(perdido|lost|churn|cancelad[oa])\b/i.test(s.label))?.id;
  return { wonStageId: won, lostStageId: lost };
}

/**
 * Componente React `ExportTemplateModal`.
 *
 * @param {{ isOpen: boolean; onClose: () => void; boards: Board[]; activeBoard: Board; onCreateBoardAsync?: ((board: Omit<Board, "id" | "createdAt">, order?: number | undefined) => Promise<...>) | undefined; }} props - Parâmetro `props`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export function ExportTemplateModal(props: {
  isOpen: boolean;
  onClose: () => void;
  boards: Board[];
  activeBoard: Board;
  onCreateBoardAsync?: (board: Omit<Board, 'id' | 'createdAt'>, order?: number) => Promise<Board>;
}) {
  const { isOpen, onClose, boards, activeBoard, onCreateBoardAsync } = props;
  const { addToast } = useToast();

  const [panel, setPanel] = useState<Panel>('export');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showPasteImport, setShowPasteImport] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPanel('export');
    setShowTechnicalDetails(false);
    setShowPasteImport(false);
  }, [isOpen]);

  const {
    schemaVersion, setSchemaVersion,
    journeyName, setJourneyName, setJourneyNameDirty,
    slugPrefix, setSlugPrefix,
    selectedBoardIds, selectedBoards,
    journeyJsonText,
    toggleBoard, moveSelected,
    handleDownloadJourney, handleCopyJourneyJson,
  } = useJourneyExport({ boards, activeBoard, isOpen, addToast });

  const {
    importText, importError, importJourney, isImporting,
    parseImport, handleImportFile, handleInstallImportedJourney,
  } = useJourneyImport({ addToast, onClose, onCreateBoardAsync, setPanel });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar template (comunidade)"
      size="xl"
      className="max-w-2xl"
      bodyClassName="space-y-6 max-h-[75vh] overflow-y-auto pr-1"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setPanel('export')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${panel === 'export'
              ? 'bg-primary-600 dark:bg-primary-500 text-white border-primary-600 dark:border-primary-500'
              : 'bg-white dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground border-border  hover:bg-background dark:hover:bg-white/10'
              }`}
          >
            Exportar
          </Button>
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setPanel('import')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${panel === 'import'
              ? 'bg-primary-600 dark:bg-primary-500 text-white border-primary-600 dark:border-primary-500'
              : 'bg-white dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground border-border  hover:bg-background dark:hover:bg-white/10'
              }`}
          >
            Importar JSON
          </Button>
        </div>
      </div>

      {panel === 'import' && (
        <div className="rounded-xl border border-border p-4 bg-background/50 dark:bg-white/5 space-y-4">
          <div>
            <div className="text-sm font-bold text-foreground">Importar template (arquivo JSON)</div>
            <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
              Faça upload do arquivo exportado e clique em <b>Instalar</b>.
            </div>
          </div>

          <input
            type="file"
            accept=".json,application/json"
            onChange={e => void handleImportFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-secondary-foreground dark:text-muted-foreground"
          />

          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setShowPasteImport(v => !v)}
            className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors w-fit"
          >
            {showPasteImport ? 'Ocultar opção de colar JSON' : 'Colar JSON manualmente (avançado)'}
          </Button>

          {showPasteImport && (
            <textarea
              value={importText}
              onChange={e => parseImport(e.target.value)}
              placeholder="Cole o conteúdo do arquivo JSON aqui…"
              className="w-full min-h-44 rounded-lg border border-border bg-white dark:bg-black/30 px-3 py-2 text-xs font-mono"
            />
          )}

          {importError && (
            <div className="text-sm text-red-600 dark:text-red-400">{importError}</div>
          )}

          {importJourney && (
            <div className="text-xs text-secondary-foreground dark:text-muted-foreground">
              <b>Detectado:</b> {importJourney.boards.length} board(s){importJourney.name ? ` • ${importJourney.name}` : ''}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => void handleInstallImportedJourney()}
              disabled={!importJourney || isImporting}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${(!importJourney || isImporting)
                ? 'bg-accent dark:bg-white/10 text-muted-foreground cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}
            >
              <Download size={16} /> {isImporting ? 'Instalando…' : 'Instalar jornada'}
            </Button>
          </div>
        </div>
      )}

      {panel === 'export' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-foreground">
            Exportar template
          </div>
          <div className="text-xs text-muted-foreground dark:text-muted-foreground">
            Selecione 1 board (template simples) ou vários (jornada).
          </div>
        </div>
      )}

      {panel === 'export' && (
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4 bg-background/50 dark:bg-white/5">
            <div className="text-sm font-bold text-foreground">1) Baixar arquivo do template</div>
            <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
              Esse arquivo é o que você vai guardar/publicar na comunidade.
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">
                Nome (aparece na comunidade)
              </label>
              <input
                value={journeyName}
                onChange={e => { setJourneyName(e.target.value); setJourneyNameDirty(true); }}
                className="w-full rounded-lg border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-2">boards da jornada (ordem importa)</div>
              <div className="text-xs text-muted-foreground dark:text-muted-foreground mb-2">
                <b>Ordem que será exportada:</b> {selectedBoards.map(b => b.name).join(' → ') || '(nenhum)'}
              </div>
              <div className="rounded-lg border border-border bg-white dark:bg-white/5 p-2 max-h-64 overflow-auto space-y-1">
                {boards.map(b => {
                  const checked = selectedBoardIds.includes(b.id);
                  const isSelected = checked;
                  return (
                    <div key={b.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded-md hover:bg-background dark:hover:bg-white/10">
                      <label className="flex items-center gap-2 text-sm text-foreground dark:text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBoard(b.id)}
                        />
                        <span className="truncate">{b.name}</span>
                      </label>
                      {isSelected && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="unstyled"
                            type="button"
                            onClick={() => moveSelected(b.id, -1)}
                            className="p-1 rounded hover:bg-muted dark:hover:bg-white/10"
                            aria-label="Mover para cima"
                          >
                            <ArrowUp size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="unstyled"
                            type="button"
                            onClick={() => moveSelected(b.id, 1)}
                            className="p-1 rounded hover:bg-muted dark:hover:bg-white/10"
                            aria-label="Mover para baixo"
                          >
                            <ArrowDown size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={handleDownloadJourney}
                className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold flex items-center gap-2"
              >
                <Download size={16} /> Baixar arquivo
              </Button>
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={handleCopyJourneyJson}
                className="px-4 py-2 rounded-lg border border-border bg-white dark:bg-white/10 text-foreground dark:text-muted-foreground hover:bg-background dark:hover:bg-white/20 text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Copy size={16} /> Copiar arquivo (texto)
              </Button>
            </div>

            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setShowTechnicalDetails(v => !v)}
              className="mt-3 text-xs font-semibold text-secondary-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors"
            >
              {showTechnicalDetails ? 'Ocultar detalhes técnicos' : 'Mostrar detalhes técnicos'}
            </Button>

            {showTechnicalDetails && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">schemaVersion</label>
                    <input
                      value={schemaVersion}
                      onChange={e => setSchemaVersion(e.target.value)}
                      className="w-full rounded-lg border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">slug prefix (opcional)</label>
                    <input
                      value={slugPrefix}
                      onChange={e => setSlugPrefix(e.target.value)}
                      placeholder="ex: sales"
                      className="w-full rounded-lg border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-2">Preview (JSON)</div>
                  <pre className="text-xs whitespace-pre-wrap rounded-lg border border-border bg-white dark:bg-black/30 p-3 max-h-56 overflow-auto">
                    {journeyJsonText}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </Modal>
  );
}

