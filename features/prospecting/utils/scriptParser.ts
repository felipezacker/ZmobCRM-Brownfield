export interface ScriptSection {
  id: string
  title: string
  content: string
}

/**
 * Parse a script template into navigable sections.
 * Sections are delimited by markdown ## headings.
 * If no headings found, returns the entire template as a single section.
 */
export function parseScriptSections(template: string): ScriptSection[] {
  if (!template.trim()) return []

  const lines = template.split('\n')
  const sections: ScriptSection[] = []
  let currentTitle = ''
  let currentLines: string[] = []
  let sectionIndex = 0

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/)
    if (headingMatch) {
      // Save previous section if it has content
      if (currentLines.length > 0 || sectionIndex > 0) {
        sections.push({
          id: `section-${sectionIndex}`,
          title: currentTitle || `Seção ${sectionIndex + 1}`,
          content: currentLines.join('\n').trim(),
        })
        sectionIndex++
      }
      currentTitle = headingMatch[1].trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  // Push last section
  if (currentLines.length > 0 || currentTitle) {
    sections.push({
      id: `section-${sectionIndex}`,
      title: currentTitle || 'Script',
      content: currentLines.join('\n').trim(),
    })
  }

  // If no sections were created (empty template handled above), return single section
  if (sections.length === 0 && template.trim()) {
    return [{ id: 'section-0', title: 'Script', content: template.trim() }]
  }

  return sections
}

/**
 * Substitute template variables with contact data.
 * Supported variables: {nome}, {empresa}, {telefone}, {email}, {valor}, {produto}
 */
export function substituteVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}

/**
 * Build variables map from a prospecting contact.
 */
export function buildContactVariables(contact: {
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  contactStage?: string
  contactTemperature?: string
}): Record<string, string> {
  return {
    nome: contact.contactName || '',
    empresa: '', // Contact model has no company field
    telefone: contact.contactPhone || '',
    email: contact.contactEmail || '',
    valor: '',
    produto: '',
  }
}
