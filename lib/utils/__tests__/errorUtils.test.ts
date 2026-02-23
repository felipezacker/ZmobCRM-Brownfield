import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../errorUtils';

describe('getErrorMessage', () => {
  it('returns default for falsy input', () => {
    expect(getErrorMessage(null)).toBe('Ocorreu um erro desconhecido.');
    expect(getErrorMessage(undefined)).toBe('Ocorreu um erro desconhecido.');
    expect(getErrorMessage('')).toBe('Ocorreu um erro desconhecido.');
  });

  it('returns string directly', () => {
    expect(getErrorMessage('something broke')).toBe('something broke');
  });

  it('extracts Error.message', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('extracts message from plain object', () => {
    expect(getErrorMessage({ message: 'obj error' })).toBe('obj error');
  });

  // Translation tests
  it('translates "Invalid login credentials"', () => {
    expect(getErrorMessage('Invalid login credentials')).toBe('Email ou senha incorretos.');
  });
  it('translates "Email not confirmed"', () => {
    expect(getErrorMessage('Email not confirmed')).toBe('Por favor, confirme seu email antes de entrar.');
  });
  it('translates "User not found"', () => {
    expect(getErrorMessage('User not found')).toBe('Usuário não encontrado.');
  });
  it('translates "Auth session missing!"', () => {
    expect(getErrorMessage('Auth session missing!')).toBe('Sessão expirada. Por favor, faça login novamente.');
  });
  it('translates "User already registered"', () => {
    expect(getErrorMessage('User already registered')).toBe('Este email já está cadastrado.');
  });
  it('translates "Rate limit exceeded"', () => {
    expect(getErrorMessage('Rate limit exceeded')).toBe('Muitas tentativas. Por favor, aguarde um momento.');
  });

  // Partial match tests
  it('translates partial "weak password"', () => {
    expect(getErrorMessage('your weak password is bad')).toBe('Sua senha é muito fraca.');
  });
  it('translates partial "already registered"', () => {
    expect(getErrorMessage('user already registered again')).toBe('Este email já está em uso.');
  });
  it('translates partial "invalid login"', () => {
    expect(getErrorMessage('this is an invalid login attempt')).toBe('Credenciais inválidas.');
  });
  it('translates partial "unexpected error"', () => {
    expect(getErrorMessage('an unexpected error occurred')).toBe('Ocorreu um erro inesperado. Tente novamente.');
  });

  it('returns original for unknown message', () => {
    expect(getErrorMessage('something random')).toBe('something random');
  });
});
