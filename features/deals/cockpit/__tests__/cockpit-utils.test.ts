import { describe, it, expect } from 'vitest';
import {
  hashString,
  errorMessage,
  humanizeTestLabel,
  uid,
  formatAtISO,
  formatCurrencyBRL,
  stageToneFromBoardColor,
  toneToBg,
  scriptCategoryChipClass,
  buildSuggestedWhatsAppMessage,
  buildSuggestedEmailBody,
  buildExecutionHeader,
  pickEmailPrefill,
} from '../cockpit-utils';

describe('cockpit-utils', () => {
  describe('hashString', () => {
    it('returns consistent hash for same input', () => {
      expect(hashString('hello')).toBe(hashString('hello'));
    });
    it('returns different hashes for different inputs', () => {
      expect(hashString('hello')).not.toBe(hashString('world'));
    });
    it('returns hex string', () => {
      const result = hashString('test');
      expect(typeof result).toBe('string');
      expect(/^[0-9a-f]+$/.test(result)).toBe(true);
    });
  });

  describe('errorMessage', () => {
    it('extracts message from Error', () => {
      expect(errorMessage(new Error('fail'), 'default')).toBe('fail');
    });
    it('returns string input', () => {
      expect(errorMessage('oops', 'default')).toBe('oops');
    });
    it('returns fallback for non-string/non-Error', () => {
      expect(errorMessage(42, 'fallback')).toBe('fallback');
    });
    it('returns fallback for null', () => {
      expect(errorMessage(null, 'fallback')).toBe('fallback');
    });
    it('returns fallback for empty string', () => {
      expect(errorMessage('  ', 'fallback')).toBe('fallback');
    });
  });

  describe('humanizeTestLabel', () => {
    it('adds [T] prefix for test-like names', () => {
      expect(humanizeTestLabel('test_deal')).toBe('[T] test_deal');
    });
    it('adds [T] prefix for mock_ names', () => {
      expect(humanizeTestLabel('mock_contact')).toBe('[T] mock_contact');
    });
    it('returns original for normal titles', () => {
      expect(humanizeTestLabel('Normal Title')).toBe('Normal Title');
    });
    it('returns empty string for null/undefined', () => {
      expect(humanizeTestLabel(null)).toBe('');
      expect(humanizeTestLabel(undefined)).toBe('');
    });
    it('returns empty string for empty/whitespace', () => {
      expect(humanizeTestLabel('')).toBe('');
      expect(humanizeTestLabel('   ')).toBe('');
    });
  });

  describe('uid', () => {
    it('returns string with default prefix', () => {
      const id = uid();
      expect(id).toMatch(/^id-/);
    });
    it('returns string with custom prefix', () => {
      const id = uid('note');
      expect(id).toMatch(/^note-/);
    });
    it('returns unique values', () => {
      const ids = new Set(Array.from({ length: 50 }, () => uid()));
      expect(ids.size).toBe(50);
    });
  });

  describe('formatAtISO', () => {
    it('formats ISO date string', () => {
      const result = formatAtISO('2024-01-15T10:30:00Z');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatCurrencyBRL', () => {
    it('formats number as BRL', () => {
      const result = formatCurrencyBRL(1234.56);
      expect(result).toMatch(/1\.234/);
    });
    it('handles zero', () => {
      const result = formatCurrencyBRL(0);
      expect(result).toMatch(/0/);
    });
  });

  describe('stageToneFromBoardColor', () => {
    it('maps blue to blue', () => {
      expect(stageToneFromBoardColor('blue')).toBe('blue');
    });
    it('maps cyan to blue', () => {
      expect(stageToneFromBoardColor('cyan')).toBe('blue');
    });
    it('maps green to green', () => {
      expect(stageToneFromBoardColor('green')).toBe('green');
    });
    it('maps purple to violet', () => {
      expect(stageToneFromBoardColor('purple')).toBe('violet');
    });
    it('maps amber to amber', () => {
      expect(stageToneFromBoardColor('amber')).toBe('amber');
    });
    it('defaults to slate for unknown', () => {
      expect(stageToneFromBoardColor('#123456')).toBe('slate');
    });
    it('defaults to slate for undefined', () => {
      expect(stageToneFromBoardColor(undefined)).toBe('slate');
    });
  });

  describe('toneToBg', () => {
    it('returns correct class for each tone', () => {
      expect(toneToBg('blue')).toBe('bg-blue-500');
      expect(toneToBg('violet')).toBe('bg-violet-500');
      expect(toneToBg('amber')).toBe('bg-amber-500');
      expect(toneToBg('green')).toBe('bg-emerald-500');
      expect(toneToBg('slate')).toBe('bg-slate-500');
    });
  });

  describe('scriptCategoryChipClass', () => {
    it('returns correct classes for known colors', () => {
      expect(scriptCategoryChipClass('cyan')).toContain('cyan');
      expect(scriptCategoryChipClass('amber')).toContain('amber');
      expect(scriptCategoryChipClass('emerald')).toContain('emerald');
      expect(scriptCategoryChipClass('violet')).toContain('violet');
      expect(scriptCategoryChipClass('rose')).toContain('rose');
    });
    it('returns default for unknown color', () => {
      expect(scriptCategoryChipClass('unknown')).toContain('bg-white/10');
    });
  });

  describe('buildExecutionHeader', () => {
    it('includes channel and source', () => {
      const header = buildExecutionHeader({
        channel: 'WHATSAPP',
        context: { origin: 'nextBestAction', source: 'generated' },
      });
      expect(header).toContain('WHATSAPP');
      expect(header).toContain('nextBestAction');
    });
    it('includes template info', () => {
      const header = buildExecutionHeader({
        channel: 'EMAIL',
        context: {
          origin: 'manual',
          source: 'template',
          template: { id: '1', title: 'Follow-up' },
        },
      });
      expect(header).toContain('Follow-up');
    });
    it('includes outsideCRM flag', () => {
      const header = buildExecutionHeader({
        channel: 'WHATSAPP',
        outsideCRM: true,
      });
      expect(header).toContain('Fora do CRM');
    });
  });

  describe('pickEmailPrefill', () => {
    it('extracts subject from template', () => {
      const { subject, body } = pickEmailPrefill(
        'Assunto: Reunião amanhã\nConteúdo do email aqui',
        'Fallback Subject'
      );
      expect(subject).toBe('Reunião amanhã');
      expect(body).toContain('Conteúdo do email');
    });
    it('uses fallback when no subject line', () => {
      const { subject, body } = pickEmailPrefill(
        'Just body text here',
        'My Fallback'
      );
      expect(subject).toBe('My Fallback');
      expect(body).toBe('Just body text here');
    });
  });

  describe('buildSuggestedWhatsAppMessage', () => {
    it('builds meeting message with contact and deal', () => {
      const msg = buildSuggestedWhatsAppMessage({
        contact: { name: 'João Silva' },
        deal: { title: 'Deal X' },
        actionType: 'MEETING',
      });
      expect(msg).toContain('João');
      expect(msg).toContain('Deal X');
      expect(msg).toContain('horários');
    });
    it('builds generic message for non-meeting', () => {
      const msg = buildSuggestedWhatsAppMessage({
        contact: { name: 'Maria' },
        deal: { title: 'Deal Y' },
        actionType: 'FOLLOW_UP',
        action: 'Follow up on proposal',
      });
      expect(msg).toContain('Maria');
      expect(msg).toContain('Follow up on proposal');
    });
    it('handles missing contact/deal gracefully', () => {
      const msg = buildSuggestedWhatsAppMessage({
        actionType: 'CALL',
      });
      expect(msg).toContain('Olá');
    });
  });

  describe('buildSuggestedEmailBody', () => {
    it('builds email with contact and deal', () => {
      const body = buildSuggestedEmailBody({
        contact: { name: 'Ana' },
        deal: { title: 'Enterprise Deal' },
        actionType: 'PROPOSAL',
        action: 'Send updated proposal',
      });
      expect(body).toContain('Ana');
      expect(body).toContain('Enterprise Deal');
      expect(body).toContain('Atenciosamente');
    });
    it('handles missing fields', () => {
      const body = buildSuggestedEmailBody({
        actionType: 'GENERAL',
      });
      expect(body).toContain('Olá');
      expect(body).toContain('Atenciosamente');
    });
  });
});
