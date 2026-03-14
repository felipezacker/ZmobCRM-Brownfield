import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { useDashboardLayout } from '../hooks/useDashboardLayout'
import { EditableSectionWrapper } from '../components/EditableSectionWrapper'

// --- Mock @dnd-kit ---

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: (arr: string[], from: number, to: number) => {
    const result = [...arr]
    const [item] = result.splice(from, 1)
    result.splice(to, 0, item)
    return result
  },
  useSortable: () => ({
    attributes: { role: 'button', tabIndex: 0 },
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: { toString: () => undefined },
  },
}))

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

// --- localStorage mock ---

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get _store() { return store },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const DEFAULT_ORDER = ['section-a', 'section-b', 'section-c', 'section-d']
const USER_ID = 'user-123'

describe('useDashboardLayout', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('returns default order when no saved layout', () => {
    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    expect(result.current.sectionOrder).toEqual(DEFAULT_ORDER)
    expect(result.current.hiddenSections.size).toBe(0)
    expect(result.current.isEditing).toBe(false)
  })

  it('returns default order when userId is undefined', () => {
    const { result } = renderHook(() => useDashboardLayout(undefined, DEFAULT_ORDER))

    expect(result.current.sectionOrder).toEqual(DEFAULT_ORDER)
    expect(result.current.hiddenSections.size).toBe(0)
  })

  it('loads saved layout from localStorage', () => {
    const saved = {
      version: 1,
      sectionOrder: ['section-c', 'section-a', 'section-b', 'section-d'],
      hiddenSections: ['section-b'],
    }
    localStorageMock.setItem(`prospecting_dashboard_layout_${USER_ID}`, JSON.stringify(saved))

    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    expect(result.current.sectionOrder).toEqual(['section-c', 'section-a', 'section-b', 'section-d'])
    expect(result.current.hiddenSections.has('section-b')).toBe(true)
    expect(result.current.hiddenSections.size).toBe(1)
  })

  it('merges new sections not in saved layout', () => {
    const saved = {
      version: 1,
      sectionOrder: ['section-b', 'section-a'],
      hiddenSections: [],
    }
    localStorageMock.setItem(`prospecting_dashboard_layout_${USER_ID}`, JSON.stringify(saved))

    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    // section-b and section-a from saved, then section-c and section-d appended
    expect(result.current.sectionOrder).toEqual(['section-b', 'section-a', 'section-c', 'section-d'])
  })

  it('removes sections from saved layout that no longer exist in default', () => {
    const saved = {
      version: 1,
      sectionOrder: ['section-a', 'section-removed', 'section-b'],
      hiddenSections: ['section-removed'],
    }
    localStorageMock.setItem(`prospecting_dashboard_layout_${USER_ID}`, JSON.stringify(saved))

    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    expect(result.current.sectionOrder).not.toContain('section-removed')
    expect(result.current.hiddenSections.has('section-removed')).toBe(false)
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorageMock.setItem(`prospecting_dashboard_layout_${USER_ID}`, 'not-valid-json{{{')

    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    expect(result.current.sectionOrder).toEqual(DEFAULT_ORDER)
    expect(result.current.hiddenSections.size).toBe(0)
  })

  it('handles invalid version in localStorage', () => {
    localStorageMock.setItem(`prospecting_dashboard_layout_${USER_ID}`, JSON.stringify({
      version: 99,
      sectionOrder: ['section-c', 'section-a'],
      hiddenSections: [],
    }))

    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    expect(result.current.sectionOrder).toEqual(DEFAULT_ORDER)
  })

  it('toggleVisibility adds and removes sections from hidden set', () => {
    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    act(() => result.current.toggleVisibility('section-b'))
    expect(result.current.hiddenSections.has('section-b')).toBe(true)

    act(() => result.current.toggleVisibility('section-b'))
    expect(result.current.hiddenSections.has('section-b')).toBe(false)
  })

  it('reorder moves section from one position to another', () => {
    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    // Move section-d before section-a
    act(() => result.current.reorder('section-d', 'section-a'))
    expect(result.current.sectionOrder).toEqual(['section-d', 'section-a', 'section-b', 'section-c'])
  })

  it('reorder with invalid ids does nothing', () => {
    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    act(() => result.current.reorder('nonexistent', 'section-a'))
    expect(result.current.sectionOrder).toEqual(DEFAULT_ORDER)
  })

  it('startEditing sets isEditing to true', () => {
    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    act(() => result.current.startEditing())
    expect(result.current.isEditing).toBe(true)
  })

  it('saveLayout persists to localStorage and exits edit mode', () => {
    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    act(() => result.current.startEditing())
    act(() => result.current.reorder('section-c', 'section-a'))
    act(() => result.current.toggleVisibility('section-d'))
    act(() => result.current.saveLayout())

    expect(result.current.isEditing).toBe(false)

    const stored = JSON.parse(localStorageMock._store[`prospecting_dashboard_layout_${USER_ID}`])
    expect(stored.version).toBe(1)
    expect(stored.sectionOrder[0]).toBe('section-c')
    expect(stored.hiddenSections).toContain('section-d')
  })

  it('cancelEditing reverts changes and exits edit mode', () => {
    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    act(() => result.current.startEditing())
    act(() => result.current.reorder('section-d', 'section-a'))
    act(() => result.current.toggleVisibility('section-b'))
    act(() => result.current.cancelEditing())

    expect(result.current.isEditing).toBe(false)
    expect(result.current.sectionOrder).toEqual(DEFAULT_ORDER)
    expect(result.current.hiddenSections.size).toBe(0)
  })

  // QA#1 fix: Single localStorage parse
  it('calls localStorage.getItem only once on init', () => {
    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    // Should have called getItem exactly once (single parse)
    const getItemCalls = localStorageMock.getItem.mock.calls.filter(
      (call: string[]) => call[0] === `prospecting_dashboard_layout_${USER_ID}`,
    )
    expect(getItemCalls.length).toBe(1)
    expect(result.current.sectionOrder).toEqual(DEFAULT_ORDER)
  })

  // QA#3 fix: canHideMore
  it('canHideMore is true when more than 1 section visible', () => {
    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    expect(result.current.canHideMore).toBe(true)

    // Hide 3 sections — still 1 visible, so canHideMore becomes false
    act(() => result.current.toggleVisibility('section-a'))
    act(() => result.current.toggleVisibility('section-b'))
    act(() => result.current.toggleVisibility('section-c'))

    expect(result.current.canHideMore).toBe(false)
    expect(result.current.hiddenSections.size).toBe(3)
  })

  it('canHideMore allows un-hiding when only 1 visible', () => {
    const { result } = renderHook(() => useDashboardLayout(USER_ID, DEFAULT_ORDER))

    // Hide 3 sections
    act(() => result.current.toggleVisibility('section-a'))
    act(() => result.current.toggleVisibility('section-b'))
    act(() => result.current.toggleVisibility('section-c'))
    expect(result.current.canHideMore).toBe(false)

    // Un-hide one — canHideMore becomes true again
    act(() => result.current.toggleVisibility('section-a'))
    expect(result.current.canHideMore).toBe(true)
  })
})

describe('EditableSectionWrapper', () => {
  it('renders children in normal mode', () => {
    render(
      <EditableSectionWrapper id="test" isEditing={false} isHidden={false} canHideMore={true} onToggleVisibility={vi.fn()}>
        <div data-testid="content">Content</div>
      </EditableSectionWrapper>,
    )

    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  // QA#2 fix: hidden sections use display:none instead of return null
  it('renders hidden section with display:none when not editing (preserves collapse state)', () => {
    const { container } = render(
      <EditableSectionWrapper id="test" isEditing={false} isHidden={true} canHideMore={true} onToggleVisibility={vi.fn()}>
        <div data-testid="content">Content</div>
      </EditableSectionWrapper>,
    )

    // Content is in the DOM but hidden via display:none
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveStyle({ display: 'none' })
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('shows drag handle and visibility toggle in edit mode', () => {
    render(
      <EditableSectionWrapper id="test" isEditing={true} isHidden={false} canHideMore={true} onToggleVisibility={vi.fn()}>
        <div data-testid="content">Content</div>
      </EditableSectionWrapper>,
    )

    expect(screen.getByLabelText('Arrastar para reordenar')).toBeInTheDocument()
    expect(screen.getByLabelText('Esconder seção')).toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('shows hidden section with reduced opacity in edit mode', () => {
    render(
      <EditableSectionWrapper id="test" isEditing={true} isHidden={true} canHideMore={true} onToggleVisibility={vi.fn()}>
        <div data-testid="content">Content</div>
      </EditableSectionWrapper>,
    )

    expect(screen.getByLabelText('Mostrar seção')).toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('calls onToggleVisibility when toggle button is clicked', () => {
    const onToggle = vi.fn()
    render(
      <EditableSectionWrapper id="my-section" isEditing={true} isHidden={false} canHideMore={true} onToggleVisibility={onToggle}>
        <div>Content</div>
      </EditableSectionWrapper>,
    )

    fireEvent.click(screen.getByLabelText('Esconder seção'))
    expect(onToggle).toHaveBeenCalledWith('my-section')
  })

  it('does not show controls in normal mode', () => {
    render(
      <EditableSectionWrapper id="test" isEditing={false} isHidden={false} canHideMore={true} onToggleVisibility={vi.fn()}>
        <div data-testid="content">Content</div>
      </EditableSectionWrapper>,
    )

    expect(screen.queryByLabelText('Arrastar para reordenar')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Esconder seção')).not.toBeInTheDocument()
  })

  // QA#3 fix: toggle disabled when canHideMore is false and section is visible
  it('disables hide toggle when canHideMore is false and section is visible', () => {
    render(
      <EditableSectionWrapper id="test" isEditing={true} isHidden={false} canHideMore={false} onToggleVisibility={vi.fn()}>
        <div>Content</div>
      </EditableSectionWrapper>,
    )

    const toggleBtn = screen.getByLabelText('Esconder seção')
    expect(toggleBtn).toBeDisabled()
  })

  it('allows showing hidden section even when canHideMore is false', () => {
    const onToggle = vi.fn()
    render(
      <EditableSectionWrapper id="test" isEditing={true} isHidden={true} canHideMore={false} onToggleVisibility={onToggle}>
        <div>Content</div>
      </EditableSectionWrapper>,
    )

    const toggleBtn = screen.getByLabelText('Mostrar seção')
    expect(toggleBtn).not.toBeDisabled()
    fireEvent.click(toggleBtn)
    expect(onToggle).toHaveBeenCalledWith('test')
  })
})
