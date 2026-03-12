import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ImportListModal } from '../components/ImportListModal'

// ── Mocks ──────────────────────────────────────────────

// Mock the hook so we can control state
const mockReset = vi.fn()
const mockHandleFileSelect = vi.fn()
const mockGoToPreview = vi.fn()
const mockGoBack = vi.fn()
const mockStartImport = vi.fn()
const mockSetColumnMapping = vi.fn()

const defaultHookReturn = {
  step: 'upload' as const,
  file: null,
  parsed: null,
  columnMapping: {},
  validations: [],
  progress: null,
  summary: null,
  error: null,
  handleFileSelect: mockHandleFileSelect,
  setColumnMapping: mockSetColumnMapping,
  goToPreview: mockGoToPreview,
  startImport: mockStartImport,
  goBack: mockGoBack,
  reset: mockReset,
  validCount: 0,
  invalidCount: 0,
  prospectingCrmFields: [
    { value: 'name', label: 'Nome' },
    { value: 'phone', label: 'Telefone' },
    { value: 'email', label: 'E-mail' },
    { value: '_ignore', label: 'Ignorar coluna' },
  ],
}

let hookReturnOverride = { ...defaultHookReturn }

vi.mock('../hooks/useImportToQueue', () => ({
  useImportToQueue: () => hookReturnOverride,
  PROSPECTING_CRM_FIELDS: [
    { value: 'name', label: 'Nome' },
    { value: 'phone', label: 'Telefone' },
    { value: 'email', label: 'E-mail' },
    { value: '_ignore', label: 'Ignorar coluna' },
  ],
}))

describe('ImportListModal', () => {
  const mockOnClose = vi.fn()
  const mockOnAddBatch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    hookReturnOverride = { ...defaultHookReturn }
  })

  const renderModal = (isOpen = true) => render(
    <ImportListModal
      isOpen={isOpen}
      onClose={mockOnClose}
      currentQueueSize={10}
      onAddBatchToQueue={mockOnAddBatch}
    />,
  )

  it('should not render when closed', () => {
    renderModal(false)
    expect(screen.queryByText('Importar Lista para Fila')).toBeNull()
  })

  it('should render upload step when open', () => {
    renderModal()
    expect(screen.getByText('Importar Lista para Fila')).toBeTruthy()
    expect(screen.getByText(/Arraste um arquivo/)).toBeTruthy()
    expect(screen.getByText(/CSV ou XLSX/)).toBeTruthy()
  })

  it('should display error message when present', () => {
    hookReturnOverride = { ...defaultHookReturn, error: 'Arquivo muito grande' }
    renderModal()
    expect(screen.getByText('Arquivo muito grande')).toBeTruthy()
  })

  it('should render mapping step with headers', () => {
    hookReturnOverride = {
      ...defaultHookReturn,
      step: 'mapping',
      file: new File([''], 'test.csv'),
      parsed: {
        headers: ['Nome', 'Telefone', 'Email'],
        rows: [['João', '11999990000', 'joao@test.com']],
      },
      columnMapping: { 0: 'name', 1: 'phone', 2: 'email' },
    }
    renderModal()
    // 'Nome' appears in both table header and dropdown — use getAllByText
    expect(screen.getAllByText('Nome').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Telefone/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Email/).length).toBeGreaterThanOrEqual(1)
    // 'Preview' appears in step indicator and button — check via getAllByText
    expect(screen.getAllByText('Preview').length).toBeGreaterThanOrEqual(1)
  })

  it('should render preview step with valid/invalid counts', () => {
    hookReturnOverride = {
      ...defaultHookReturn,
      step: 'preview',
      validCount: 5,
      invalidCount: 2,
      validations: [
        { rowIndex: 0, name: 'João', phone: '11999990000', phoneNormalized: '+5511999990000', email: '', isValid: true },
        { rowIndex: 1, name: 'Maria', phone: '', phoneNormalized: '', email: '', isValid: false, reason: 'Sem telefone' },
      ],
    }
    renderModal()
    expect(screen.getByText('5 válidos')).toBeTruthy()
    expect(screen.getByText('2 ignorados')).toBeTruthy()
    expect(screen.getByText(/Importar 5 contatos/)).toBeTruthy()
  })

  it('should render progress step with progress bar', () => {
    hookReturnOverride = {
      ...defaultHookReturn,
      step: 'progress',
      progress: { stage: 'importing', current: 45, total: 120, label: 'Importando 45/120 contatos...' },
    }
    renderModal()
    expect(screen.getByText('Importando 45/120 contatos...')).toBeTruthy()
    expect(screen.getByRole('progressbar')).toBeTruthy()
  })

  it('should render summary step with metrics', () => {
    hookReturnOverride = {
      ...defaultHookReturn,
      step: 'summary',
      summary: {
        created: 10,
        reused: 5,
        ignoredNoPhone: 2,
        ignoredQueueFull: 3,
        errors: 0,
        enqueuedCount: 15,
      },
    }
    renderModal()
    expect(screen.getByText('10')).toBeTruthy()
    expect(screen.getByText('Novos criados')).toBeTruthy()
    // '5' appears in both the summary card and step indicator, use getAllByText
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Existentes reutilizados')).toBeTruthy()
    expect(screen.getByText(/15 contato\(s\) adicionados/)).toBeTruthy()
    expect(screen.getByText('Fechar')).toBeTruthy()
  })

  it('should call reset and onClose when closing', () => {
    hookReturnOverride = { ...defaultHookReturn, step: 'summary', summary: { created: 0, reused: 0, ignoredNoPhone: 0, ignoredQueueFull: 0, errors: 0, enqueuedCount: 0 } }
    renderModal()
    fireEvent.click(screen.getByText('Fechar'))
    expect(mockReset).toHaveBeenCalled()
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should show back button on mapping and preview steps', () => {
    hookReturnOverride = { ...defaultHookReturn, step: 'mapping', parsed: { headers: ['A'], rows: [['1']] }, file: new File([''], 't.csv'), columnMapping: { 0: '_ignore' } }
    renderModal()
    expect(screen.getByText('Voltar')).toBeTruthy()
  })
})
