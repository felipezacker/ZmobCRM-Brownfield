import { describe, it, expect } from 'vitest'
import { parseScriptSections, substituteVariables, buildContactVariables, cleanUnresolvedVariables } from '../utils/scriptParser'

describe('parseScriptSections', () => {
  it('returns empty array for empty template', () => {
    expect(parseScriptSections('')).toEqual([])
    expect(parseScriptSections('   ')).toEqual([])
  })

  it('returns single section when no headings', () => {
    const template = 'Olá {nome}, tudo bem?\nGostaria de falar sobre...'
    const result = parseScriptSections(template)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Script')
    expect(result[0].content).toBe(template)
  })

  it('parses multiple sections from ## headings', () => {
    const template = `## Intro
Olá, meu nome é João.

## Qualificação
Você está buscando imóvel?

## Fechamento
Posso agendar uma visita?`

    const result = parseScriptSections(template)
    expect(result).toHaveLength(3)
    expect(result[0].title).toBe('Intro')
    expect(result[0].content).toContain('meu nome é João')
    expect(result[1].title).toBe('Qualificação')
    expect(result[1].content).toContain('buscando imóvel')
    expect(result[2].title).toBe('Fechamento')
    expect(result[2].content).toContain('agendar uma visita')
  })

  it('handles content before first heading', () => {
    const template = `Texto inicial

## Seção 1
Conteúdo 1`

    const result = parseScriptSections(template)
    expect(result).toHaveLength(2)
    expect(result[0].content).toBe('Texto inicial')
    expect(result[1].title).toBe('Seção 1')
    expect(result[1].content).toBe('Conteúdo 1')
  })

  it('generates unique section IDs', () => {
    const template = `## A
text a
## B
text b`
    const result = parseScriptSections(template)
    const ids = result.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('substituteVariables', () => {
  it('replaces known variables', () => {
    const result = substituteVariables('Olá {nome}, da {empresa}!', {
      nome: 'Maria',
      empresa: 'ACME',
    })
    expect(result).toBe('Olá Maria, da ACME!')
  })

  it('replaces multiple occurrences', () => {
    const result = substituteVariables('{nome} é {nome}', { nome: 'Ana' })
    expect(result).toBe('Ana é Ana')
  })

  it('leaves unmatched variables as-is', () => {
    const result = substituteVariables('Olá {nome}, valor: {valor}', { nome: 'Carlos' })
    expect(result).toBe('Olá Carlos, valor: {valor}')
  })

  it('handles empty variables map', () => {
    const template = 'Olá {nome}!'
    expect(substituteVariables(template, {})).toBe(template)
  })
})

describe('cleanUnresolvedVariables', () => {
  it('removes unresolved variables', () => {
    expect(cleanUnresolvedVariables('Olá Maria, da {empresa}!')).toBe('Olá Maria, da !')
  })

  it('leaves text without variables unchanged', () => {
    expect(cleanUnresolvedVariables('Texto normal sem variáveis')).toBe('Texto normal sem variáveis')
  })

  it('removes multiple unresolved variables', () => {
    expect(cleanUnresolvedVariables('{a} e {b} e {c}')).toBe(' e  e ')
  })
})

describe('buildContactVariables', () => {
  it('maps contact fields to template variables', () => {
    const vars = buildContactVariables({
      contactName: 'Maria Silva',
      contactPhone: '11999990000',
      contactEmail: 'maria@test.com',
    })
    expect(vars.nome).toBe('Maria Silva')
    expect(vars.telefone).toBe('11999990000')
    expect(vars.email).toBe('maria@test.com')
    expect(vars.empresa).toBe('')
  })

  it('handles missing fields gracefully', () => {
    const vars = buildContactVariables({})
    expect(vars.nome).toBe('')
    expect(vars.telefone).toBe('')
    expect(vars.email).toBe('')
  })
})
