import { useState, useMemo, useCallback } from 'react';
import { stringifyCsv, withUtf8Bom, type CsvDelimiter } from '@/lib/utils/csv';
import { type ToastType } from '@/context/ToastContext';

export type ContactsExportParams = {
  search?: string;
  stage?: string | 'ALL';
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'CHURNED' | 'RISK';
  dateStart?: string;
  dateEnd?: string;
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'stage' | 'owner_id' | 'source' | 'lead_score' | 'classification' | 'temperature' | 'status';
  sortOrder?: 'asc' | 'desc';
};

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

interface UseContactExportParams {
  toast: ((message: string, type?: ToastType) => void) | undefined;
  exportParams: ContactsExportParams;
  delimiter: 'auto' | CsvDelimiter;
}

export function useContactExport({ toast, exportParams, delimiter }: UseContactExportParams) {
  const [isExporting, setIsExporting] = useState(false);

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

  const handleDownloadTemplate = useCallback(() => {
    downloadText('template-contatos.csv', templateCsv, 'text/csv;charset=utf-8');
    toast?.('Template CSV baixado.', 'success');
  }, [templateCsv, toast]);

  const buildExportUrl = useCallback(() => {
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
  }, [exportParams, delimiter]);

  const handleExport = useCallback(async () => {
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
  }, [buildExportUrl, toast]);

  const handleDownloadErrorReport = useCallback((importResult: Record<string, unknown>, resolvedDelimiter: CsvDelimiter) => {
    const errs = (importResult?.errors || []) as Array<{ rowNumber: number; message: string }>;
    const d: CsvDelimiter = resolvedDelimiter;
    const rows = [['rowNumber', 'message'], ...errs.map(e => [String(e.rowNumber), e.message])];
    downloadText('import-erros-contatos.csv', withUtf8Bom(stringifyCsv(rows, d)), 'text/csv;charset=utf-8');
  }, []);

  return {
    isExporting,
    templateCsv,
    handleExport,
    handleDownloadTemplate,
    handleDownloadErrorReport,
    buildExportUrl,
  };
}
