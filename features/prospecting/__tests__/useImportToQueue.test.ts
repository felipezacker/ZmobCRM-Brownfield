import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useImportToQueue } from '../hooks/useImportToQueue'

// ── Mocks ──────────────────────────────────────────────

vi.mock('read-excel-file/browser', () => ({
  default: vi.fn(),
}))

vi.mock('@/lib/utils/csv', () => ({
  parseCsv: vi.fn(),
  detectCsvDelimiter: vi.fn().mockReturnValue(';'),
}))

vi.mock('@/lib/phone', () => ({
  normalizePhoneE164: vi.fn((input: string) => {
    if (!input) return ''
    // Simple mock: prefix with + and digits only
    const digits = input.replace(/\D/g, '')
    if (digits.length >= 10) return `+55${digits}`
    return input
  }),
  isE164: vi.fn((input: string) => /^\+[1-9]\d{1,14}$/.test(input || '')),
}))

vi.mock('@/features/contacts/hooks/useContactImportWizard', () => ({
  autoSuggestField: vi.fn((header: string) => {
    const lower = header.toLowerCase()
    if (lower.includes('nome') || lower === 'name') return 'name'
    if (lower.includes('telefone') || lower === 'phone') return 'phone'
    if (lower.includes('email')) return 'email'
    return '_ignore'
  }),
  STATIC_CRM_FIELDS: [
    { value: 'name', label: 'Nome' },
    { value: 'phone', label: 'Telefone' },
    { value: 'email', label: 'E-mail' },
    { value: 'tags', label: 'Tags' },
    { value: 'classification', label: 'Classificação' },
    { value: '_ignore', label: 'Ignorar coluna' },
  ],
  HEADER_SYNONYMS: {},
}))

vi.mock('@/features/prospecting/prospecting-config', () => ({
  PROSPECTING_CONFIG: { QUEUE_MAX_CONTACTS: 100 },
}))

// ── Helpers ──────────────────────────────────────────────

const { parseCsv } = await import('@/lib/utils/csv')
const mockParseCsv = vi.mocked(parseCsv)

function createMockFile(name: string, content: string, size?: number): File {
  const blob = new Blob([content], { type: 'text/csv' })
  const file = new File([blob], name, { type: 'text/csv' })
  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size })
  }
  return file
}

const mockAddBatch = vi.fn().mockResolvedValue(undefined)

describe('useImportToQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start in upload step', () => {
    const { result } = renderHook(() =>
      useImportToQueue({ currentQueueSize: 0, onAddBatchToQueue: mockAddBatch }),
    )
    expect(result.current.step).toBe('upload')
    expect(result.current.file).toBeNull()
  })

  it('should reject files exceeding 5MB', async () => {
    const { result } = renderHook(() =>
      useImportToQueue({ currentQueueSize: 0, onAddBatchToQueue: mockAddBatch }),
    )

    const bigFile = createMockFile('big.csv', 'a', 6 * 1024 * 1024)

    await act(async () => {
      await result.current.handleFileSelect(bigFile)
    })

    expect(result.current.error).toContain('5MB')
    expect(result.current.step).toBe('upload')
  })

  it('should reject unsupported file formats', async () => {
    const { result } = renderHook(() =>
      useImportToQueue({ currentQueueSize: 0, onAddBatchToQueue: mockAddBatch }),
    )

    const txtFile = new File(['data'], 'file.txt', { type: 'text/plain' })

    await act(async () => {
      await result.current.handleFileSelect(txtFile)
    })

    expect(result.current.error).toContain('Formato')
    expect(result.current.step).toBe('upload')
  })

  it('should reject files with more than 5000 rows', async () => {
    const rows = Array.from({ length: 5001 }, (_, i) => [`nome${i}`, `1199999${String(i).padStart(4, '0')}`, `e${i}@test.com`])
    mockParseCsv.mockReturnValue({
      headers: ['Nome', 'Telefone', 'Email'],
      rows,
    })

    const { result } = renderHook(() =>
      useImportToQueue({ currentQueueSize: 0, onAddBatchToQueue: mockAddBatch }),
    )

    const file = createMockFile('big.csv', 'content')

    await act(async () => {
      await result.current.handleFileSelect(file)
    })

    expect(result.current.error).toContain('5000')
    expect(result.current.step).toBe('upload')
  })

  it('should parse CSV and auto-suggest columns', async () => {
    mockParseCsv.mockReturnValue({
      headers: ['Nome', 'Telefone', 'Email'],
      rows: [['João', '11999990000', 'joao@test.com']],
    })

    const { result } = renderHook(() =>
      useImportToQueue({ currentQueueSize: 0, onAddBatchToQueue: mockAddBatch }),
    )

    const file = createMockFile('contacts.csv', 'Nome;Telefone;Email\nJoão;11999990000;joao@test.com')

    await act(async () => {
      await result.current.handleFileSelect(file)
    })

    expect(result.current.step).toBe('mapping')
    expect(result.current.parsed).toBeTruthy()
    expect(result.current.columnMapping[0]).toBe('name')
    expect(result.current.columnMapping[1]).toBe('phone')
    expect(result.current.columnMapping[2]).toBe('email')
  })

  it('should require phone column in mapping before preview', async () => {
    mockParseCsv.mockReturnValue({
      headers: ['Nome', 'Email'],
      rows: [['João', 'joao@test.com']],
    })

    const { result } = renderHook(() =>
      useImportToQueue({ currentQueueSize: 0, onAddBatchToQueue: mockAddBatch }),
    )

    await act(async () => {
      await result.current.handleFileSelect(createMockFile('test.csv', 'content'))
    })

    expect(result.current.step).toBe('mapping')

    act(() => {
      result.current.goToPreview()
    })

    expect(result.current.error).toContain('Telefone')
  })

  it('should validate phone numbers and split valid/invalid', async () => {
    mockParseCsv.mockReturnValue({
      headers: ['Nome', 'Telefone', 'Email'],
      rows: [
        ['João', '11999990000', 'joao@test.com'],
        ['Maria', '', 'maria@test.com'],
        ['Pedro', '123', 'pedro@test.com'],
      ],
    })

    const { result } = renderHook(() =>
      useImportToQueue({ currentQueueSize: 0, onAddBatchToQueue: mockAddBatch }),
    )

    await act(async () => {
      await result.current.handleFileSelect(createMockFile('test.csv', 'content'))
    })

    expect(result.current.step).toBe('mapping')

    act(() => {
      result.current.goToPreview()
    })

    expect(result.current.step).toBe('preview')
    // João has valid phone, Maria has no phone, Pedro has invalid phone
    expect(result.current.validCount).toBe(1)
    expect(result.current.invalidCount).toBe(2)
  })

  it('should reset all state', async () => {
    mockParseCsv.mockReturnValue({
      headers: ['Nome', 'Telefone'],
      rows: [['João', '11999990000']],
    })

    const { result } = renderHook(() =>
      useImportToQueue({ currentQueueSize: 0, onAddBatchToQueue: mockAddBatch }),
    )

    await act(async () => {
      await result.current.handleFileSelect(createMockFile('test.csv', 'content'))
    })

    expect(result.current.step).toBe('mapping')

    act(() => {
      result.current.reset()
    })

    expect(result.current.step).toBe('upload')
    expect(result.current.file).toBeNull()
    expect(result.current.parsed).toBeNull()
  })
})
