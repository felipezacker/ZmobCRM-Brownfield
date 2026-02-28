import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { detectCsvDelimiter, parseCsv, type CsvDelimiter } from '@/lib/utils/csv';
import { normalizePhoneE164 } from '@/lib/phone';

const ImportModeSchema = z.enum(['create_only', 'upsert_by_email', 'skip_duplicates_by_email']);
type ImportMode = z.infer<typeof ImportModeSchema>;

function normalizeHeader(h: string) {
  return (h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

type ParsedRow = {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  stage?: string;
  notes?: string;
  cpf?: string;
  contactType?: string;
  classification?: string;
  temperature?: string;
  addressCep?: string;
  addressCity?: string;
  addressState?: string;
  birthDate?: string;
  source?: string;
  // lead_score is intentionally excluded — it's auto-calculated, not user-importable
  leadScore?: string;
};

const HEADER_SYNONYMS: Record<keyof ParsedRow, string[]> = {
  name: ['name', 'nome', 'nome completo', 'full name'],
  firstName: ['first name', 'firstname', 'primeiro nome', 'nome'],
  lastName: ['last name', 'lastname', 'sobrenome'],
  email: ['email', 'e-mail', 'e-mail address', 'mail'],
  phone: ['phone', 'telefone', 'celular', 'whatsapp', 'fone'],
  status: ['status'],
  stage: ['stage', 'etapa', 'lifecycle stage', 'ciclo de vida', 'pipeline stage'],
  notes: ['notes', 'nota', 'notas', 'observacoes', 'observações', 'obs'],
  cpf: ['cpf', 'cpf/cnpj', 'documento'],
  contactType: ['contact_type', 'tipo', 'tipo de contato', 'type'],
  classification: ['classification', 'classificacao', 'classificação', 'perfil'],
  temperature: ['temperature', 'temperatura', 'temp'],
  addressCep: ['address_cep', 'cep', 'zip', 'zipcode', 'codigo postal'],
  addressCity: ['address_city', 'city', 'cidade'],
  addressState: ['address_state', 'state', 'estado', 'uf'],
  birthDate: ['birth_date', 'birthdate', 'data de nascimento', 'nascimento', 'aniversario'],
  source: ['source', 'origem', 'canal', 'channel'],
  // lead_score appears in exports but is auto-calculated — silently ignored on import
  leadScore: ['lead_score', 'leadscore', 'lead score', 'score', 'pontuacao'],
};

function buildHeaderIndex(headers: string[]) {
  const idx = new Map<string, number>();
  headers.forEach((h, i) => idx.set(normalizeHeader(h), i));

  const find = (syns: string[]) => {
    for (const s of syns) {
      const key = normalizeHeader(s);
      const found = idx.get(key);
      if (found !== undefined) return found;
    }
    return undefined;
  };

  const mapping: Record<keyof ParsedRow, number | undefined> = {
    name: find(HEADER_SYNONYMS.name),
    firstName: find(HEADER_SYNONYMS.firstName),
    lastName: find(HEADER_SYNONYMS.lastName),
    email: find(HEADER_SYNONYMS.email),
    phone: find(HEADER_SYNONYMS.phone),
    status: find(HEADER_SYNONYMS.status),
    stage: find(HEADER_SYNONYMS.stage),
    notes: find(HEADER_SYNONYMS.notes),
    cpf: find(HEADER_SYNONYMS.cpf),
    contactType: find(HEADER_SYNONYMS.contactType),
    classification: find(HEADER_SYNONYMS.classification),
    temperature: find(HEADER_SYNONYMS.temperature),
    addressCep: find(HEADER_SYNONYMS.addressCep),
    addressCity: find(HEADER_SYNONYMS.addressCity),
    addressState: find(HEADER_SYNONYMS.addressState),
    birthDate: find(HEADER_SYNONYMS.birthDate),
    source: find(HEADER_SYNONYMS.source),
    leadScore: find(HEADER_SYNONYMS.leadScore),
  };

  return mapping;
}

const CRM_TO_PARSED: Record<string, keyof ParsedRow> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  cpf: 'cpf',
  contact_type: 'contactType',
  classification: 'classification',
  temperature: 'temperature',
  status: 'status',
  stage: 'stage',
  source: 'source',
  address_cep: 'addressCep',
  address_city: 'addressCity',
  address_state: 'addressState',
  birth_date: 'birthDate',
  notes: 'notes',
};

function buildManualMapping(manualMap: Record<string, string>): Record<keyof ParsedRow, number | undefined> {
  const mapping: Record<keyof ParsedRow, number | undefined> = {
    name: undefined, firstName: undefined, lastName: undefined,
    email: undefined, phone: undefined, status: undefined,
    stage: undefined, notes: undefined, cpf: undefined,
    contactType: undefined, classification: undefined,
    temperature: undefined, addressCep: undefined,
    addressCity: undefined, addressState: undefined,
    birthDate: undefined, source: undefined, leadScore: undefined,
  };
  for (const [colIdx, crmField] of Object.entries(manualMap)) {
    if (crmField === '_ignore') continue;
    const parsedKey = CRM_TO_PARSED[crmField];
    if (parsedKey) mapping[parsedKey] = parseInt(colIdx, 10);
  }
  return mapping;
}

function getCell(row: string[], idx: number | undefined): string | undefined {
  if (idx === undefined) return undefined;
  const v = row[idx];
  const t = (v ?? '').trim();
  return t ? t : undefined;
}

function normalizeStatus(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = normalizeHeader(v).toUpperCase();
  if (s === 'ACTIVE' || s === 'ATIVO') return 'ACTIVE';
  if (s === 'INACTIVE' || s === 'INATIVO') return 'INACTIVE';
  if (s === 'CHURNED' || s === 'PERDIDO' || s === 'CANCELADO') return 'CHURNED';
  return undefined;
}

function normalizeStage(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = normalizeHeader(v).toUpperCase();
  if (s === 'LEAD') return 'LEAD';
  if (s === 'MQL') return 'MQL';
  if (s === 'PROSPECT' || s === 'OPORTUNIDADE') return 'PROSPECT';
  if (s === 'CUSTOMER' || s === 'CLIENTE') return 'CUSTOMER';
  if (s === 'OTHER' || s === 'OUTRO' || s === 'OUTROS') return 'OTHER';
  return undefined;
}

const VALID_CLASSIFICATIONS = ['COMPRADOR', 'VENDEDOR', 'LOCATARIO', 'LOCADOR', 'INVESTIDOR', 'PERMUTANTE'];
function normalizeClassification(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = normalizeHeader(v).toUpperCase();
  if (VALID_CLASSIFICATIONS.includes(s)) return s;
  // Common synonyms
  if (s === 'BUYER' || s === 'COMPRADORA') return 'COMPRADOR';
  if (s === 'SELLER' || s === 'VENDEDORA') return 'VENDEDOR';
  if (s === 'TENANT' || s === 'INQUILINO' || s === 'LOCATARIA') return 'LOCATARIO';
  if (s === 'LANDLORD' || s === 'PROPRIETARIO' || s === 'LOCADORA') return 'LOCADOR';
  if (s === 'INVESTOR' || s === 'INVESTIDORA') return 'INVESTIDOR';
  return undefined;
}

function normalizeTemperature(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = normalizeHeader(v).toUpperCase();
  if (s === 'HOT' || s === 'QUENTE') return 'HOT';
  if (s === 'WARM' || s === 'MORNO') return 'WARM';
  if (s === 'COLD' || s === 'FRIO') return 'COLD';
  return undefined;
}

function normalizeContactType(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = normalizeHeader(v).toUpperCase();
  if (s === 'PF' || s === 'PESSOA FISICA' || s === 'PHYSICAL') return 'PF';
  if (s === 'PJ' || s === 'PESSOA JURIDICA' || s === 'LEGAL' || s === 'EMPRESA') return 'PJ';
  return undefined;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const modeRaw = form.get('mode');
    const delimiterRaw = form.get('delimiter');
    const modeResult = ImportModeSchema.safeParse(String(modeRaw ?? 'upsert_by_email'));
    if (!modeResult.success) {
      return NextResponse.json({ error: 'Parâmetro mode inválido.' }, { status: 400 });
    }
    const mode: ImportMode = modeResult.data;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo CSV não enviado (field "file").' }, { status: 400 });
    }

    const columnMappingRaw = form.get('columnMapping');
    const ignoreHeader = form.get('ignoreHeader') === 'true';

    const text = await file.text();
    const delimiter: CsvDelimiter =
      delimiterRaw === ',' || delimiterRaw === ';' || delimiterRaw === '\t'
        ? (delimiterRaw as CsvDelimiter)
        : detectCsvDelimiter(text);

    let { headers, rows } = parseCsv(text, delimiter);

    if (ignoreHeader) {
      // First line was parsed as header but is actually data — prepend it back
      rows = [headers, ...rows];
      headers = [];
    }

    let mapping: Record<keyof ParsedRow, number | undefined>;
    if (columnMappingRaw) {
      let manualMap: Record<string, string>;
      try {
        manualMap = JSON.parse(String(columnMappingRaw)) as Record<string, string>;
      } catch {
        return NextResponse.json({ error: 'columnMapping JSON inválido.' }, { status: 400 });
      }
      mapping = buildManualMapping(manualMap);
    } else {
      if (!headers.length) {
        return NextResponse.json({ error: 'CSV sem cabeçalho. Use mapeamento manual.' }, { status: 400 });
      }
      mapping = buildHeaderIndex(headers);
    }

    // Parse rows
    const parsed: Array<{ rowNumber: number; data: ParsedRow }> = [];
    const errors: Array<{ rowNumber: number; message: string }> = [];
    const dataRowOffset = ignoreHeader ? 1 : 2; // row number in original file

    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i];
      const rowNumber = i + dataRowOffset;

      const firstName = getCell(r, mapping.firstName);
      const lastName = getCell(r, mapping.lastName);
      const name = getCell(r, mapping.name);
      const email = getCell(r, mapping.email);
      const phone = getCell(r, mapping.phone);

      const computedName =
        (firstName || lastName)
          ? [firstName, lastName].filter(Boolean).join(' ').trim()
          : name;

      if (!computedName && !email) {
        errors.push({ rowNumber, message: 'Linha sem nome e sem email (não consigo criar contato).' });
        continue;
      }

      parsed.push({
        rowNumber,
        data: {
          name: computedName,
          email,
          phone,
          status: normalizeStatus(getCell(r, mapping.status)),
          stage: normalizeStage(getCell(r, mapping.stage)),
          notes: getCell(r, mapping.notes),
          cpf: getCell(r, mapping.cpf),
          contactType: normalizeContactType(getCell(r, mapping.contactType)),
          classification: normalizeClassification(getCell(r, mapping.classification)),
          temperature: normalizeTemperature(getCell(r, mapping.temperature)),
          addressCep: getCell(r, mapping.addressCep),
          addressCity: getCell(r, mapping.addressCity),
          addressState: getCell(r, mapping.addressState),
          birthDate: getCell(r, mapping.birthDate),
          source: getCell(r, mapping.source),
        },
      });
    }

    if (!parsed.length) {
      return NextResponse.json(
        {
          error: 'Nenhuma linha válida para importar.',
          errors,
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Existing contacts by email (batch)
    const emails = Array.from(
      new Set(
        parsed
          .map(p => (p.data.email || '').trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const contactIdsByEmail = new Map<string, string[]>();
    if (emails.length) {
      const chunkSize = 500;
      for (let i = 0; i < emails.length; i += chunkSize) {
        const chunk = emails.slice(i, i + chunkSize);
        const { data: existing, error: existingError } = await supabase
          .from('contacts')
          .select('id,email')
          .in('email', chunk)
          .is('deleted_at', null);

        if (existingError) {
          return NextResponse.json({ error: existingError.message }, { status: 400 });
        }
        for (const c of (existing || []) as Array<{ id: string; email: string | null }>) {
          const em = (c.email || '').toLowerCase().trim();
          if (!em) continue;
          const arr = contactIdsByEmail.get(em) || [];
          arr.push(c.id);
          contactIdsByEmail.set(em, arr);
        }
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Import in manageable chunks to reduce payload sizes
    const insertBatch: Array<{ rowNumber: number; payload: Record<string, unknown> }> = [];
    const flushInsert = async () => {
      if (!insertBatch.length) return;
      const payloads = insertBatch.map(i => i.payload);
      const { error: insertError } = await supabase.from('contacts').insert(payloads);
      if (insertError) {
        // If batch insert fails, mark all rows as errors (keep it simple for v1)
        for (const item of insertBatch) {
          errors.push({ rowNumber: item.rowNumber, message: insertError.message });
        }
      } else {
        created += insertBatch.length;
      }
      insertBatch.length = 0;
    };

    for (const p of parsed) {
      const rowNumber = p.rowNumber;
      const email = (p.data.email || '').trim().toLowerCase();
      const phoneE164 = p.data.phone ? normalizePhoneE164(p.data.phone) : undefined;

      const base: Record<string, unknown> = {
        name: p.data.name || '',
        email: p.data.email || null,
        phone: phoneE164 || null,
        notes: p.data.notes || null,
        status: p.data.status || 'ACTIVE',
        stage: p.data.stage || 'LEAD',
        updated_at: new Date().toISOString(),
      };
      // Epic 3 imob fields — only include if present in CSV
      if (p.data.cpf) base.cpf = p.data.cpf;
      if (p.data.contactType) base.contact_type = p.data.contactType;
      if (p.data.classification) base.classification = p.data.classification;
      if (p.data.temperature) base.temperature = p.data.temperature;
      if (p.data.addressCep) base.address_cep = p.data.addressCep;
      if (p.data.addressCity) base.address_city = p.data.addressCity;
      if (p.data.addressState) base.address_state = p.data.addressState;
      if (p.data.birthDate) base.birth_date = p.data.birthDate;
      if (p.data.source) base.source = p.data.source;

      const existingIds = email ? (contactIdsByEmail.get(email) || []) : [];

      if (mode === 'create_only') {
        // Always create, even if duplicates exist.
        insertBatch.push({ rowNumber, payload: base });
        if (insertBatch.length >= 200) await flushInsert();
        continue;
      }

      if (mode === 'skip_duplicates_by_email' && existingIds.length > 0) {
        skipped += 1;
        continue;
      }

      if (mode === 'upsert_by_email' && existingIds.length > 0) {
        if (existingIds.length > 1) {
          errors.push({ rowNumber, message: `Email duplicado no CRM (${existingIds.length} registros). Importação ambígua.` });
          continue;
        }
        const id = existingIds[0];
        const { error: updateError } = await supabase
          .from('contacts')
          .update(base)
          .eq('id', id);

        if (updateError) {
          errors.push({ rowNumber, message: updateError.message });
        } else {
          updated += 1;
        }
        continue;
      }

      // No email match (or no email): create
      insertBatch.push({ rowNumber, payload: base });
      if (insertBatch.length >= 200) await flushInsert();
    }

    await flushInsert();

    // Remove internal field from potential logs; not persisted in DB anyway (supabase ignores unknown)
    // but we keep it only in memory; ok.

    return NextResponse.json({
      ok: true,
      delimiter,
      mode,
      totals: {
        rows: rows.length,
        parsed: parsed.length,
        created,
        updated,
        skipped,
        errors: errors.length,
      },
      errors,
      detectedHeaders: headers,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error)?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}

