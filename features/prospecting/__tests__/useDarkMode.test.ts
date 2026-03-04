import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDarkMode } from '../hooks/useDarkMode'

describe('useDarkMode', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('returns false when no dark class', () => {
    const { result } = renderHook(() => useDarkMode())
    expect(result.current).toBe(false)
  })

  it('returns true when dark class is present', () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current).toBe(true)
  })

  it('reacts to dark class being added', async () => {
    const { result } = renderHook(() => useDarkMode())
    expect(result.current).toBe(false)

    act(() => {
      document.documentElement.classList.add('dark')
    })

    await waitFor(() => {
      expect(result.current).toBe(true)
    })
  })

  it('reacts to dark class being removed', async () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current).toBe(true)

    act(() => {
      document.documentElement.classList.remove('dark')
    })

    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  })
})
