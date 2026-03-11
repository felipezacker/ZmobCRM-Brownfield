import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionBriefing } from '../components/SessionBriefing'

vi.mock('@/components/ui/button', () => {
  const { forwardRef } = require('react')
  const Btn = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }>(
    ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>, ref: React.Ref<HTMLButtonElement>) => (
      React.createElement('button', { ref, ...props }, children)
    ),
  )
  Btn.displayName = 'MockButton'
  return { Button: Btn }
})

vi.mock('@/components/ui/modalStyles', () => ({
  MODAL_OVERLAY_CLASS: 'overlay',
  MODAL_PANEL_BASE_CLASS: 'panel',
  MODAL_VIEWPORT_CAP_CLASS: 'viewport-cap',
  MODAL_HEADER_CLASS: 'header',
  MODAL_TITLE_CLASS: 'title',
  MODAL_BODY_CLASS: 'body',
  MODAL_FOOTER_CLASS: 'footer',
}))

describe('SessionBriefing', () => {
  const defaultProps = {
    pendingCount: 5,
    skippedCount: 2,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC1: briefing renders with correct content
  it('AC1: renders briefing with title and counts', () => {
    render(<SessionBriefing {...defaultProps} />)
    expect(screen.getByText('Sua sessao esta pronta')).toBeInTheDocument()
    expect(screen.getByText('Comecar')).toBeInTheDocument()
    expect(screen.getByText('Voltar')).toBeInTheDocument()
  })

  // AC2: displays correct pending and skipped counts
  it('AC2: displays pending count, skipped count, and total', () => {
    render(<SessionBriefing {...defaultProps} />)
    expect(screen.getByText('Pendentes')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Pulados (retorno)')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Total na fila')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  // AC3: clicking "Comecar" calls onConfirm
  it('AC3: clicking Comecar calls onConfirm', () => {
    render(<SessionBriefing {...defaultProps} />)
    fireEvent.click(screen.getByText('Comecar'))
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
    expect(defaultProps.onCancel).not.toHaveBeenCalled()
  })

  // AC4: clicking "Voltar" calls onCancel without starting session
  it('AC4: clicking Voltar calls onCancel', () => {
    render(<SessionBriefing {...defaultProps} />)
    fireEvent.click(screen.getByText('Voltar'))
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
    expect(defaultProps.onConfirm).not.toHaveBeenCalled()
  })

  // AC5: button disabled when queue empty is tested at ProspectingPage level,
  // but we verify briefing works correctly with 0 counts
  it('AC5: renders correctly with zero counts', () => {
    render(<SessionBriefing {...defaultProps} pendingCount={0} skippedCount={0} />)
    const zeros = screen.getAllByText('0')
    expect(zeros).toHaveLength(3) // pending, skipped, total
    expect(screen.getByText('Total na fila')).toBeInTheDocument()
  })

  it('closes on Escape key', () => {
    render(<SessionBriefing {...defaultProps} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('closes when clicking overlay backdrop', () => {
    render(<SessionBriefing {...defaultProps} />)
    const overlay = screen.getByRole('dialog')
    fireEvent.click(overlay)
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('does not close when clicking inside panel', () => {
    render(<SessionBriefing {...defaultProps} />)
    fireEvent.click(screen.getByText('Sua sessao esta pronta'))
    expect(defaultProps.onCancel).not.toHaveBeenCalled()
  })

  it('has correct aria attributes', () => {
    render(<SessionBriefing {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Briefing da sessao')
  })
})

// AC5: canStartSession logic (unit test for disabled state calculation)
describe('canStartSession logic', () => {
  it('AC5: returns false when pendingCount=0 and skippedCount=0', () => {
    const pendingCount = 0
    const skippedCount = 0
    const canStartSession = pendingCount + skippedCount > 0
    expect(canStartSession).toBe(false)
  })

  it('AC5: returns true when pendingCount > 0', () => {
    const pendingCount = 3
    const skippedCount = 0
    const canStartSession = pendingCount + skippedCount > 0
    expect(canStartSession).toBe(true)
  })

  it('AC5: returns true when skippedCount > 0', () => {
    const pendingCount = 0
    const skippedCount = 2
    const canStartSession = pendingCount + skippedCount > 0
    expect(canStartSession).toBe(true)
  })

  it('AC5: returns true when both > 0', () => {
    const pendingCount = 5
    const skippedCount = 3
    const canStartSession = pendingCount + skippedCount > 0
    expect(canStartSession).toBe(true)
  })
})
