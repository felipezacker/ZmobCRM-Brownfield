import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/integracoes',
}))

vi.mock('@/features/settings/components/ApiKeysSection', () => ({
  ApiKeysSection: () => <div><h3>API (Integrações)</h3></div>,
}))

vi.mock('@/features/settings/components/WebhooksSection', () => ({
  WebhooksSection: () => <div><h3>Webhooks Content</h3></div>,
}))

vi.mock('@/features/settings/components/McpSection', () => ({
  McpSection: () => <div><h3>MCP Content</h3></div>,
}))

import { IntegrationsSettings } from './IntegrationsSettings'

describe('IntegrationsSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = ''
  })

  it('renderiza as 3 sub-tabs (Webhooks, API, MCP)', () => {
    render(<IntegrationsSettings />)

    expect(screen.getByRole('button', { name: /^Webhooks$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^API$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^MCP$/i })).toBeInTheDocument()
  })

  it('default sub-tab é API', () => {
    render(<IntegrationsSettings />)

    expect(screen.getByRole('heading', { name: /^API \(Integrações\)$/i })).toBeInTheDocument()
  })

  it('click em Webhooks mostra conteúdo de Webhooks', () => {
    render(<IntegrationsSettings />)

    fireEvent.click(screen.getByRole('button', { name: /^Webhooks$/i }))

    expect(screen.getByRole('heading', { name: /^Webhooks Content$/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^API \(Integrações\)$/i })).not.toBeInTheDocument()
  })

  it('click em MCP mostra conteúdo de MCP', () => {
    render(<IntegrationsSettings />)

    fireEvent.click(screen.getByRole('button', { name: /^MCP$/i }))

    expect(screen.getByRole('heading', { name: /^MCP Content$/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^API \(Integrações\)$/i })).not.toBeInTheDocument()
  })

  it('título da seção está presente', () => {
    render(<IntegrationsSettings />)

    expect(screen.getByRole('heading', { name: /^Integrações$/i })).toBeInTheDocument()
  })
})
