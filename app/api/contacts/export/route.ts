import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stringifyCsv, withUtf8Bom, type CsvDelimiter } from '@/lib/utils/csv';

type SortBy = 'name' | 'created_at' | 'updated_at' | 'stage' | 'owner_id' | 'source' | 'lead_score';
type SortOrder = 'asc' | 'desc';

function getParam(searchParams: URLSearchParams, key: string): string | undefined {
  const v = searchParams.get(key);
  return v && v.trim() ? v.trim() : undefined;
}

const VALID_SORT_BY: SortBy[] = ['name', 'created_at', 'updated_at', 'stage', 'owner_id', 'source', 'lead_score'];
function parseSortBy(v: string | undefined): SortBy {
  if (v && VALID_SORT_BY.includes(v as SortBy)) return v as SortBy;
  return 'created_at';
}

function parseSortOrder(v: string | undefined): SortOrder {
  return v === 'asc' ? 'asc' : 'desc';
}

/**
 * Handler HTTP `GET` deste endpoint (Next.js Route Handler).
 *
 * @param {Request} req - Objeto da requisição.
 * @returns {Promise<NextResponse<unknown>>} Retorna um valor do tipo `Promise<NextResponse<unknown>>`.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sp = url.searchParams;

    const search = getParam(sp, 'search');
    const stage = getParam(sp, 'stage');
    const status = getParam(sp, 'status');
    const dateStart = getParam(sp, 'dateStart');
    const dateEnd = getParam(sp, 'dateEnd');
    const delimiter = (getParam(sp, 'delimiter') as CsvDelimiter | undefined) || undefined;
    const sortBy = parseSortBy(getParam(sp, 'sortBy'));
    const sortOrder = parseSortOrder(getParam(sp, 'sortOrder'));

    const supabase = await createClient();

    const chunkSize = 1000;
    let page = 0;
    type ContactRow = {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      cpf?: string | null;
      contact_type?: string | null;
      classification?: string | null;
      temperature?: string | null;
      status?: string | null;
      stage?: string | null;
      source?: string | null;
      address_cep?: string | null;
      address_city?: string | null;
      address_state?: string | null;
      birth_date?: string | null;
      lead_score?: number | null;
      notes?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    let allContacts: Array<ContactRow> = [];

    // We'll fetch in chunks. For export, we don't rely on count to avoid expensive exact counts.
    // Stop when a chunk returns less than chunkSize.
    while (true) {
      const from = page * chunkSize;
      const to = from + chunkSize - 1;

      let q = supabase
        .from('contacts')
        .select(
          'id,name,email,phone,notes,status,stage,source,cpf,contact_type,classification,temperature,address_cep,address_city,address_state,birth_date,lead_score,created_at,updated_at,last_purchase_date'
        )
        .is('deleted_at', null);

      if (search) {
        // Sanitize search to prevent PostgREST filter injection (escape special chars)
        const safe = search.replace(/[%_.,()"'\\]/g, c => `\\${c}`);
        q = q.or(`name.ilike.%${safe}%,email.ilike.%${safe}%`);
      }
      if (stage && stage !== 'ALL') {
        q = q.eq('stage', stage);
      }
      if (status && status !== 'ALL') {
        if (status === 'RISK') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          q = q.eq('status', 'ACTIVE').lt('last_purchase_date', thirtyDaysAgo.toISOString());
        } else {
          q = q.eq('status', status);
        }
      }
      if (dateStart) q = q.gte('created_at', dateStart);
      if (dateEnd) q = q.lte('created_at', dateEnd);

      const { data, error } = await q
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const chunk = (data || []) as ContactRow[];
      allContacts = allContacts.concat(chunk);
      if (chunk.length < chunkSize) break;
      page += 1;
    }

    const header = [
      'name',
      'email',
      'phone',
      'cpf',
      'contact_type',
      'classification',
      'temperature',
      'status',
      'stage',
      'source',
      'address_cep',
      'address_city',
      'address_state',
      'birth_date',
      'lead_score',
      'notes',
      'created_at',
      'updated_at',
    ];

    const dataRows = allContacts.map(c => [
      c.name || '',
      c.email || '',
      c.phone || '',
      c.cpf || '',
      c.contact_type || '',
      c.classification || '',
      c.temperature || '',
      c.status || '',
      c.stage || '',
      c.source || '',
      c.address_cep || '',
      c.address_city || '',
      c.address_state || '',
      c.birth_date || '',
      c.lead_score != null ? String(c.lead_score) : '',
      c.notes || '',
      c.created_at || '',
      c.updated_at || '',
    ]);

    const d: CsvDelimiter = delimiter === ';' || delimiter === '\t' || delimiter === ',' ? delimiter : ',';
    const csv = withUtf8Bom(stringifyCsv([header, ...dataRows], d));

    const today = new Date().toISOString().slice(0, 10);
    const filename = `contatos-${today}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error)?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}

