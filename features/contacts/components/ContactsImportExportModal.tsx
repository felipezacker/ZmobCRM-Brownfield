import React, { useState, useCallback, useRef } from 'react';
import { Download, Upload, FileDown, ChevronLeft, ChevronRight, Check, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { type CsvDelimiter } from '@/lib/utils/csv';
import { Button } from '@/components/ui/button';
import { useContactImportWizard, WIZARD_STEPS, DEAL_CRM_FIELDS } from '@/features/contacts/hooks/useContactImportWizard';
import { useContactExport } from '@/features/contacts/hooks/useContactExport';

type Panel = 'export' | 'import';
type WizardStep = 'upload' | 'mapping' | 'deal_mapping' | 'confirm';

export type { ContactsExportParams } from '@/features/contacts/hooks/useContactExport';

/* ── Stepper ── */
function WizardStepper({ step }: { step: WizardStep }) {
  const currentIdx = WIZARD_STEPS.findIndex(s => s.key === step);
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-4">
      {WIZARD_STEPS.map((s, i) => (
        <React.Fragment key={s.key}>
          {i > 0 && (
            <div
              className={`h-0.5 w-6 sm:w-10 ${
                i <= currentIdx ? 'bg-primary-500' : 'bg-accent dark:bg-white/10'
              }`}
            />
          )}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i < currentIdx
                  ? 'bg-primary-500 text-white'
                  : i === currentIdx
                    ? 'bg-primary-600 text-white ring-2 ring-primary-300'
                    : 'bg-accent dark:bg-white/10 text-muted-foreground'
              }`}
            >
              {i < currentIdx ? <Check size={14} /> : s.num}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                i <= currentIdx ? 'text-foreground ' : 'text-muted-foreground'
              }`}
            >
              {s.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── Main component ── */
export function ContactsImportExportModal(props: {
  isOpen: boolean;
  onClose: () => void;
  exportParams: import('@/features/contacts/hooks/useContactExport').ContactsExportParams;
}) {
  const { isOpen, onClose, exportParams } = props;
  const { addToast, showToast } = useToast();
  const toast = addToast || showToast;

  const [panel, setPanel] = useState<Panel>('export');
  const [delimiter, setDelimiter] = useState<'auto' | CsvDelimiter>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wizard = useContactImportWizard({ toast, isOpen, panel, delimiter });
  const {
    isExporting,
    handleExport,
    handleDownloadTemplate,
    handleDownloadErrorReport,
  } = useContactExport({ toast, exportParams, delimiter });

  const handlePanelSwitch = useCallback((p: Panel) => {
    setPanel(p);
    if (p === 'import') {
      wizard.resetWizard();
    }
  }, [wizard]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar / Exportar contatos"
      size="5xl"
      bodyClassName="space-y-5 max-h-[75vh] overflow-y-auto"
    >
      {/* Panel selector + delimiter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => handlePanelSwitch('export')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              panel === 'export'
                ? 'bg-foreground dark:bg-white text-background dark:text-gray-900 border-foreground dark:border-white'
                : 'bg-white dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground border-border  hover:bg-background dark:hover:bg-white/10'
            }`}
          >
            Exportar
          </Button>
          <Button
            type="button"
            onClick={() => handlePanelSwitch('import')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              panel === 'import'
                ? 'bg-foreground dark:bg-white text-background dark:text-gray-900 border-foreground dark:border-white'
                : 'bg-white dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground border-border  hover:bg-background dark:hover:bg-white/10'
            }`}
          >
            Importar CSV
          </Button>
        </div>

        {/* Only show delimiter in export or upload step */}
        {(panel === 'export' || (panel === 'import' && wizard.wizardStep === 'upload')) && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground">
              Delimitador
            </label>
            <select
              value={delimiter}
              onChange={e => setDelimiter(e.target.value as 'auto' | CsvDelimiter)}
              className="text-sm rounded-lg border border-border bg-white dark:bg-white/5 px-2 py-1"
            >
              <option value="auto">Auto</option>
              <option value=",">, (vírgula)</option>
              <option value=";">; (ponto e vírgula)</option>
              <option value={'\t'}>TAB</option>
            </select>
          </div>
        )}
      </div>

      {/* ═══════════════ EXPORT PANEL ═══════════════ */}
      {panel === 'export' && (
        <div className="rounded-xl border border-border p-4 bg-background/50 dark:bg-white/5 space-y-3">
          <div>
            <div className="text-sm font-bold text-foreground">
              Exportar contatos (CSV)
            </div>
            <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
              Padrão de mercado: exportar a lista respeitando filtros/pesquisa/ordenação atuais.
            </div>
          </div>
          <div className="text-xs text-secondary-foreground dark:text-muted-foreground">
            <b>Campos exportados:</b> name, email, phone, cpf, contact_type, classification,
            temperature, status, stage, source, address_cep, address_city, address_state,
            birth_date, lead_score, notes, created_at, updated_at.
          </div>
          <Button
            type="button"
            onClick={() => void handleExport()}
            disabled={isExporting}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
              isExporting
                ? 'bg-accent dark:bg-white/10 text-muted-foreground cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            <FileDown size={16} /> {isExporting ? 'Gerando…' : 'Exportar CSV'}
          </Button>
        </div>
      )}

      {/* ═══════════════ IMPORT WIZARD ═══════════════ */}
      {panel === 'import' && (
        <div className="space-y-4">
          <WizardStepper step={wizard.wizardStep} />

          {/* ── Step 1: Upload ── */}
          {wizard.wizardStep === 'upload' && (
            <div className="rounded-xl border border-border p-4 bg-background/50 dark:bg-white/5 space-y-4">
              <div>
                <div className="text-sm font-bold text-foreground">
                  1. Selecionar arquivo
                </div>
                <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                  Selecione o CSV e configure opções. Na próxima etapa você mapeará as colunas.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-2 rounded-lg bg-foreground dark:bg-white text-background dark:text-gray-900 text-sm font-semibold flex items-center gap-2"
                >
                  <Download size={16} /> Baixar template
                </Button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-secondary-foreground dark:text-muted-foreground">
                  Arquivo CSV
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => {
                    wizard.setFile(e.target.files?.[0] ?? null);
                    wizard.setImportResult(null);
                  }}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    <Upload size={16} /> Selecionar arquivo
                  </Button>
                  {wizard.file && (
                    <span className="text-sm text-secondary-foreground dark:text-muted-foreground truncate max-w-[300px]">
                      {wizard.file.name}
                    </span>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-secondary-foreground dark:text-muted-foreground">
                <input
                  type="checkbox"
                  checked={wizard.ignoreHeader}
                  onChange={e => wizard.setIgnoreHeader(e.target.checked)}
                />
                <span>Ignorar cabeçalho (primeira linha é dado, não header)</span>
              </label>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => void wizard.handleAdvanceToMapping()}
                  disabled={!wizard.file}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                    !wizard.file
                      ? 'bg-accent dark:bg-white/10 text-muted-foreground cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  Próximo <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Mapping ── */}
          {wizard.wizardStep === 'mapping' && (
            <div className="rounded-xl border border-border p-4 bg-background/50 dark:bg-white/5 space-y-4">
              <div>
                <div className="text-sm font-bold text-foreground">
                  2. Mapear colunas
                </div>
                <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                  Associe cada coluna do CSV a um campo do CRM. Campos detectados automaticamente
                  já estão pré-selecionados.
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 px-4">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr>
                      {wizard.parsedHeaders.map((h, i) => {
                        const currentField = wizard.columnMapping[i] || '_ignore';
                        const isDuplicate =
                          currentField !== '_ignore' &&
                          Object.entries(wizard.columnMapping).some(
                            ([idx, f]) => f === currentField && parseInt(idx, 10) !== i
                          );
                        return (
                          <th
                            key={i}
                            className="px-2 py-1 text-left align-top border-b border-border min-w-[160px]"
                          >
                            <div className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground truncate mb-1">
                              {h}
                            </div>
                            <select
                              value={currentField}
                              onChange={e => wizard.handleMappingChange(i, e.target.value)}
                              className={`w-full text-xs rounded border px-1.5 py-1 ${
                                isDuplicate
                                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                  : currentField === '_ignore'
                                    ? 'border-border  bg-muted dark:bg-white/5 text-muted-foreground'
                                    : 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                              }`}
                              title={isDuplicate ? 'Campo já mapeado em outra coluna!' : undefined}
                            >
                              {wizard.CRM_FIELDS.map(f => {
                                const isUsedElsewhere =
                                  f.value !== '_ignore' &&
                                  f.value !== currentField &&
                                  wizard.usedFields.has(f.value);
                                return (
                                  <option
                                    key={f.value}
                                    value={f.value}
                                    disabled={isUsedElsewhere}
                                  >
                                    {f.label}{isUsedElsewhere ? ' (já usado)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                            {isDuplicate && (
                              <div className="text-2xs text-red-500 mt-0.5">Duplicado!</div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {wizard.previewRows.map((row, ri) => (
                      <tr key={ri}>
                        {wizard.parsedHeaders.map((_, ci) => (
                          <td
                            key={ci}
                            className="px-2 py-1 text-xs text-secondary-foreground dark:text-muted-foreground border-b border-border truncate max-w-[200px]"
                            title={row[ci] || ''}
                          >
                            {row[ci] || <span className="text-muted-foreground dark:text-secondary-foreground">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {wizard.parsedRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={wizard.parsedHeaders.length}
                          className="px-2 py-3 text-xs text-muted-foreground text-center"
                        >
                          Nenhuma linha de dados encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                {wizard.parsedRows.length} linha(s) de dados • {wizard.parsedHeaders.length} coluna(s) •{' '}
                {wizard.mappedFieldsSummary.length} campo(s) mapeado(s)
              </div>

              {/* Inline new custom field creator */}
              <div className="flex items-center gap-2">
                {!wizard.showNewCfInput ? (
                  <Button
                    type="button"
                    onClick={() => wizard.setShowNewCfInput(true)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Novo campo personalizado
                  </Button>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Nome do campo"
                      value={wizard.newCfLabel}
                      onChange={e => wizard.setNewCfLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && wizard.handleCreateCustomField()}
                      className="text-xs rounded border border-border bg-white dark:bg-white/5 px-2 py-1 w-40"
                    />
                    <Button
                      type="button"
                      onClick={() => void wizard.handleCreateCustomField()}
                      disabled={!wizard.newCfLabel.trim()}
                      className="text-xs px-2 py-1 rounded bg-primary-600 text-white disabled:opacity-50"
                    >
                      Criar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => { wizard.setShowNewCfInput(false); wizard.setNewCfLabel(''); }}
                      className="text-xs text-muted-foreground hover:text-secondary-foreground"
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  onClick={() => wizard.setWizardStep('upload')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-white dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground border border-border hover:bg-background dark:hover:bg-white/10"
                >
                  <ChevronLeft size={16} /> Voltar
                </Button>
                <Button
                  type="button"
                  onClick={() => wizard.setWizardStep('deal_mapping')}
                  disabled={wizard.mappedFieldsSummary.length === 0 || wizard.hasDuplicates}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                    wizard.mappedFieldsSummary.length === 0 || wizard.hasDuplicates
                      ? 'bg-accent dark:bg-white/10 text-muted-foreground cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  Próximo <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Deal Mapping ── */}
          {wizard.wizardStep === 'deal_mapping' && (
            <div className="rounded-xl border border-border p-4 bg-background/50 dark:bg-white/5 space-y-4">
              <div>
                <div className="text-sm font-bold text-foreground">
                  3. Criar negócios (opcional)
                </div>
                <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                  Configure se deseja criar negócios automaticamente para os contatos importados.
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-secondary-foreground dark:text-muted-foreground">
                <input
                  type="checkbox"
                  checked={wizard.enableDealMapping}
                  onChange={e => wizard.setEnableDealMapping(e.target.checked)}
                />
                <span>Criar negócios para cada contato importado</span>
              </label>

              {wizard.enableDealMapping && (
                <div className="space-y-4 pl-1">
                  {/* Board + Stage selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">
                        Quadro (Board)
                      </label>
                      <select
                        value={wizard.selectedBoardId}
                        onChange={e => {
                          wizard.setSelectedBoardId(e.target.value);
                          const board = wizard.boards.find(b => b.id === e.target.value);
                          wizard.setSelectedStageId(board?.stages?.[0]?.id || '');
                        }}
                        className="w-full text-sm rounded-lg border border-border bg-white dark:bg-white/5 px-2 py-1.5"
                      >
                        {wizard.boards.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">
                        Etapa (Stage)
                      </label>
                      <select
                        value={wizard.selectedStageId}
                        onChange={e => wizard.setSelectedStageId(e.target.value)}
                        className="w-full text-sm rounded-lg border border-border bg-white dark:bg-white/5 px-2 py-1.5"
                      >
                        {(wizard.boards.find(b => b.id === wizard.selectedBoardId)?.stages || []).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Deal column mapping table */}
                  <div>
                    <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-2">
                      Mapear colunas do CSV para campos de negócio
                    </div>
                    <div className="overflow-x-auto -mx-4 px-4">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr>
                            {wizard.parsedHeaders.map((h, i) => {
                              const currentDealField = wizard.dealColumnMapping[i] || '_ignore';
                              const isDealDup =
                                currentDealField !== '_ignore' &&
                                Object.entries(wizard.dealColumnMapping).some(
                                  ([idx, f]) => f === currentDealField && parseInt(idx, 10) !== i
                                );
                              return (
                              <th
                                key={i}
                                className="px-2 py-1 text-left align-top border-b border-border min-w-[160px]"
                              >
                                <div className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground truncate mb-1">
                                  {h}
                                </div>
                                <select
                                  value={currentDealField}
                                  onChange={e => wizard.setDealColumnMapping(prev => ({ ...prev, [i]: e.target.value }))}
                                  className={`w-full text-xs rounded border px-1.5 py-1 ${
                                    isDealDup
                                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                      : currentDealField === '_ignore'
                                        ? 'border-border  bg-muted dark:bg-white/5 text-muted-foreground'
                                        : 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                  }`}
                                >
                                  {DEAL_CRM_FIELDS.map(f => {
                                    const dealUsedElsewhere =
                                      f.value !== '_ignore' &&
                                      f.value !== currentDealField &&
                                      Object.values(wizard.dealColumnMapping).includes(f.value);
                                    return (
                                      <option key={f.value} value={f.value} disabled={dealUsedElsewhere}>
                                        {f.label}{dealUsedElsewhere ? ' (já usado)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                                {isDealDup && (
                                  <div className="text-2xs text-red-500 mt-0.5">Duplicado!</div>
                                )}
                              </th>
                              );
                            })}
                          </tr>
                        </thead>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button
                  type="button"
                  onClick={() => wizard.setWizardStep('mapping')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-white dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground border border-border hover:bg-background dark:hover:bg-white/10"
                >
                  <ChevronLeft size={16} /> Voltar
                </Button>
                <Button
                  type="button"
                  onClick={() => wizard.setWizardStep('confirm')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white"
                >
                  Próximo <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4: Confirm ── */}
          {wizard.wizardStep === 'confirm' && !wizard.importResult && (
            <div className="rounded-xl border border-border p-4 bg-background/50 dark:bg-white/5 space-y-4">
              <div>
                <div className="text-sm font-bold text-foreground">
                  4. Confirmar importação
                </div>
                <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                  Revise os campos mapeados e selecione o modo de tratamento de duplicados.
                </div>
              </div>

              {/* Mapping summary */}
              <div className="rounded-lg border border-border bg-white dark:bg-black/30 p-3 space-y-1.5">
                <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-2">
                  Campos mapeados ({wizard.mappedFieldsSummary.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {wizard.mappedFieldsSummary.map((m, i) => (
                    <div key={i} className="text-xs text-secondary-foreground dark:text-muted-foreground flex items-center gap-1">
                      <span className="text-muted-foreground">{m.header}</span>
                      <span className="text-muted-foreground dark:text-muted-foreground">→</span>
                      <span className="font-medium text-primary-700 dark:text-primary-300">
                        {m.crmLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                {wizard.parsedRows.length} linha(s) de dados serão processadas
                {wizard.ignoreHeader && ' • Cabeçalho ignorado'}
                {wizard.enableDealMapping && ' • Negócios serão criados'}
              </div>

              {wizard.enableDealMapping && (
                <div className="rounded-lg border border-border bg-white dark:bg-black/30 p-3">
                  <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">
                    Criação de negócios
                  </div>
                  <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Quadro: {wizard.boards.find(b => b.id === wizard.selectedBoardId)?.name || '—'} •{' '}
                    Etapa: {wizard.boards.find(b => b.id === wizard.selectedBoardId)?.stages?.find(s => s.id === wizard.selectedStageId)?.name || '—'}
                  </div>
                </div>
              )}

              {/* CL-1: List assignment */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground">
                  Vincular a lista (opcional)
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={wizard.importListId}
                    onChange={e => { wizard.setImportListId(e.target.value); wizard.setNewListName(''); }}
                    className="flex-1 text-sm rounded-lg border border-border bg-white dark:bg-white/5 px-2 py-1.5"
                  >
                    <option value="">Nenhuma lista</option>
                    {wizard.availableLists.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  {!wizard.importListId && (
                    <input
                      type="text"
                      placeholder="Ou criar nova lista..."
                      value={wizard.newListName}
                      onChange={e => wizard.setNewListName(e.target.value)}
                      className="flex-1 text-sm rounded-lg border border-border bg-white dark:bg-white/5 px-2 py-1.5"
                    />
                  )}
                </div>
              </div>

              {/* Duplicate mode */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground">
                  Duplicados (match por email e/ou telefone)
                </div>
                <div className="flex flex-col gap-2 text-sm text-secondary-foreground dark:text-muted-foreground">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="importMode"
                      checked={wizard.mode === 'upsert'}
                      onChange={() => wizard.setMode('upsert')}
                    />
                    Atualizar se existir (recomendado)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="importMode"
                      checked={wizard.mode === 'skip_duplicates'}
                      onChange={() => wizard.setMode('skip_duplicates')}
                    />
                    Ignorar linhas com email/telefone já existente
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="importMode"
                      checked={wizard.mode === 'create_only'}
                      onChange={() => wizard.setMode('create_only')}
                    />
                    Sempre criar (pode duplicar)
                  </label>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  onClick={() => wizard.setWizardStep('deal_mapping')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-white dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground border border-border hover:bg-background dark:hover:bg-white/10"
                >
                  <ChevronLeft size={16} /> Voltar
                </Button>
                <Button
                  type="button"
                  onClick={() => void wizard.handleImport()}
                  disabled={wizard.isImporting}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                    wizard.isImporting
                      ? 'bg-accent dark:bg-white/10 text-muted-foreground cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  <Upload size={16} /> {wizard.isImporting ? 'Importando…' : 'Importar'}
                </Button>
              </div>
            </div>
          )}

          {/* ── Import result ── */}
          {wizard.importResult && (
            <div className="rounded-xl border border-border p-4 bg-background/50 dark:bg-white/5 space-y-3">
              <div className="text-sm font-bold text-foreground">
                Resultado da importação
              </div>
              <div className="rounded-lg border border-border bg-white dark:bg-black/30 p-3 space-y-2">
                <div className="text-xs text-secondary-foreground dark:text-muted-foreground">
                  <b>Resumo:</b>{' '}
                  {(wizard.importResult.totals as Record<string, number> | undefined)?.created ?? 0} criados •{' '}
                  {(wizard.importResult.totals as Record<string, number> | undefined)?.updated ?? 0} atualizados •{' '}
                  {(wizard.importResult.totals as Record<string, number> | undefined)?.skipped ?? 0} ignorados •{' '}
                  {(wizard.importResult.totals as Record<string, number> | undefined)?.errors ?? 0} erros
                  {((wizard.importResult.totals as Record<string, number> | undefined)?.dealsCreated ?? 0) > 0 && (
                    <> • {(wizard.importResult.totals as Record<string, number> | undefined)?.dealsCreated} negócios criados</>
                  )}
                  {((wizard.importResult.totals as Record<string, number> | undefined)?.scoresRecalculated ?? 0) > 0 && (
                    <> • {(wizard.importResult.totals as Record<string, number> | undefined)?.scoresRecalculated} scores recalculados</>
                  )}
                  {Boolean(wizard.importResult.scoresQueued) && (
                    <> • Scores enfileirados (use backfill para recalcular)</>
                  )}
                </div>
                {((wizard.importResult.totals as Record<string, number> | undefined)?.errors ?? 0) > 0 && (
                  <Button
                    type="button"
                    onClick={() => handleDownloadErrorReport(wizard.importResult!, wizard.resolvedDelimiter)}
                    className="text-xs font-semibold text-primary-700 dark:text-primary-300 hover:underline w-fit"
                  >
                    Baixar relatório de erros (CSV)
                  </Button>
                )}
              </div>
              <Button
                type="button"
                onClick={() => {
                  wizard.setImportResult(null);
                  wizard.setWizardStep('upload');
                  wizard.setFile(null);
                }}
                className="px-3 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground border border-border hover:bg-background dark:hover:bg-white/10"
              >
                Nova importação
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
