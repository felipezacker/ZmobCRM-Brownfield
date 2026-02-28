import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Download, Upload, FileDown, ChevronLeft, ChevronRight, Check, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { stringifyCsv, withUtf8Bom, parseCsv, detectCsvDelimiter, type CsvDelimiter } from '@/lib/utils/csv';
import { Button } from '@/app/components/ui/Button';

type CustomFieldDef = { id: string; key: string; label: string; type: string };

type Panel = 'export' | 'import';
type WizardStep = 'upload' | 'mapping' | 'deal_mapping' | 'confirm';

export type ContactsExportParams = {
  search?: string;
  stage?: string | 'ALL';
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'CHURNED' | 'RISK';
  dateStart?: string;
  dateEnd?: string;
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'stage' | 'owner_id' | 'source' | 'lead_score';
  sortOrder?: 'asc' | 'desc';
};

/* ── Deal CRM fields for deal mapping step ── */
const DEAL_CRM_FIELDS: Array<{ value: string; label: string }> = [
  { value: 'deal_title', label: 'Título do negócio' },
  { value: 'deal_value', label: 'Valor' },
  { value: 'deal_type', label: 'Tipo (VENDA/LOCAÇÃO/PERMUTA)' },
  { value: 'deal_activity', label: 'Nota/Atividade' },
  { value: '_ignore', label: 'Ignorar coluna' },
];

/* ── CRM field options for mapping dropdown (static — custom fields appended at runtime) ── */
const STATIC_CRM_FIELDS: Array<{ value: string; label: string }> = [
  { value: 'name', label: 'Nome' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'cpf', label: 'CPF/CNPJ' },
  { value: 'contact_type', label: 'Tipo (PF/PJ)' },
  { value: 'classification', label: 'Classificação' },
  { value: 'temperature', label: 'Temperatura' },
  { value: 'status', label: 'Status' },
  { value: 'stage', label: 'Etapa' },
  { value: 'source', label: 'Origem' },
  { value: 'address_cep', label: 'CEP' },
  { value: 'address_city', label: 'Cidade' },
  { value: 'address_state', label: 'Estado' },
  { value: 'birth_date', label: 'Data de Nascimento' },
  { value: 'notes', label: 'Notas' },
  { value: 'tags', label: 'Tags (separadas por vírgula)' },
  { value: '_ignore', label: 'Ignorar coluna' },
];

/* ── Client-side header synonyms for auto-suggest (mirrors backend HEADER_SYNONYMS) ── */
const HEADER_SYNONYMS: Record<string, string[]> = {
  name: ['name', 'nome', 'nome completo', 'full name', 'first name', 'firstname', 'primeiro nome'],
  email: ['email', 'e-mail', 'e-mail address', 'mail'],
  phone: ['phone', 'telefone', 'celular', 'whatsapp', 'fone'],
  cpf: ['cpf', 'cpf/cnpj', 'documento'],
  contact_type: ['contact_type', 'tipo', 'tipo de contato', 'type'],
  classification: ['classification', 'classificacao', 'classificação', 'perfil'],
  temperature: ['temperature', 'temperatura', 'temp'],
  status: ['status'],
  stage: ['stage', 'etapa', 'lifecycle stage', 'ciclo de vida', 'pipeline stage'],
  source: ['source', 'origem', 'canal', 'channel'],
  address_cep: ['address_cep', 'cep', 'zip', 'zipcode', 'codigo postal'],
  address_city: ['address_city', 'city', 'cidade'],
  address_state: ['address_state', 'state', 'estado', 'uf'],
  birth_date: ['birth_date', 'birthdate', 'data de nascimento', 'nascimento', 'aniversario'],
  notes: ['notes', 'nota', 'notas', 'observacoes', 'observações', 'obs'],
  tags: ['tags', 'tag', 'etiquetas', 'labels'],
};

function normalizeHeaderStr(h: string): string {
  return (h || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function autoSuggestField(header: string): string {
  const norm = normalizeHeaderStr(header);
  for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS)) {
    for (const s of synonyms) {
      if (normalizeHeaderStr(s) === norm) return field;
    }
  }
  return '_ignore';
}

/* ── Helpers ── */
function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  try {
    requestAnimationFrame(() => {
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  } finally {
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

function parseFilenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;
  const m = /filename="([^"]+)"/i.exec(disposition);
  return m?.[1] || null;
}

/* ── Stepper ── */
const WIZARD_STEPS: Array<{ key: WizardStep; label: string; num: number }> = [
  { key: 'upload', label: 'Arquivo', num: 1 },
  { key: 'mapping', label: 'Contatos', num: 2 },
  { key: 'deal_mapping', label: 'Negócios', num: 3 },
  { key: 'confirm', label: 'Confirmação', num: 4 },
];

function WizardStepper({ step }: { step: WizardStep }) {
  const currentIdx = WIZARD_STEPS.findIndex(s => s.key === step);
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-4">
      {WIZARD_STEPS.map((s, i) => (
        <React.Fragment key={s.key}>
          {i > 0 && (
            <div
              className={`h-0.5 w-6 sm:w-10 ${
                i <= currentIdx ? 'bg-primary-500' : 'bg-slate-200 dark:bg-white/10'
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
                    : 'bg-slate-200 dark:bg-white/10 text-slate-400'
              }`}
            >
              {i < currentIdx ? <Check size={14} /> : s.num}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                i <= currentIdx ? 'text-slate-900 dark:text-white' : 'text-slate-400'
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
  exportParams: ContactsExportParams;
}) {
  const { isOpen, onClose, exportParams } = props;
  const { addToast, showToast } = useToast();
  const toast = addToast || showToast;

  const [panel, setPanel] = useState<Panel>('export');
  const [delimiter, setDelimiter] = useState<'auto' | CsvDelimiter>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [ignoreHeader, setIgnoreHeader] = useState(false);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [resolvedDelimiter, setResolvedDelimiter] = useState<CsvDelimiter>(';');
  const [mode, setMode] = useState<'upsert' | 'skip_duplicates' | 'create_only'>(
    'upsert'
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);

  // Custom field definitions
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [newCfLabel, setNewCfLabel] = useState('');
  const [showNewCfInput, setShowNewCfInput] = useState(false);

  // Deal mapping state
  const [enableDealMapping, setEnableDealMapping] = useState(false);
  const [boards, setBoards] = useState<Array<{ id: string; name: string; stages: Array<{ id: string; name: string }> }>>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [dealColumnMapping, setDealColumnMapping] = useState<Record<number, string>>({});

  // Fetch custom field definitions when opening import panel
  useEffect(() => {
    if (!isOpen || panel !== 'import') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/custom-fields?entity_type=contact');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setCustomFieldDefs(data);
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [isOpen, panel]);

  // Fetch boards + stages when entering deal_mapping step
  useEffect(() => {
    if (wizardStep !== 'deal_mapping' || boards.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/boards');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setBoards(data);
          if (data.length > 0) {
            setSelectedBoardId(data[0].id);
            if (data[0].stages?.length > 0) {
              setSelectedStageId(data[0].stages[0].id);
            }
          }
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [wizardStep, boards.length]);

  // Build CRM_FIELDS dynamically: static fields + custom fields
  const CRM_FIELDS = useMemo(() => {
    const cfOptions = customFieldDefs.map(cf => ({
      value: `cf_${cf.key}`,
      label: `[Personalizado] ${cf.label}`,
    }));
    // Insert custom fields before "_ignore" (last item)
    const base = [...STATIC_CRM_FIELDS];
    const ignoreIdx = base.findIndex(f => f.value === '_ignore');
    base.splice(ignoreIdx, 0, ...cfOptions);
    return base;
  }, [customFieldDefs]);

  // Handle creating a new custom field definition inline
  const handleCreateCustomField = useCallback(async () => {
    const label = newCfLabel.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    try {
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, label, type: 'text', entity_type: 'contact' }),
      });
      if (!res.ok) {
        toast?.('Erro ao criar campo personalizado.', 'error');
        return;
      }
      const created = await res.json();
      setCustomFieldDefs(prev => [...prev, created]);
      setNewCfLabel('');
      setShowNewCfInput(false);
      toast?.(`Campo "${label}" criado.`, 'success');
    } catch {
      toast?.('Erro ao criar campo personalizado.', 'error');
    }
  }, [newCfLabel, toast]);

  // Reset wizard when switching panels
  const handlePanelSwitch = useCallback((p: Panel) => {
    setPanel(p);
    if (p === 'import') {
      setWizardStep('upload');
      setFile(null);
      setIgnoreHeader(false);
      setParsedHeaders([]);
      setParsedRows([]);
      setColumnMapping({});
      setImportResult(null);
      // Reset deal state
      setEnableDealMapping(false);
      setSelectedBoardId('');
      setSelectedStageId('');
      setDealColumnMapping({});
      setBoards([]);
      // Reset custom field state
      setShowNewCfInput(false);
      setNewCfLabel('');
    }
  }, []);

  // Computed: fields already used (for duplicate validation)
  const usedFields = useMemo(() => {
    const used = new Set<string>();
    for (const field of Object.values(columnMapping)) {
      if (field !== '_ignore') used.add(field);
    }
    return used;
  }, [columnMapping]);

  // Computed: detect duplicate CRM field selections
  const hasDuplicates = useMemo(() => {
    const seen = new Set<string>();
    for (const field of Object.values(columnMapping)) {
      if (field === '_ignore') continue;
      if (seen.has(field)) return true;
      seen.add(field);
    }
    return false;
  }, [columnMapping]);

  // Computed: mapped fields summary for confirm step
  const mappedFieldsSummary = useMemo(() => {
    return Object.entries(columnMapping)
      .filter(([, field]) => field !== '_ignore')
      .map(([colIdx, field]) => {
        const idx = parseInt(colIdx, 10);
        const header = parsedHeaders[idx] || `Coluna ${idx + 1}`;
        const crmLabel = CRM_FIELDS.find(f => f.value === field)?.label || field;
        return { header, crmLabel };
      });
  }, [columnMapping, parsedHeaders]);

  const previewRows = useMemo(() => parsedRows.slice(0, 5), [parsedRows]);

  /* ── Step 1 → Step 2: parse CSV and auto-suggest ── */
  const handleAdvanceToMapping = useCallback(async () => {
    if (!file) return;
    try {
      const text = await file.text();
      const delim: CsvDelimiter =
        delimiter === 'auto' ? detectCsvDelimiter(text) : delimiter;
      const parsed = parseCsv(text, delim);

      let displayHeaders: string[];
      let displayRows: string[][];

      if (ignoreHeader) {
        displayRows = [parsed.headers, ...parsed.rows];
        displayHeaders = (displayRows[0] || []).map((_, i) => `Coluna ${i + 1}`);
      } else {
        displayHeaders = parsed.headers;
        displayRows = parsed.rows;
      }

      if (!displayHeaders.length) {
        toast?.('CSV vazio ou inválido.', 'error');
        return;
      }

      // Auto-suggest: match headers to CRM fields (skip if ignoreHeader)
      const initialMapping: Record<number, string> = {};
      const taken = new Set<string>();
      displayHeaders.forEach((h, i) => {
        if (!ignoreHeader) {
          const suggested = autoSuggestField(h);
          if (suggested !== '_ignore' && !taken.has(suggested)) {
            initialMapping[i] = suggested;
            taken.add(suggested);
          } else {
            initialMapping[i] = '_ignore';
          }
        } else {
          initialMapping[i] = '_ignore';
        }
      });

      setParsedHeaders(displayHeaders);
      setParsedRows(displayRows);
      setColumnMapping(initialMapping);
      setResolvedDelimiter(delim);
      setWizardStep('mapping');
    } catch {
      toast?.('Erro ao ler arquivo CSV.', 'error');
    }
  }, [file, delimiter, ignoreHeader, toast]);

  /* ── Mapping change handler with duplicate validation ── */
  const handleMappingChange = useCallback((colIdx: number, newField: string) => {
    setColumnMapping(prev => ({ ...prev, [colIdx]: newField }));
  }, []);

  /* ── Import with manual mapping ── */
  const handleImport = useCallback(async () => {
    setIsImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file!);
      fd.append('mode', mode);
      fd.append('delimiter', resolvedDelimiter);
      fd.append('ignoreHeader', String(ignoreHeader));
      fd.append('columnMapping', JSON.stringify(columnMapping));

      if (enableDealMapping && selectedBoardId && selectedStageId) {
        fd.append('dealConfig', JSON.stringify({
          boardId: selectedBoardId,
          stageId: selectedStageId,
          columnMapping: dealColumnMapping,
        }));
      }

      const res = await fetch('/api/contacts/import', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Falha ao importar (HTTP ${res.status})`);
      }
      setImportResult(data);
      const totals = data?.totals as Record<string, number> | undefined;
      const scoreMsg = data?.scoresQueued
        ? ' • Scores enfileirados (use backfill)'
        : (totals?.scoresRecalculated ?? 0) > 0
          ? ` • ${totals?.scoresRecalculated} scores recalculados`
          : '';
      const dealMsg = (totals?.dealsCreated ?? 0) > 0
        ? ` • ${totals?.dealsCreated} negócios criados`
        : '';
      toast?.(
        `Import concluído: ${totals?.created ?? 0} criados, ${totals?.updated ?? 0} atualizados, ${totals?.skipped ?? 0} ignorados, ${totals?.errors ?? 0} erros${dealMsg}${scoreMsg}.`,
        (totals?.errors ?? 0) > 0 ? 'warning' : 'success'
      );
    } catch (e) {
      toast?.((e as Error)?.message || 'Erro ao importar.', 'error');
    } finally {
      setIsImporting(false);
    }
  }, [file, mode, resolvedDelimiter, ignoreHeader, columnMapping, enableDealMapping, selectedBoardId, selectedStageId, dealColumnMapping, toast]);

  /* ── Export (unchanged) ── */
  const templateCsv = useMemo(() => {
    const d: CsvDelimiter = delimiter === 'auto' ? ';' : delimiter;
    const header = [
      'name', 'email', 'phone', 'cpf', 'contact_type', 'classification',
      'temperature', 'status', 'stage', 'source', 'address_cep',
      'address_city', 'address_state', 'birth_date', 'notes',
    ];
    const example = [
      'Maria Silva', 'maria@empresa.com', '+55 11 99999-9999', '123.456.789-00',
      'PF', 'COMPRADOR', 'HOT', 'ACTIVE', 'LEAD', 'Indicação',
      '01310-100', 'São Paulo', 'SP', '1985-03-15', 'Interessada em apartamento 3 quartos',
    ];
    return withUtf8Bom(stringifyCsv([header, example], d));
  }, [delimiter]);

  const handleDownloadTemplate = () => {
    downloadText('template-contatos.csv', templateCsv, 'text/csv;charset=utf-8');
    toast?.('Template CSV baixado.', 'success');
  };

  const handleDownloadErrorReport = () => {
    const errs = ((importResult as Record<string, unknown>)?.errors || []) as Array<{ rowNumber: number; message: string }>;
    const d: CsvDelimiter = resolvedDelimiter;
    const rows = [['rowNumber', 'message'], ...errs.map(e => [String(e.rowNumber), e.message])];
    downloadText('import-erros-contatos.csv', withUtf8Bom(stringifyCsv(rows, d)), 'text/csv;charset=utf-8');
  };

  const buildExportUrl = () => {
    const sp = new URLSearchParams();
    if (exportParams.search) sp.set('search', exportParams.search);
    if (exportParams.stage && exportParams.stage !== 'ALL') sp.set('stage', exportParams.stage);
    if (exportParams.status && exportParams.status !== 'ALL') sp.set('status', exportParams.status);
    if (exportParams.dateStart) sp.set('dateStart', exportParams.dateStart);
    if (exportParams.dateEnd) sp.set('dateEnd', exportParams.dateEnd);
    if (exportParams.sortBy) sp.set('sortBy', exportParams.sortBy);
    if (exportParams.sortOrder) sp.set('sortOrder', exportParams.sortOrder);
    if (delimiter !== 'auto') sp.set('delimiter', delimiter);
    return `/api/contacts/export?${sp.toString()}`;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const url = buildExportUrl();
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Falha ao exportar (HTTP ${res.status})`);
      }
      const disposition = res.headers.get('Content-Disposition');
      const filename = parseFilenameFromDisposition(disposition) || 'contatos.csv';
      const text = await res.text();
      downloadText(filename, text, 'text/csv;charset=utf-8');
      toast?.('Export iniciado.', 'success');
    } catch (e) {
      toast?.((e as Error)?.message || 'Erro ao exportar.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

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
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
            }`}
          >
            Exportar
          </Button>
          <Button
            type="button"
            onClick={() => handlePanelSwitch('import')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              panel === 'import'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
            }`}
          >
            Importar CSV
          </Button>
        </div>

        {/* Only show delimiter in export or upload step */}
        {(panel === 'export' || (panel === 'import' && wizardStep === 'upload')) && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Delimitador
            </label>
            <select
              value={delimiter}
              onChange={e => setDelimiter(e.target.value as 'auto' | CsvDelimiter)}
              className="text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 py-1"
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
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/50 dark:bg-white/5 space-y-3">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Exportar contatos (CSV)
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Padrão de mercado: exportar a lista respeitando filtros/pesquisa/ordenação atuais.
            </div>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300">
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
                ? 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
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
          <WizardStepper step={wizardStep} />

          {/* ── Step 1: Upload ── */}
          {wizardStep === 'upload' && (
            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/50 dark:bg-white/5 space-y-4">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  1. Selecionar arquivo
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Selecione o CSV e configure opções. Na próxima etapa você mapeará as colunas.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold flex items-center gap-2"
                >
                  <Download size={16} /> Baixar template
                </Button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Arquivo CSV
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => {
                    setFile(e.target.files?.[0] ?? null);
                    setImportResult(null);
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
                  {file && (
                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[300px]">
                      {file.name}
                    </span>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={ignoreHeader}
                  onChange={e => setIgnoreHeader(e.target.checked)}
                />
                <span>Ignorar cabeçalho (primeira linha é dado, não header)</span>
              </label>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => void handleAdvanceToMapping()}
                  disabled={!file}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                    !file
                      ? 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  Próximo <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Mapping ── */}
          {wizardStep === 'mapping' && (
            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/50 dark:bg-white/5 space-y-4">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  2. Mapear colunas
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Associe cada coluna do CSV a um campo do CRM. Campos detectados automaticamente
                  já estão pré-selecionados.
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 px-4">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr>
                      {parsedHeaders.map((h, i) => {
                        const currentField = columnMapping[i] || '_ignore';
                        const isDuplicate =
                          currentField !== '_ignore' &&
                          Object.entries(columnMapping).some(
                            ([idx, f]) => f === currentField && parseInt(idx, 10) !== i
                          );
                        return (
                          <th
                            key={i}
                            className="px-2 py-1 text-left align-top border-b border-slate-200 dark:border-white/10 min-w-[160px]"
                          >
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mb-1">
                              {h}
                            </div>
                            <select
                              value={currentField}
                              onChange={e => handleMappingChange(i, e.target.value)}
                              className={`w-full text-xs rounded border px-1.5 py-1 ${
                                isDuplicate
                                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                  : currentField === '_ignore'
                                    ? 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-400'
                                    : 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                              }`}
                              title={isDuplicate ? 'Campo já mapeado em outra coluna!' : undefined}
                            >
                              {CRM_FIELDS.map(f => {
                                const isUsedElsewhere =
                                  f.value !== '_ignore' &&
                                  f.value !== currentField &&
                                  usedFields.has(f.value);
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
                              <div className="text-[10px] text-red-500 mt-0.5">Duplicado!</div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri}>
                        {parsedHeaders.map((_, ci) => (
                          <td
                            key={ci}
                            className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-white/5 truncate max-w-[200px]"
                            title={row[ci] || ''}
                          >
                            {row[ci] || <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {parsedRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={parsedHeaders.length}
                          className="px-2 py-3 text-xs text-slate-400 text-center"
                        >
                          Nenhuma linha de dados encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                {parsedRows.length} linha(s) de dados • {parsedHeaders.length} coluna(s) •{' '}
                {mappedFieldsSummary.length} campo(s) mapeado(s)
              </div>

              {/* Inline new custom field creator */}
              <div className="flex items-center gap-2">
                {!showNewCfInput ? (
                  <Button
                    type="button"
                    onClick={() => setShowNewCfInput(true)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Novo campo personalizado
                  </Button>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Nome do campo"
                      value={newCfLabel}
                      onChange={e => setNewCfLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateCustomField()}
                      className="text-xs rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 py-1 w-40"
                    />
                    <Button
                      type="button"
                      onClick={() => void handleCreateCustomField()}
                      disabled={!newCfLabel.trim()}
                      className="text-xs px-2 py-1 rounded bg-primary-600 text-white disabled:opacity-50"
                    >
                      Criar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => { setShowNewCfInput(false); setNewCfLabel(''); }}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  onClick={() => setWizardStep('upload')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
                >
                  <ChevronLeft size={16} /> Voltar
                </Button>
                <Button
                  type="button"
                  onClick={() => setWizardStep('deal_mapping')}
                  disabled={mappedFieldsSummary.length === 0 || hasDuplicates}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                    mappedFieldsSummary.length === 0 || hasDuplicates
                      ? 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  Próximo <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Deal Mapping ── */}
          {wizardStep === 'deal_mapping' && (
            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/50 dark:bg-white/5 space-y-4">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  3. Criar negócios (opcional)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure se deseja criar negócios automaticamente para os contatos importados.
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={enableDealMapping}
                  onChange={e => setEnableDealMapping(e.target.checked)}
                />
                <span>Criar negócios para cada contato importado</span>
              </label>

              {enableDealMapping && (
                <div className="space-y-4 pl-1">
                  {/* Board + Stage selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Quadro (Board)
                      </label>
                      <select
                        value={selectedBoardId}
                        onChange={e => {
                          setSelectedBoardId(e.target.value);
                          const board = boards.find(b => b.id === e.target.value);
                          setSelectedStageId(board?.stages?.[0]?.id || '');
                        }}
                        className="w-full text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 py-1.5"
                      >
                        {boards.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Etapa (Stage)
                      </label>
                      <select
                        value={selectedStageId}
                        onChange={e => setSelectedStageId(e.target.value)}
                        className="w-full text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 py-1.5"
                      >
                        {(boards.find(b => b.id === selectedBoardId)?.stages || []).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Deal column mapping table */}
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                      Mapear colunas do CSV para campos de negócio
                    </div>
                    <div className="overflow-x-auto -mx-4 px-4">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr>
                            {parsedHeaders.map((h, i) => {
                              const currentDealField = dealColumnMapping[i] || '_ignore';
                              const isDealDup =
                                currentDealField !== '_ignore' &&
                                Object.entries(dealColumnMapping).some(
                                  ([idx, f]) => f === currentDealField && parseInt(idx, 10) !== i
                                );
                              return (
                              <th
                                key={i}
                                className="px-2 py-1 text-left align-top border-b border-slate-200 dark:border-white/10 min-w-[160px]"
                              >
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mb-1">
                                  {h}
                                </div>
                                <select
                                  value={currentDealField}
                                  onChange={e => setDealColumnMapping(prev => ({ ...prev, [i]: e.target.value }))}
                                  className={`w-full text-xs rounded border px-1.5 py-1 ${
                                    isDealDup
                                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                      : currentDealField === '_ignore'
                                        ? 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-400'
                                        : 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                  }`}
                                >
                                  {DEAL_CRM_FIELDS.map(f => {
                                    const dealUsedElsewhere =
                                      f.value !== '_ignore' &&
                                      f.value !== currentDealField &&
                                      Object.values(dealColumnMapping).includes(f.value);
                                    return (
                                      <option key={f.value} value={f.value} disabled={dealUsedElsewhere}>
                                        {f.label}{dealUsedElsewhere ? ' (já usado)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                                {isDealDup && (
                                  <div className="text-[10px] text-red-500 mt-0.5">Duplicado!</div>
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
                  onClick={() => setWizardStep('mapping')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
                >
                  <ChevronLeft size={16} /> Voltar
                </Button>
                <Button
                  type="button"
                  onClick={() => setWizardStep('confirm')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white"
                >
                  Próximo <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4: Confirm ── */}
          {wizardStep === 'confirm' && !importResult && (
            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/50 dark:bg-white/5 space-y-4">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  4. Confirmar importação
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Revise os campos mapeados e selecione o modo de tratamento de duplicados.
                </div>
              </div>

              {/* Mapping summary */}
              <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 p-3 space-y-1.5">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Campos mapeados ({mappedFieldsSummary.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {mappedFieldsSummary.map((m, i) => (
                    <div key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <span className="text-slate-400">{m.header}</span>
                      <span className="text-slate-300 dark:text-slate-500">→</span>
                      <span className="font-medium text-primary-700 dark:text-primary-300">
                        {m.crmLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                {parsedRows.length} linha(s) de dados serão processadas
                {ignoreHeader && ' • Cabeçalho ignorado'}
                {enableDealMapping && ' • Negócios serão criados'}
              </div>

              {enableDealMapping && (
                <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 p-3">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Criação de negócios
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Quadro: {boards.find(b => b.id === selectedBoardId)?.name || '—'} •{' '}
                    Etapa: {boards.find(b => b.id === selectedBoardId)?.stages?.find(s => s.id === selectedStageId)?.name || '—'}
                  </div>
                </div>
              )}

              {/* Duplicate mode */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Duplicados (match por email e/ou telefone)
                </div>
                <div className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="importMode"
                      checked={mode === 'upsert'}
                      onChange={() => setMode('upsert')}
                    />
                    Atualizar se existir (recomendado)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="importMode"
                      checked={mode === 'skip_duplicates'}
                      onChange={() => setMode('skip_duplicates')}
                    />
                    Ignorar linhas com email/telefone já existente
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="importMode"
                      checked={mode === 'create_only'}
                      onChange={() => setMode('create_only')}
                    />
                    Sempre criar (pode duplicar)
                  </label>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  onClick={() => setWizardStep('deal_mapping')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
                >
                  <ChevronLeft size={16} /> Voltar
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleImport()}
                  disabled={isImporting}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                    isImporting
                      ? 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  <Upload size={16} /> {isImporting ? 'Importando…' : 'Importar'}
                </Button>
              </div>
            </div>
          )}

          {/* ── Import result ── */}
          {importResult && (
            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/50 dark:bg-white/5 space-y-3">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Resultado da importação
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 p-3 space-y-2">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <b>Resumo:</b>{' '}
                  {(importResult.totals as Record<string, number> | undefined)?.created ?? 0} criados •{' '}
                  {(importResult.totals as Record<string, number> | undefined)?.updated ?? 0} atualizados •{' '}
                  {(importResult.totals as Record<string, number> | undefined)?.skipped ?? 0} ignorados •{' '}
                  {(importResult.totals as Record<string, number> | undefined)?.errors ?? 0} erros
                  {((importResult.totals as Record<string, number> | undefined)?.dealsCreated ?? 0) > 0 && (
                    <> • {(importResult.totals as Record<string, number> | undefined)?.dealsCreated} negócios criados</>
                  )}
                  {((importResult.totals as Record<string, number> | undefined)?.scoresRecalculated ?? 0) > 0 && (
                    <> • {(importResult.totals as Record<string, number> | undefined)?.scoresRecalculated} scores recalculados</>
                  )}
                  {Boolean(importResult.scoresQueued) && (
                    <> • Scores enfileirados (use backfill para recalcular)</>
                  )}
                </div>
                {((importResult.totals as Record<string, number> | undefined)?.errors ?? 0) > 0 && (
                  <Button
                    type="button"
                    onClick={handleDownloadErrorReport}
                    className="text-xs font-semibold text-primary-700 dark:text-primary-300 hover:underline w-fit"
                  >
                    Baixar relatório de erros (CSV)
                  </Button>
                )}
              </div>
              <Button
                type="button"
                onClick={() => {
                  setImportResult(null);
                  setWizardStep('upload');
                  setFile(null);
                }}
                className="px-3 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
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
