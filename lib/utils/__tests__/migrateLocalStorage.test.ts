import { describe, it, expect, beforeEach } from 'vitest';
import { migrateLocalStorage } from '../migrateLocalStorage';

describe('migrateLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does nothing if already migrated', () => {
    localStorage.setItem('crm_migration_v1_completed', 'true');
    migrateLocalStorage();
    // No crm_boards created since migration skipped
    expect(localStorage.getItem('crm_boards')).toBeNull();
  });

  it('creates default board if none exists', () => {
    migrateLocalStorage();
    const boards = JSON.parse(localStorage.getItem('crm_boards') || '[]');
    expect(boards).toHaveLength(1);
    expect(boards[0].name).toBe('Pipeline de Vendas');
    expect(boards[0].isDefault).toBe(true);
  });

  it('marks migration as completed', () => {
    migrateLocalStorage();
    expect(localStorage.getItem('crm_migration_v1_completed')).toBe('true');
  });

  it('migrates leads to contacts', () => {
    const leads = [
      { id: '1', name: 'Lead 1', email: 'a@b.com', source: 'web', createdAt: '2024-01-01', notes: '' },
    ];
    localStorage.setItem('crm_leads', JSON.stringify(leads));
    migrateLocalStorage();
    const contacts = JSON.parse(localStorage.getItem('crm_contacts') || '[]');
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe('Lead 1');
    expect(contacts[0].stage).toBe('LEAD');
  });

  it('appends to existing contacts', () => {
    const existing = [{ id: '0', name: 'Existing' }];
    const leads = [{ id: '1', name: 'New', email: '', source: '', createdAt: '', notes: '' }];
    localStorage.setItem('crm_contacts', JSON.stringify(existing));
    localStorage.setItem('crm_leads', JSON.stringify(leads));
    migrateLocalStorage();
    const contacts = JSON.parse(localStorage.getItem('crm_contacts') || '[]');
    expect(contacts).toHaveLength(2);
  });

  it('is idempotent', () => {
    migrateLocalStorage();
    migrateLocalStorage();
    expect(localStorage.getItem('crm_migration_v1_completed')).toBe('true');
  });
});
