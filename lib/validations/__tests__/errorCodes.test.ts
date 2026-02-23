import { describe, it, expect, beforeEach } from 'vitest';
import { getErrorMessage, createError, setLocale, getLocale, ERROR_CODES } from '../errorCodes';

describe('errorCodes', () => {
  beforeEach(() => {
    setLocale('pt-BR');
  });

  describe('getErrorMessage', () => {
    it('returns pt-BR message by default', () => {
      const msg = getErrorMessage(ERROR_CODES.EMAIL_REQUIRED);
      expect(msg).toBe('Email é obrigatório');
    });
    it('interpolates field param', () => {
      const msg = getErrorMessage(ERROR_CODES.FIELD_REQUIRED, { field: 'Nome' });
      expect(msg).toBe('Nome é obrigatório');
    });
    it('interpolates min/max params', () => {
      const msg = getErrorMessage(ERROR_CODES.FIELD_TOO_SHORT, { field: 'Senha', min: 8 });
      expect(msg).toContain('8');
      expect(msg).toContain('Senha');
    });
    it('keeps placeholder if param missing', () => {
      const msg = getErrorMessage(ERROR_CODES.FIELD_REQUIRED);
      expect(msg).toContain('{field}');
    });
  });

  describe('setLocale / getLocale', () => {
    it('switches to en-US', () => {
      setLocale('en-US');
      expect(getLocale()).toBe('en-US');
      const msg = getErrorMessage(ERROR_CODES.EMAIL_REQUIRED);
      expect(msg).toBe('Email is required');
    });
    it('ignores unknown locale', () => {
      setLocale('fr-FR');
      expect(getLocale()).toBe('pt-BR');
    });
  });

  describe('createError', () => {
    it('returns code, message and params', () => {
      const err = createError(ERROR_CODES.PHONE_INVALID);
      expect(err.code).toBe('PHONE_INVALID');
      expect(err.message).toBe('Telefone inválido');
      expect(err.params).toEqual({});
    });
  });
});
