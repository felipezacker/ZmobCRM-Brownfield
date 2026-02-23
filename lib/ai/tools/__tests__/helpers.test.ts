import { describe, it, expect } from 'vitest';
import { formatSupabaseFailure } from '../helpers';

describe('formatSupabaseFailure', () => {
  it('formats error message', () => {
    const result = formatSupabaseFailure({ message: 'connection timeout' });
    expect(result).toContain('connection timeout');
    expect(result).toContain('Falha ao consultar o Supabase');
  });

  it('adds auth hint for JWT errors', () => {
    const result = formatSupabaseFailure({ message: 'JWT expired' });
    expect(result).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('adds auth hint for permission denied', () => {
    const result = formatSupabaseFailure({ message: 'permission denied for table deals' });
    expect(result).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('adds auth hint for unauthorized', () => {
    const result = formatSupabaseFailure({ message: 'Unauthorized' });
    expect(result).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('does not add auth hint for non-auth errors', () => {
    const result = formatSupabaseFailure({ message: 'column not found' });
    expect(result).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('handles null error', () => {
    const result = formatSupabaseFailure(null);
    expect(result).toContain('Erro desconhecido');
  });

  it('handles undefined error', () => {
    const result = formatSupabaseFailure(undefined);
    expect(result).toContain('Erro desconhecido');
  });

  it('handles string error', () => {
    const result = formatSupabaseFailure('something broke');
    expect(result).toContain('something broke');
  });

  it('uses error_description if no message', () => {
    const result = formatSupabaseFailure({ error_description: 'invalid apikey provided' });
    expect(result).toContain('invalid apikey provided');
    expect(result).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});
