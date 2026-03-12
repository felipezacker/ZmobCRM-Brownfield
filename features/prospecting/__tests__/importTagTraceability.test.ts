import { describe, it, expect } from 'vitest'
import {
  generateImportTag,
  PROSPECTING_CRM_FIELDS,
  CHUNK_SIZE,
} from '../hooks/useImportToQueue'

describe('CP-IMP-2/3: Import traceability & chunking', () => {
  describe('generateImportTag', () => {
    it('should generate tag with ISO date format', () => {
      const date = new Date(2026, 2, 12) // March 12, 2026
      expect(generateImportTag(date)).toBe('import-prospecao-2026-03-12')
    })

    it('should pad single-digit month and day', () => {
      const date = new Date(2027, 0, 5) // January 5, 2027
      expect(generateImportTag(date)).toBe('import-prospecao-2027-01-05')
    })

    it('should use current date when no argument provided', () => {
      const tag = generateImportTag()
      expect(tag).toMatch(/^import-prospecao-\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('PROSPECTING_CRM_FIELDS', () => {
    it('should include source field', () => {
      const fieldValues = PROSPECTING_CRM_FIELDS.map(f => f.value)
      expect(fieldValues).toContain('source')
    })

    it('should include all required prospecting fields', () => {
      const fieldValues = PROSPECTING_CRM_FIELDS.map(f => f.value)
      expect(fieldValues).toContain('name')
      expect(fieldValues).toContain('phone')
      expect(fieldValues).toContain('email')
      expect(fieldValues).toContain('tags')
      expect(fieldValues).toContain('classification')
      expect(fieldValues).toContain('source')
      expect(fieldValues).toContain('_ignore')
    })
  })

  describe('CHUNK_SIZE (CP-IMP-3)', () => {
    it('should be 500', () => {
      expect(CHUNK_SIZE).toBe(500)
    })
  })
})
