import { Contact } from '@/types';

/**
 * Exporta contatos para CSV com BOM UTF-8 para compatibilidade com Excel.
 * Story 3.5 — AC11: Export CSV com todos os campos visiveis.
 *
 * @param contacts - Array de contatos a exportar.
 * @param profilesMap - Mapa de ID do profile para nome (para coluna Responsavel).
 */
export function exportContactsCsv(
  contacts: Contact[],
  profilesMap?: Map<string, string>
): void {
  const headers = [
    'Nome',
    'Email',
    'Telefone',
    'Classificacao',
    'Temperatura',
    'Tipo',
    'Origem',
    'Responsavel',
    'Estagio',
    'Status',
    'Criado',
  ];

  const rows = contacts.map(c => [
    c.name || '',
    c.email || '',
    c.phone || '',
    c.classification || '',
    c.temperature || '',
    c.contactType || '',
    c.source || '',
    profilesMap?.get(c.ownerId || '') || '',
    c.stage || '',
    c.status || '',
    c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '',
  ]);

  const escapeCsvCell = (cell: string): string => {
    const str = (cell || '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const csv = [headers, ...rows]
    .map(row => row.map(escapeCsvCell).join(','))
    .join('\n');

  // BOM + CSV content for Excel UTF-8 compatibility
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contatos_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
