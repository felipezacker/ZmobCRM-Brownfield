import { describe, it, expect } from 'vitest';
import { hasMinRole, ROLE_HIERARCHY } from '../roles';

describe('roles', () => {
  describe('ROLE_HIERARCHY', () => {
    it('admin > diretor > corretor', () => {
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.diretor);
      expect(ROLE_HIERARCHY.diretor).toBeGreaterThan(ROLE_HIERARCHY.corretor);
    });
  });

  describe('hasMinRole', () => {
    it('admin has min role admin', () => {
      expect(hasMinRole('admin', 'admin')).toBe(true);
    });
    it('admin has min role corretor', () => {
      expect(hasMinRole('admin', 'corretor')).toBe(true);
    });
    it('corretor does NOT have min role admin', () => {
      expect(hasMinRole('corretor', 'admin')).toBe(false);
    });
    it('diretor has min role diretor', () => {
      expect(hasMinRole('diretor', 'diretor')).toBe(true);
    });
    it('diretor does NOT have min role admin', () => {
      expect(hasMinRole('diretor', 'admin')).toBe(false);
    });
    it('corretor has min role corretor', () => {
      expect(hasMinRole('corretor', 'corretor')).toBe(true);
    });
  });
});
