import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { DailyGoalCard } from '../components/DailyGoalCard'
import type { GoalProgress } from '../hooks/useProspectingGoals'

const baseProgress: GoalProgress = {
  target: 30,
  current: 0,
  percentage: 0,
  color: 'red',
  isComplete: false,
}

const onConfigureClick = vi.fn()

function renderCard(progress: GoalProgress = baseProgress, isLoading = false) {
  return render(
    <DailyGoalCard
      progress={progress}
      isLoading={isLoading}
      isAdminOrDirector={false}
      onConfigureClick={onConfigureClick}
    />,
  )
}

describe('DailyGoalCard', () => {
  it('renders loading skeleton', () => {
    renderCard(baseProgress, true)
    expect(screen.queryByText('Meta do Dia')).not.toBeInTheDocument()
  })

  it('renders progress with 0%', () => {
    renderCard({ ...baseProgress, current: 0, percentage: 0 })
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('Meta do Dia')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('/30')).toBeInTheDocument()
  })

  it('renders red color when percentage < 50%', () => {
    renderCard({ ...baseProgress, current: 10, percentage: 33, color: 'red' })
    expect(screen.getByText('33%')).toBeInTheDocument()
    expect(screen.getByText('Iniciar')).toBeInTheDocument()
  })

  it('renders yellow color when percentage 50-99%', () => {
    renderCard({ ...baseProgress, current: 20, percentage: 67, color: 'yellow' })
    expect(screen.getByText('67%')).toBeInTheDocument()
    expect(screen.getByText('Em progresso')).toBeInTheDocument()
  })

  it('renders green color when percentage >= 100%', () => {
    renderCard({ ...baseProgress, current: 30, percentage: 100, color: 'green', isComplete: true })
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('Concluida')).toBeInTheDocument()
  })

  it('shows celebration when reaching 100%', async () => {
    vi.useFakeTimers()
    const { rerender } = render(
      <DailyGoalCard
        progress={{ ...baseProgress, current: 29, percentage: 97, color: 'yellow', isComplete: false }}
        isLoading={false}
        isAdminOrDirector={false}
        onConfigureClick={onConfigureClick}
      />,
    )

    rerender(
      <DailyGoalCard
        progress={{ ...baseProgress, current: 30, percentage: 100, color: 'green', isComplete: true }}
        isLoading={false}
        isAdminOrDirector={false}
        onConfigureClick={onConfigureClick}
      />,
    )

    expect(screen.getByText('Meta atingida!')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(screen.queryByText('Meta atingida!')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('calls onConfigureClick when settings button is clicked', () => {
    renderCard()
    const settingsButton = screen.getByTitle('Alterar meta')
    settingsButton.click()
    expect(onConfigureClick).toHaveBeenCalled()
  })
})
