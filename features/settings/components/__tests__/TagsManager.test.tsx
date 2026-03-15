import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TAG_COLOR_PALETTE, getTagTextColor } from '../TagsManager'

const mockAddTag = vi.fn()
const mockRemoveTag = vi.fn()
const mockRenameTag = vi.fn()
const mockUpdateTagColor = vi.fn()
const mockUpdateTagDescription = vi.fn()
let mockAvailableTags: Array<{ name: string; color: string | null; description: string | null }> = []

vi.mock('@/context/settings/SettingsContext', () => ({
  useSettings: () => ({
    availableTags: mockAvailableTags,
    addTag: mockAddTag,
    removeTag: mockRemoveTag,
    renameTag: mockRenameTag,
    updateTagColor: mockUpdateTagColor,
    updateTagDescription: mockUpdateTagDescription,
  }),
}))

const { TagsManager } = await import('../TagsManager')

describe('TagsManager (table layout)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAvailableTags = []
  })

  it('renderiza tag na tabela com nome visivel', () => {
    mockAvailableTags = [{ name: 'VIP', color: '#ef4444', description: null }]
    render(<TagsManager />)

    expect(screen.getByText('VIP')).toBeInTheDocument()
  })

  it('renderiza bolinha de cor com backgroundColor correto', () => {
    mockAvailableTags = [{ name: 'VIP', color: '#ef4444', description: null }]
    const { container } = render(<TagsManager />)

    const dot = container.querySelector('span[style*="background-color"]')
    expect(dot).toHaveStyle({ backgroundColor: '#ef4444' })
  })

  it('tag sem cor usa default #6b7280 na bolinha', () => {
    mockAvailableTags = [{ name: 'Lead', color: null, description: null }]
    const { container } = render(<TagsManager />)

    const dot = container.querySelector('span[style*="background-color"]')
    expect(dot).toHaveStyle({ backgroundColor: '#6b7280' })
  })

  it('tag com cor vazia string usa default #6b7280', () => {
    mockAvailableTags = [{ name: 'Legacy', color: '' as unknown as null, description: null }]
    const { container } = render(<TagsManager />)

    const dot = container.querySelector('span[style*="background-color"]')
    expect(dot).toHaveStyle({ backgroundColor: '#6b7280' })
  })

  it('mostra descricao quando presente', () => {
    mockAvailableTags = [{ name: 'VIP', color: null, description: 'Clientes premium' }]
    render(<TagsManager />)

    expect(screen.getByText('Clientes premium')).toBeInTheDocument()
  })

  it('mostra traco quando sem descricao', () => {
    mockAvailableTags = [{ name: 'VIP', color: null, description: null }]
    render(<TagsManager />)

    // The table cell shows "—" for null description
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('renderiza busca e botao Nova Tag', () => {
    render(<TagsManager />)

    expect(screen.getByPlaceholderText('Buscar tag...')).toBeInTheDocument()
    expect(screen.getByText('Nova Tag')).toBeInTheDocument()
  })

  it('renderiza footer com contagem', () => {
    mockAvailableTags = [
      { name: 'A', color: null, description: null },
      { name: 'B', color: null, description: null },
    ]
    render(<TagsManager />)

    expect(screen.getByText('2 de 2 tags')).toBeInTheDocument()
  })

  it('TAG_COLOR_PALETTE tem exatamente 12 cores', () => {
    expect(TAG_COLOR_PALETTE).toHaveLength(12)
  })
})

describe('getTagTextColor', () => {
  it('retorna texto escuro para amarelo (#eab308)', () => {
    expect(getTagTextColor('#eab308')).toBe('#1e293b')
  })

  it('retorna texto escuro para lima (#a3e635)', () => {
    expect(getTagTextColor('#a3e635')).toBe('#1e293b')
  })

  it('retorna texto branco para azul (#3b82f6)', () => {
    expect(getTagTextColor('#3b82f6')).toBe('#fff')
  })

  it('retorna texto branco para vermelho (#ef4444)', () => {
    expect(getTagTextColor('#ef4444')).toBe('#fff')
  })

  it('retorna texto branco para default cinza (#6b7280)', () => {
    expect(getTagTextColor('#6b7280')).toBe('#fff')
  })
})
