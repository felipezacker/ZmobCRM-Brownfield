import { useState, useCallback, useMemo, useEffect } from 'react';
import { parseCsv, detectCsvDelimiter, type CsvDelimiter } from '@/lib/utils/csv';
import { type ToastType } from '@/context/ToastContext';

type CustomFieldDef = { id: string; key: string; label: string; type: string };

type Panel = 'export' | 'import';
type WizardStep = 'upload' | 'mapping' | 'deal_mapping' | 'confirm';

export const WIZARD_STEPS: Array<{ key: WizardStep; label: string; num: number }> = [
  { key: 'upload', label: 'Arquivo', num: 1 },
  { key: 'mapping', label: 'Contatos', num: 2 },
  { key: 'deal_mapping', label: 'Negócios', num: 3 },
  { key: 'confirm', label: 'Confirmação', num: 4 },
];

export const DEAL_CRM_FIELDS: Array<{ value: string; label: string }> = [
  { value: 'deal_title', label: 'Título do negócio' },
  { value: 'deal_value', label: 'Valor' },
  { value: 'deal_type', label: 'Tipo (VENDA/LOCAÇÃO/PERMUTA)' },
  { value: 'deal_product', label: 'Produto' },
  { value: 'deal_activity', label: 'Nota/Atividade' },
  { value: '_ignore', label: 'Ignorar coluna' },
];

export const STATIC_CRM_FIELDS: Array<{ value: string; label: string }> = [
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

export const HEADER_SYNONYMS: Record<string, string[]> = {
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

export function normalizeHeaderStr(h: string): string {
  return (h || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function autoSuggestField(header: string): string {
  const norm = normalizeHeaderStr(header);
  for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS)) {
    for (const s of synonyms) {
      if (normalizeHeaderStr(s) === norm) return field;
    }
  }
  return '_ignore';
}

interface UseContactImportWizardParams {
  toast: ((message: string, type?: ToastType) => void) | undefined;
  isOpen: boolean;
  panel: Panel;
  delimiter: 'auto' | CsvDelimiter;
}

export function useContactImportWizard({ toast, isOpen, panel, delimiter }: UseContactImportWizardParams) {
  const [wizardStep, setWizardStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [ignoreHeader, setIgnoreHeader] = useState(false);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [resolvedDelimiter, setResolvedDelimiter] = useState<CsvDelimiter>(';');
  const [mode, setMode] = useState<'upsert' | 'skip_duplicates' | 'create_only'>('upsert');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);

  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [newCfLabel, setNewCfLabel] = useState('');
  const [showNewCfInput, setShowNewCfInput] = useState(false);

  const [enableDealMapping, setEnableDealMapping] = useState(false);
  const [boards, setBoards] = useState<Array<{ id: string; name: string; stages: Array<{ id: string; name: string }> }>>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [dealColumnMapping, setDealColumnMapping] = useState<Record<number, string>>({});

  // CL-1: List assignment on import
  const [importListId, setImportListId] = useState<string>('');
  const [availableLists, setAvailableLists] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [newListName, setNewListName] = useState('');

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

  // CL-1: Fetch available lists when import panel opens
  useEffect(() => {
    if (!isOpen || panel !== 'import') return;
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import('@/lib/supabase/client');
        if (!supabase) return;
        const { data } = await supabase
          .from('contact_lists')
          .select('id, name, color')
          .order('name');
        if (!cancelled && data) {
          setAvailableLists(data);
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [isOpen, panel]);

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

  const CRM_FIELDS = useMemo(() => {
    const cfOptions = customFieldDefs.map(cf => ({
      value: `cf_${cf.key}`,
      label: `[Personalizado] ${cf.label}`,
    }));
    const base = [...STATIC_CRM_FIELDS];
    const ignoreIdx = base.findIndex(f => f.value === '_ignore');
    base.splice(ignoreIdx, 0, ...cfOptions);
    return base;
  }, [customFieldDefs]);

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

  const resetWizard = useCallback(() => {
    setWizardStep('upload');
    setFile(null);
    setIgnoreHeader(false);
    setParsedHeaders([]);
    setParsedRows([]);
    setColumnMapping({});
    setImportResult(null);
    setEnableDealMapping(false);
    setSelectedBoardId('');
    setSelectedStageId('');
    setDealColumnMapping({});
    setBoards([]);
    setShowNewCfInput(false);
    setNewCfLabel('');
    setImportListId('');
    setNewListName('');
  }, []);

  const usedFields = useMemo(() => {
    const used = new Set<string>();
    for (const field of Object.values(columnMapping)) {
      if (field !== '_ignore') used.add(field);
    }
    return used;
  }, [columnMapping]);

  const hasDuplicates = useMemo(() => {
    const seen = new Set<string>();
    for (const field of Object.values(columnMapping)) {
      if (field === '_ignore') continue;
      if (seen.has(field)) return true;
      seen.add(field);
    }
    return false;
  }, [columnMapping]);

  const mappedFieldsSummary = useMemo(() => {
    return Object.entries(columnMapping)
      .filter(([, field]) => field !== '_ignore')
      .map(([colIdx, field]) => {
        const idx = parseInt(colIdx, 10);
        const header = parsedHeaders[idx] || `Coluna ${idx + 1}`;
        const crmLabel = CRM_FIELDS.find(f => f.value === field)?.label || field;
        return { header, crmLabel };
      });
  }, [columnMapping, parsedHeaders, CRM_FIELDS]);

  const previewRows = useMemo(() => parsedRows.slice(0, 5), [parsedRows]);

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

  const handleMappingChange = useCallback((colIdx: number, newField: string) => {
    setColumnMapping(prev => ({ ...prev, [colIdx]: newField }));
  }, []);

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

      // CL-1: If creating a new list inline, do it before import
      let resolvedListId = importListId;
      if (newListName.trim() && !importListId) {
        try {
          const { contactListsService } = await import('@/lib/supabase/contact-lists');
          const { supabase } = await import('@/lib/supabase/client');
          if (supabase) {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = user ? await supabase
              .from('profiles')
              .select('organization_id')
              .eq('id', user.id)
              .single() : { data: null };
            if (profile?.organization_id) {
              const { data: newList } = await contactListsService.create({
                name: newListName.trim(),
                organizationId: profile.organization_id,
                createdBy: user?.id,
              });
              if (newList) resolvedListId = newList.id;
            }
          }
        } catch { /* continue without list */ }
      }

      const res = await fetch('/api/contacts/import', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Falha ao importar (HTTP ${res.status})`);
      }

      // CL-1: Add imported contacts to list
      const allImportedIds = [
        ...((data?.importedContactIds as string[]) || []),
        ...((data?.reusedContactIds as string[]) || []),
      ];
      if (resolvedListId && allImportedIds.length > 0) {
        try {
          const { contactListsService } = await import('@/lib/supabase/contact-lists');
          await contactListsService.addContacts(resolvedListId, allImportedIds);
        } catch { /* list assignment failed but import succeeded */ }
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
  }, [file, mode, resolvedDelimiter, ignoreHeader, columnMapping, enableDealMapping, selectedBoardId, selectedStageId, dealColumnMapping, toast, importListId, newListName]);

  return {
    wizardStep, setWizardStep,
    file, setFile,
    ignoreHeader, setIgnoreHeader,
    parsedHeaders,
    parsedRows,
    columnMapping,
    resolvedDelimiter,
    mode, setMode,
    isImporting,
    importResult, setImportResult,
    customFieldDefs,
    newCfLabel, setNewCfLabel,
    showNewCfInput, setShowNewCfInput,
    enableDealMapping, setEnableDealMapping,
    boards,
    selectedBoardId, setSelectedBoardId,
    selectedStageId, setSelectedStageId,
    dealColumnMapping, setDealColumnMapping,
    CRM_FIELDS,
    usedFields,
    hasDuplicates,
    mappedFieldsSummary,
    previewRows,
    resetWizard,
    handleAdvanceToMapping,
    handleMappingChange,
    handleImport,
    handleCreateCustomField,
    // CL-1: List assignment
    importListId, setImportListId,
    availableLists,
    newListName, setNewListName,
  };
}
