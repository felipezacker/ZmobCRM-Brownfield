import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { detectCsvDelimiter, parseCsv, type CsvDelimiter } from '@/lib/utils/csv';
import { normalizePhoneE164 } from '@/lib/phone';
import { recalculateScore } from '@/lib/supabase/lead-scoring';

const ImportModeSchema = z.enum(['create_only', 'upsert', 'skip_duplicates', 'upsert_by_email', 'skip_duplicates_by_email']);
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
  tags?: string;
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
  tags: ['tags', 'tag', 'etiquetas', 'labels'],
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
    tags: find(HEADER_SYNONYMS.tags),
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
  tags: 'tags',
};

function buildManualMapping(manualMap: Record<string, string>): {
  mapping: Record<keyof ParsedRow, number | undefined>;
  customFieldMapping: Record<number, string>;
} {
  const mapping: Record<keyof ParsedRow, number | undefined> = {
    name: undefined, firstName: undefined, lastName: undefined,
    email: undefined, phone: undefined, status: undefined,
    stage: undefined, notes: undefined, cpf: undefined,
    contactType: undefined, classification: undefined,
    temperature: undefined, addressCep: undefined,
    addressCity: undefined, addressState: undefined,
    birthDate: undefined, source: undefined, tags: undefined,
    leadScore: undefined,
  };
  const customFieldMapping: Record<number, string> = {};
  for (const [colIdx, crmField] of Object.entries(manualMap)) {
    if (crmField === '_ignore') continue;
    if (crmField.startsWith('cf_')) {
      customFieldMapping[parseInt(colIdx, 10)] = crmField.slice(3); // strip cf_ prefix → key
      continue;
    }
    const parsedKey = CRM_TO_PARSED[crmField];
    if (parsedKey) mapping[parsedKey] = parseInt(colIdx, 10);
  }
  return { mapping, customFieldMapping };
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
    const dealConfigRaw = form.get('dealConfig');
    let dealConfig: { boardId: string; stageId: string; columnMapping: Record<string, string> } | null = null;
    if (dealConfigRaw) {
      try {
        dealConfig = JSON.parse(String(dealConfigRaw));
      } catch { /* ignore invalid */ }
    }

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
    let customFieldMapping: Record<number, string> = {};
    if (columnMappingRaw) {
      let manualMap: Record<string, string>;
      try {
        manualMap = JSON.parse(String(columnMappingRaw)) as Record<string, string>;
      } catch {
        return NextResponse.json({ error: 'columnMapping JSON inválido.' }, { status: 400 });
      }
      const result = buildManualMapping(manualMap);
      mapping = result.mapping;
      customFieldMapping = result.customFieldMapping;
    } else {
      if (!headers.length) {
        return NextResponse.json({ error: 'CSV sem cabeçalho. Use mapeamento manual.' }, { status: 400 });
      }
      mapping = buildHeaderIndex(headers);
    }

    // Parse rows
    const parsed: Array<{ rowNumber: number; data: ParsedRow; customFields: Record<string, string> }> = [];
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

      // Build custom fields from cf_* columns
      const cfData: Record<string, string> = {};
      for (const [colIdx, cfKey] of Object.entries(customFieldMapping)) {
        const val = getCell(r, parseInt(colIdx, 10));
        if (val) cfData[cfKey] = val;
      }

      parsed.push({
        rowNumber,
        customFields: cfData,
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
          tags: getCell(r, mapping.tags),
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

    // Get authenticated user's organization_id for RLS compliance
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Perfil sem organização associada.' }, { status: 400 });
    }
    const organizationId = profile.organization_id;

    // Normalize mode — accept legacy names for backwards compat
    const normalizedMode: 'create_only' | 'upsert' | 'skip_duplicates' =
      mode === 'upsert_by_email' ? 'upsert' :
        mode === 'skip_duplicates_by_email' ? 'skip_duplicates' :
          mode as 'create_only' | 'upsert' | 'skip_duplicates';

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

    // Existing contacts by phone (batch)
    const phones = Array.from(
      new Set(
        parsed
          .map(p => p.data.phone ? normalizePhoneE164(p.data.phone) : '')
          .filter(Boolean)
      )
    );

    const contactIdsByPhone = new Map<string, string[]>();
    if (phones.length) {
      const chunkSize = 500;
      for (let i = 0; i < phones.length; i += chunkSize) {
        const chunk = phones.slice(i, i + chunkSize);
        const { data: existing, error: existingError } = await supabase
          .from('contacts')
          .select('id,phone')
          .in('phone', chunk)
          .is('deleted_at', null);

        if (existingError) {
          return NextResponse.json({ error: existingError.message }, { status: 400 });
        }
        for (const c of (existing || []) as Array<{ id: string; phone: string | null }>) {
          const ph = (c.phone || '').trim();
          if (!ph) continue;
          const arr = contactIdsByPhone.get(ph) || [];
          arr.push(c.id);
          contactIdsByPhone.set(ph, arr);
        }
      }
    }

    // ── Tags: collect unique names, fetch existing, insert missing ──
    const allTagNames = new Set<string>();
    for (const p of parsed) {
      if (p.data.tags) {
        for (const t of p.data.tags.split(',')) {
          const name = t.trim();
          if (name) allTagNames.add(name);
        }
      }
    }

    if (allTagNames.size > 0) {
      const tagArray = Array.from(allTagNames);
      // Fetch existing tag names for this org
      const { data: existingTags } = await supabase
        .from('tags')
        .select('name')
        .eq('organization_id', organizationId)
        .in('name', tagArray);
      const existingNames = new Set((existingTags || []).map((t: { name: string }) => t.name));
      // Insert missing tags into registry
      const missing = tagArray.filter(n => !existingNames.has(n));
      if (missing.length > 0) {
        await supabase
          .from('tags')
          .insert(missing.map(name => ({ name, organization_id: organizationId })));
      }
    }

    // ── Custom field definitions: auto-create missing definitions ──
    const allCfKeys = new Set<string>();
    for (const p of parsed) {
      for (const k of Object.keys(p.customFields)) allCfKeys.add(k);
    }
    if (allCfKeys.size > 0) {
      const { data: existingDefs } = await supabase
        .from('custom_field_definitions')
        .select('key')
        .eq('organization_id', organizationId)
        .eq('entity_type', 'contact')
        .in('key', Array.from(allCfKeys));
      const existingKeys = new Set((existingDefs || []).map((d: { key: string }) => d.key));
      const missingKeys = Array.from(allCfKeys).filter(k => !existingKeys.has(k));
      if (missingKeys.length > 0) {
        await supabase
          .from('custom_field_definitions')
          .insert(missingKeys.map(key => ({
            key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            type: 'text',
            entity_type: 'contact',
            organization_id: organizationId,
          })));
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const importedContactIds: string[] = []; // track all created/updated IDs for lead score
    const rowToContactId = new Map<number, string>(); // rowNumber → contact ID (for deal creation)

    // Import in manageable chunks to reduce payload sizes
    const insertBatch: Array<{ rowNumber: number; payload: Record<string, unknown> }> = [];
    const flushInsert = async () => {
      if (!insertBatch.length) return;
      const payloads = insertBatch.map(i => i.payload);
      const { data: inserted, error: insertError } = await supabase
        .from('contacts')
        .insert(payloads)
        .select('id');
      if (insertError) {
        for (const item of insertBatch) {
          errors.push({ rowNumber: item.rowNumber, message: insertError.message });
        }
      } else {
        created += insertBatch.length;
        const insertedArr = (inserted || []) as Array<{ id: string }>;
        for (let idx = 0; idx < insertedArr.length; idx++) {
          importedContactIds.push(insertedArr[idx].id);
          rowToContactId.set(insertBatch[idx].rowNumber, insertedArr[idx].id);
        }
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
        organization_id: organizationId,
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

      // Tags → string[] of tag names
      if (p.data.tags) {
        const tagNames = p.data.tags.split(',').map(t => t.trim()).filter(Boolean);
        if (tagNames.length > 0) base.tags = tagNames;
      }

      // Custom fields → JSONB
      if (Object.keys(p.customFields).length > 0) {
        base.custom_fields = p.customFields;
      }

      // Union of existing IDs by email and phone
      const emailIds = email ? (contactIdsByEmail.get(email) || []) : [];
      const phoneIds = phoneE164 ? (contactIdsByPhone.get(phoneE164) || []) : [];
      const allMatchedIds = Array.from(new Set([...emailIds, ...phoneIds]));

      if (normalizedMode === 'create_only') {
        insertBatch.push({ rowNumber, payload: base });
        if (insertBatch.length >= 200) await flushInsert();
        continue;
      }

      if (normalizedMode === 'skip_duplicates' && allMatchedIds.length > 0) {
        skipped += 1;
        continue;
      }

      if (normalizedMode === 'upsert' && allMatchedIds.length > 0) {
        if (allMatchedIds.length > 1) {
          errors.push({ rowNumber, message: `Duplicado no CRM (${allMatchedIds.length} registros por email/telefone). Importação ambígua.` });
          continue;
        }
        const id = allMatchedIds[0];

        // Merge tags and custom_fields with existing data
        if (base.tags || base.custom_fields) {
          const { data: existing } = await supabase
            .from('contacts')
            .select('tags, custom_fields')
            .eq('id', id)
            .single();
          if (existing) {
            if (base.tags) {
              const existingTags = (existing.tags || []) as string[];
              base.tags = Array.from(new Set([...existingTags, ...(base.tags as string[])]));
            }
            if (base.custom_fields) {
              const existingCf = (existing.custom_fields || {}) as Record<string, unknown>;
              base.custom_fields = { ...existingCf, ...(base.custom_fields as Record<string, string>) };
            }
          }
        }

        const { error: updateError } = await supabase
          .from('contacts')
          .update(base)
          .eq('id', id);

        if (updateError) {
          errors.push({ rowNumber, message: updateError.message });
        } else {
          updated += 1;
          importedContactIds.push(id);
          rowToContactId.set(rowNumber, id);
        }
        continue;
      }

      // No match: create
      insertBatch.push({ rowNumber, payload: base });
      if (insertBatch.length >= 200) await flushInsert();
    }

    await flushInsert();

    // ── Lead score recalculation ──
    let scoresRecalculated = 0;
    let scoresQueued = false;

    if (importedContactIds.length > 200) {
      // Too many — skip inline recalc, suggest backfill
      scoresQueued = true;
    } else if (importedContactIds.length > 0) {
      const scoreBatchSize = 50;
      for (let i = 0; i < importedContactIds.length; i += scoreBatchSize) {
        const batch = importedContactIds.slice(i, i + scoreBatchSize);
        await Promise.all(
          batch.map(async (cid) => {
            const { error: scoreErr } = await recalculateScore(cid, organizationId, supabase);
            if (!scoreErr) scoresRecalculated++;
          })
        );
      }
    }

    // ── Deal creation ──
    let dealsCreated = 0;
    if (dealConfig && dealConfig.boardId && dealConfig.stageId) {
      const dealColMap = dealConfig.columnMapping || {};
      // Build deal field index from column mapping
      const dealFieldIdx: Record<string, number> = {};
      for (const [colIdx, field] of Object.entries(dealColMap)) {
        if (field && field !== '_ignore') {
          dealFieldIdx[field] = parseInt(colIdx, 10);
        }
      }

      // ── Product lookup/creation for deal_product column ──
      const productNameToId = new Map<string, string>();
      if (dealFieldIdx.deal_product !== undefined) {
        const allProductNames = new Set<string>();
        for (const p of parsed) {
          const row = rows[p.rowNumber - (ignoreHeader ? 1 : 2)] || [];
          const prodName = getCell(row, dealFieldIdx.deal_product);
          if (prodName) allProductNames.add(prodName);
        }
        if (allProductNames.size > 0) {
          const prodArray = Array.from(allProductNames);
          const { data: existingProducts } = await supabase
            .from('products')
            .select('id, name')
            .eq('organization_id', organizationId)
            .in('name', prodArray);
          for (const ep of (existingProducts || []) as Array<{ id: string; name: string }>) {
            productNameToId.set(ep.name, ep.id);
          }
          const missingProducts = prodArray.filter(n => !productNameToId.has(n));
          if (missingProducts.length > 0) {
            const productPrices = new Map<string, number>();
            for (const p of parsed) {
              const row = rows[p.rowNumber - (ignoreHeader ? 1 : 2)] || [];
              const prodName = getCell(row, dealFieldIdx.deal_product);
              if (prodName && missingProducts.includes(prodName)) {
                const valueStr = getCell(row, dealFieldIdx.deal_value);
                let val = 0;
                if (valueStr) {
                  const cleaned = valueStr.replace(/[^\d.,-]/g, '');
                  const lastComma = cleaned.lastIndexOf(',');
                  const lastDot = cleaned.lastIndexOf('.');
                  if (lastComma > lastDot) val = parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
                  else if (lastDot > lastComma) val = parseFloat(cleaned.replace(/,/g, '')) || 0;
                  else val = parseFloat(cleaned) || 0;
                }
                if (!productPrices.has(prodName) || val > (productPrices.get(prodName) || 0)) {
                  productPrices.set(prodName, val);
                }
              }
            }

            const { data: created, error: prodInsertErr } = await supabase
              .from('products')
              .insert(missingProducts.map(name => ({ name, price: productPrices.get(name) || 0, organization_id: organizationId })))
              .select('id, name');
            if (prodInsertErr) {
              errors.push({ rowNumber: 0, message: `Erro ao criar produtos: ${prodInsertErr.message}` });
            }
            for (const cp of (created || []) as Array<{ id: string; name: string }>) {
              productNameToId.set(cp.name, cp.id);
            }
          }
        }
      }

      // Create deals in batch
      const dealPayloads: Array<{ deal: Record<string, unknown>; activityNote?: string; productName?: string }> = [];
      for (const p of parsed) {
        const contactId = rowToContactId.get(p.rowNumber);
        if (!contactId) continue;

        const row = rows[p.rowNumber - (ignoreHeader ? 1 : 2)] || [];
        const title = getCell(row, dealFieldIdx.deal_title) || `Negócio — ${p.data.name || p.data.email || ''}`;
        const valueStr = getCell(row, dealFieldIdx.deal_value);
        let value = 0;
        if (valueStr) {
          const cleaned = valueStr.replace(/[^\d.,-]/g, '');
          const lastComma = cleaned.lastIndexOf(',');
          const lastDot = cleaned.lastIndexOf('.');
          if (lastComma > lastDot) {
            value = parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
          } else if (lastDot > lastComma) {
            value = parseFloat(cleaned.replace(/,/g, '')) || 0;
          } else {
            value = parseFloat(cleaned) || 0;
          }
        }
        const dealType = getCell(row, dealFieldIdx.deal_type) || 'VENDA';
        const activityNote = getCell(row, dealFieldIdx.deal_activity);
        const productName = getCell(row, dealFieldIdx.deal_product);

        dealPayloads.push({
          deal: {
            organization_id: organizationId,
            title,
            value,
            board_id: dealConfig.boardId,
            stage_id: dealConfig.stageId,
            contact_id: contactId,
            deal_type: dealType.toUpperCase(),
          },
          activityNote,
          productName,
        });
      }

      // Insert deals in batches of 200
      for (let i = 0; i < dealPayloads.length; i += 200) {
        const batch = dealPayloads.slice(i, i + 200);
        const { data: insertedDeals, error: dealError } = await supabase
          .from('deals')
          .insert(batch.map(d => d.deal))
          .select('id');

        if (dealError) {
          errors.push({ rowNumber: 0, message: `Erro ao criar negócios: ${dealError.message}` });
          continue;
        }
        if (insertedDeals) {
          dealsCreated += insertedDeals.length;

          // Create deal_items for deals that have a product
          const dealItemPayloads: Array<Record<string, unknown>> = [];
          for (let j = 0; j < batch.length; j++) {
            if (batch[j].productName && insertedDeals[j]) {
              const productId = productNameToId.get(batch[j].productName!);
              if (productId) {
                dealItemPayloads.push({
                  organization_id: organizationId,
                  deal_id: insertedDeals[j].id,
                  product_id: productId,
                  name: batch[j].productName,
                  quantity: 1,
                  price: (batch[j].deal.value as number) || 0,
                });
              }
            }
          }
          if (dealItemPayloads.length > 0) {
            const { error: itemError } = await supabase.from('deal_items').insert(dealItemPayloads);
            if (itemError) {
              errors.push({ rowNumber: 0, message: `Erro ao vincular produtos: ${itemError.message}` });
            }
          }

          // Create activities for deals that have notes
          const activityPayloads: Array<Record<string, unknown>> = [];
          for (let j = 0; j < batch.length; j++) {
            if (batch[j].activityNote && insertedDeals[j]) {
              activityPayloads.push({
                organization_id: organizationId,
                deal_id: insertedDeals[j].id,
                contact_id: batch[j].deal.contact_id,
                type: 'NOTE',
                title: 'Nota da importação',
                description: batch[j].activityNote,
                completed: true,
              });
            }
          }
          if (activityPayloads.length > 0) {
            const { error: activityError } = await supabase.from('activities').insert(activityPayloads);
            if (activityError) {
              errors.push({ rowNumber: 0, message: `Erro ao criar atividades: ${activityError.message}` });
            }
          }
        }
      }
    }

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
        scoresRecalculated,
        dealsCreated,
      },
      scoresQueued,
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

