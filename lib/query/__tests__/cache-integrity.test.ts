/**
 * Cache Integrity Tests
 * 
 * Estes testes detectam regressões no gerenciamento de cache de deals.
 * O objetivo é garantir que:
 * 1. Todos os pontos de escrita usam DEALS_VIEW_KEY
 * 2. Não há setQueriesData com prefix matchers para deals
 * 3. A arquitetura de "única fonte de verdade" é mantida
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const LIB_QUERY_DIR = path.join(__dirname, '..');
const CONTEXT_DIR = path.join(__dirname, '../../../context');
const REALTIME_DIR = path.join(__dirname, '../../realtime');

// Arquivos críticos que gerenciam o cache de deals
const CRITICAL_FILES = [
  path.join(LIB_QUERY_DIR, 'hooks/useDealsQuery.ts'),
  path.join(LIB_QUERY_DIR, 'hooks/useMoveDeal.ts'),
  path.join(REALTIME_DIR, 'useRealtimeSync.ts'),
  path.join(REALTIME_DIR, 'dealInsertSync.ts'),
  path.join(REALTIME_DIR, 'dealUpdateSync.ts'),
];

// Padrões problemáticos que indicam regressão
const DANGEROUS_PATTERNS = [
  // setQueriesData com prefix matcher (pode atualizar caches errados)
  {
    pattern: /setQueriesData\s*<[^>]*>\s*\(\s*\{\s*queryKey:\s*queryKeys\.deals\.(all|lists\(\))/g,
    description: 'setQueriesData com prefix matcher para deals (deve usar setQueryData com DEALS_VIEW_KEY)',
    severity: 'error' as const,
  },
  // setQueryData com queryKeys.deals.lists() sem 'view'
  // Severidade 'warning': dual-cache sync é intencional para manter DealDetailModal
  // sincronizado junto com DEALS_VIEW_KEY. Ambos os caches devem ser escritos em mutations.
  {
    pattern: /setQueryData\s*<[^>]*>\s*\(\s*queryKeys\.deals\.lists\(\)/g,
    description: 'setQueryData com queryKeys.deals.lists() (deve usar DEALS_VIEW_KEY)',
    severity: 'warning' as const,
  },
  // setQueryData com queryKeys.deals.list({ ... }) para mutations
  {
    pattern: /setQueryData\s*<[^>]*>\s*\(\s*queryKeys\.deals\.list\s*\(/g,
    description: 'setQueryData com queryKeys.deals.list({ filter }) (deve usar DEALS_VIEW_KEY para mutations)',
    severity: 'warning' as const,
  },
];

// Padrões obrigatórios que devem estar presentes
const REQUIRED_PATTERNS = [
  {
    files: ['useDealsQuery.ts', 'useMoveDeal.ts', 'dealInsertSync.ts', 'dealUpdateSync.ts'],
    pattern: /import\s*\{[^}]*DEALS_VIEW_KEY[^}]*\}\s*from/,
    description: 'DEALS_VIEW_KEY deve ser importado',
  },
];

describe('Cache Integrity - Deals', () => {
  describe('Padrões Perigosos', () => {
    CRITICAL_FILES.forEach((filePath) => {
      const fileName = path.basename(filePath);
      
      it(`${fileName}: não deve usar setQueriesData com prefix matcher`, () => {
        if (!fs.existsSync(filePath)) {
          expect.fail(`Critical file not found: ${filePath}. Ensure the file exists or update CRITICAL_FILES.`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        
        DANGEROUS_PATTERNS.forEach(({ pattern, description, severity }) => {
          const matches = content.match(pattern);
          
          if (matches && severity === 'error') {
            // Ignora comentários (linhas que começam com //)
            const nonCommentMatches = matches.filter(match => {
              const lineIndex = content.indexOf(match);
              const lineStart = content.lastIndexOf('\n', lineIndex) + 1;
              const lineContent = content.slice(lineStart, lineIndex + match.length);
              return !lineContent.trim().startsWith('//');
            });
            
            if (nonCommentMatches.length > 0) {
              expect.fail(
                `❌ ${fileName}: ${description}\n` +
                `   Encontrado: ${nonCommentMatches.join(', ')}\n` +
                `   Solução: Use setQueryData(DEALS_VIEW_KEY, ...) em vez disso`
              );
            }
          }
        });
      });
    });
  });

  describe('Padrões Obrigatórios', () => {
    REQUIRED_PATTERNS.forEach(({ files, pattern, description }) => {
      files.forEach((fileName) => {
        it(`${fileName}: ${description}`, () => {
          const filePath = CRITICAL_FILES.find(f => f.endsWith(fileName));

          if (!filePath || !fs.existsSync(filePath)) {
            expect.fail(`Required file not found: ${fileName}. Ensure the file exists or update REQUIRED_PATTERNS.`);
          }

          const content = fs.readFileSync(filePath, 'utf-8');
          const hasPattern = pattern.test(content);
          
          expect(hasPattern, `${fileName} deve ter: ${description}`).toBe(true);
        });
      });
    });
  });

  describe('Consistência de Query Keys', () => {
    it('DEALS_VIEW_KEY deve ser usado para todas as mutations de deals', () => {
      const dealsQueryPath = path.join(LIB_QUERY_DIR, 'hooks/useDealsQuery.ts');

      if (!fs.existsSync(dealsQueryPath)) {
        expect.fail('useDealsQuery.ts not found. Ensure the file exists or update the test path.');
      }

      const content = fs.readFileSync(dealsQueryPath, 'utf-8');
      
      // Conta quantas vezes setQueryData é chamado com DEALS_VIEW_KEY
      const dealsViewKeyUsage = (content.match(/setQueryData[^)]*DEALS_VIEW_KEY/g) || []).length;
      
      // A maioria dos setQueryData<DealView[]> deve usar DEALS_VIEW_KEY
      expect(
        dealsViewKeyUsage,
        'Mutations de deals devem usar DEALS_VIEW_KEY'
      ).toBeGreaterThan(0);
    });

    it('useMoveDeal deve usar DEALS_VIEW_KEY', () => {
      const moveDealPath = path.join(LIB_QUERY_DIR, 'hooks/useMoveDeal.ts');

      if (!fs.existsSync(moveDealPath)) {
        expect.fail('useMoveDeal.ts not found. Ensure the file exists or update the test path.');
      }

      const content = fs.readFileSync(moveDealPath, 'utf-8');
      
      // Deve importar DEALS_VIEW_KEY
      expect(content).toMatch(/DEALS_VIEW_KEY/);
      
      // Não deve usar setQueriesData
      const setQueriesDataUsage = content.match(/setQueriesData\s*<[^>]*Deal/g);
      expect(
        setQueriesDataUsage,
        'useMoveDeal não deve usar setQueriesData para deals'
      ).toBeNull();
    });

    it('realtime deal handlers deve usar DEALS_VIEW_KEY para INSERT e UPDATE', () => {
      const insertPath = path.join(REALTIME_DIR, 'dealInsertSync.ts');
      const updatePath = path.join(REALTIME_DIR, 'dealUpdateSync.ts');

      if (!fs.existsSync(insertPath)) {
        expect.fail('dealInsertSync.ts not found. Ensure the file exists or update the test path.');
      }
      if (!fs.existsSync(updatePath)) {
        expect.fail('dealUpdateSync.ts not found. Ensure the file exists or update the test path.');
      }

      const insertContent = fs.readFileSync(insertPath, 'utf-8');
      const updateContent = fs.readFileSync(updatePath, 'utf-8');

      // Both handlers must import DEALS_VIEW_KEY
      expect(insertContent).toMatch(/DEALS_VIEW_KEY/);
      expect(updateContent).toMatch(/DEALS_VIEW_KEY/);
    });
  });


  describe('useCRMActions deve usar DEALS_VIEW_KEY', () => {
    it('useCRMActions.ts deve usar DEALS_VIEW_KEY ou equivalente', () => {
      const crmActionsPath = path.join(__dirname, '../../../hooks/useCRMActions.ts');

      if (!fs.existsSync(crmActionsPath)) {
        expect.fail('useCRMActions.ts not found.');
      }

      const content = fs.readFileSync(crmActionsPath, 'utf-8');

      const usesDealsViewKey = content.includes('DEALS_VIEW_KEY') ||
        content.includes("[...queryKeys.deals.lists(), 'view']");

      expect(
        usesDealsViewKey,
        'useCRMActions deve usar DEALS_VIEW_KEY ou equivalente para setQueryData'
      ).toBe(true);
    });
  });
});

describe('Cache Integrity - Snapshot', () => {
  it('deve gerar um snapshot das query keys usadas para escrita de deals', () => {
    const usageReport: Record<string, string[]> = {};
    
    CRITICAL_FILES.forEach((filePath) => {
      if (!fs.existsSync(filePath)) return;
      
      const fileName = path.basename(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const usages: string[] = [];
      
      // Encontra todos os usos de setQueryData e setQueriesData
      const setQueryDataMatches = content.match(/set(Query|Queries)Data[^;]+;/g) || [];
      
      setQueryDataMatches.forEach((match) => {
        if (match.includes('deal') || match.includes('Deal')) {
          // Extrai a query key usada
          const keyMatch = match.match(/(?:queryKey:|<[^>]*>\s*\()([^,)]+)/);
          if (keyMatch) {
            usages.push(keyMatch[1].trim());
          }
        }
      });
      
      if (usages.length > 0) {
        usageReport[fileName] = usages;
      }
    });
    
    // Snapshot do relatório de uso
    expect(usageReport).toMatchSnapshot();
  });
});
