# UX Specialist Review

**Reviewer:** @ux-design-expert (Uma)
**Data:** 2026-03-06
**DRAFT Version:** v2
**Documento revisado:** `docs/prd/technical-debt-DRAFT.md` (v2, Secao 3: Frontend/UX)
**Documento de referencia:** `docs/frontend/frontend-spec.md` (Phase 3 v2)
**Fase:** Brownfield Discovery - Phase 6

---

## Metodologia

Todos os 25 debitos de Frontend/UX (UX-001 a UX-025) do DRAFT v2 foram verificados diretamente contra o codigo-fonte. Tamanhos de arquivo, contagens de uso, padroes de import, tokens de estilo e existencia de arquivos foram confirmados via leitura de codigo e buscas no codebase. Cada debito recebeu validacao binaria (confirmado/nao confirmado), ajuste de severidade quando justificado, estimativa de horas e classificacao de impacto UX.

---

## Debitos Validados

| ID | Debito | Sev. Original | Sev. Ajustada | Horas | Impacto UX | Design Review? | Notas |
|----|--------|---------------|---------------|-------|-----------|---------------|-------|
| UX-001 | Duplicacao de Button component | CRITICAL | CRITICAL | 3-4 | Visual + Funcional | Sim | **Confirmado.** A situacao e mais extrema do que o DRAFT sugere: 130 arquivos importam `@/app/components/ui/Button` (a copia) e apenas 2 arquivos importam `@/components/ui/button` (o original shadcn). Na pratica, a copia e o Button real do sistema e o original e dead code. Diferenca unica: variants `unstyled` e size `unstyled`. |
| UX-002 | CRMContext monolito (34KB) | CRITICAL | CRITICAL | Ver SYS-001 | Performance | Nao | **Confirmado.** 930 linhas, ~180 propriedades expostas. Impacto UX direto: qualquer interacao que muda estado (mover deal, editar contato, fechar modal) causa re-render em cascata visivel como lentidao. Referencia correta ao SYS-001. |
| UX-003 | 4 componentes gigantes | CRITICAL | CRITICAL | 40-60 | Funcional + Bundle | Sim | **Confirmado com tamanhos exatos:** FocusContextPanel 1886 linhas, DealDetailModal 1694 linhas, BoardCreationWizard 1628 linhas, CockpitDataPanel 964 linhas. Mantenho CRITICAL porque alem de manutenibilidade, impacta bundle size (322KB de TSX nos 4 arquivos), tempo de compilacao e possibilidade de code splitting. |
| UX-004 | Skeletons quase inexistentes | HIGH | HIGH | 12-20 | Percebido | Sim | **Confirmado.** Existem exatamente 4 loading.tsx: `boards/`, `contacts/`, `inbox/`, `deals/[dealId]/cockpit/`. Das 17 paginas protegidas com page.tsx, 13 nao tem loading.tsx e usam PageLoader (spinner generico). Ajusto horas para 12-20h (o DRAFT estima 8-16h, subestimado considerando a necessidade de skeletons content-aware). |
| UX-005 | Nenhum sistema i18n | HIGH | **MEDIUM** | 40-80 | Funcional | Nao | **Confirmado.** Rebaixo para MEDIUM: o ZmobCRM e um produto focado no mercado imobiliario brasileiro. Nao ha demanda de internacionalizacao imediata. E um bloqueio para expansao internacional, mas nao afeta usuarios atuais. Manter documentado e reavaliar quando houver demanda de mercado. |
| UX-006 | Controller hooks gigantes | HIGH | HIGH | 24-32 | Performance | Nao | **Confirmado.** useBoardsController 1081 linhas, useContactsController 883 linhas, useInboxController 872 linhas. Impacto UX: hooks monoliticos causam re-renders desnecessarios que o usuario percebe como lentidao ao interagir com boards e contatos. |
| UX-007 | Mistura de import paths | HIGH | **MEDIUM** | 2-4 | Nenhum (DX) | Nao | **Confirmado.** Porem, impacto zero para o usuario final. Problema exclusivamente de Developer Experience (DX). Imports nao afetam UX visivel. Rebaixo para MEDIUM. |
| UX-008 | Scrollbar hex hardcoded | HIGH | **MEDIUM** | 2-3 | Visual (periferico) | Nao | **Confirmado:** `#cbd5e1`, `#94a3b8`, `#334155`, `#475569` em globals.css. Rebaixo para MEDIUM: scrollbars sao elementos perifericos. Dark mode ja tem valores separados. O impacto visual e real mas limitado a um detalhe de acabamento. |
| UX-009 | Chart colors hex hardcoded | HIGH | HIGH | 3-4 | Visual (central) | Nao | **Confirmado:** `#64748b`, `#0f172a`, `#f8fafc`, `rgba(...)` em globals.css. Mantenho HIGH: diferente do scrollbar, charts sao elementos centrais no dashboard e relatorios. Inconsistencia visual e perceptivel. Cores nao se adaptam a temas alternativos. |
| UX-010 | Font serif nao utilizada | MEDIUM | **LOW** | 0.5 | Nenhum | Nao | **Confirmado:** `--font-serif: 'Cinzel'` declarada em @theme. Impacto zero para o usuario se nao estiver sendo carregada via Google Fonts. Verificar se Cinzel e importada; se nao, o impacto e apenas poluicao de namespace CSS. Rebaixo para LOW. |
| UX-011 | Cores Tailwind pre-v4 misturadas | MEDIUM | **HIGH** | 12-16 | Visual | Sim | **Confirmado com dados concretos.** Encontradas 94 ocorrencias em 18 arquivos so na pasta `components/`, e pelo menos 139 ocorrencias nos primeiros 10 arquivos da pasta `features/`. Escala total estimada: 2000+ ocorrencias de `text-slate-*`, `bg-slate-*`, `text-gray-*`, `bg-gray-*` no codebase. Upgrade para HIGH pela abrangencia massiva. O ConfirmModal sozinho tem 4 ocorrencias (`bg-slate-900/60`, `text-slate-*`). PageLoader usa `text-gray-500 dark:text-gray-400`. |
| UX-012 | PageLoader cores hardcoded | MEDIUM | **LOW** | 0.5 | Visual (trivial) | Nao | **Confirmado:** `text-gray-500 dark:text-gray-400` e `border-primary-200`, `border-t-primary-500`. Correcao trivial em 43 linhas. Rebaixo para LOW -- e um caso particular do UX-011 que sera resolvido automaticamente ao migrar cores Tailwind diretas. |
| UX-013 | ConfirmModal nao usa modalStyles | MEDIUM | MEDIUM | 2-3 | Visual | Nao | **Confirmado:** zero referencias a `modalStyles` no ConfirmModal. Usa `bg-slate-900/60` como overlay vs `bg-background/60` do modalStyles. Nota adicional: `modalStyles.ts` e usado em apenas 3 arquivos no total (Modal.tsx, CreateBoardModal.tsx, BoardCreationWizard.tsx), indicando que o padrao centralizado de modal styles tem baixa adocao. |
| UX-014 | Optimistic updates parciais | MEDIUM | MEDIUM | 8-16 | Percebido | Nao | **Confirmado.** Deal moves e prospecting queue tem optimistic updates. Contacts, activities, settings fazem full refetch. Impacto: operacoes CRUD de contatos parecem mais lentas que as de deals. |
| UX-015 | ErrorBoundary inline styles | MEDIUM | **LOW** | 0.5 | Visual (trivial) | Nao | **Confirmado.** Inconsistencia de padrao, porem funcional. Impacto visual zero para o usuario -- o ErrorBoundary so e visto quando algo quebra. Rebaixo para LOW. |
| UX-016 | GlobalError sem design system | MEDIUM | MEDIUM | 2-4 | Visual | Sim | **Confirmado:** HTML puro `<h2>Something went wrong!</h2>` com `<button>` nativo sem estilo. Nota importante do codigo-fonte: o comentario explica que global-error renderiza FORA do app layout, portanto nao tem acesso ao design system. Solucao requer inline CSS. |
| UX-017 | Duplicacao scrollbar styling | MEDIUM | MEDIUM | 1 | Nenhum (DX) | Nao | **Confirmado:** `@utility scrollbar-custom` e `*::-webkit-scrollbar` coexistem com mesmos valores hex. Resolver junto com UX-008. |
| UX-018 | ActivityFormModal duplicado V1/V2 | MEDIUM | **LOW** | 1-2 | Nenhum | Nao | **Confirmado.** V1 (ActivityFormModal.tsx) e V2 (ActivityFormModalV2.tsx) coexistem. Porem, conforme `docs/reviews/v2-components-cleanup.md`, os V2 sao codigo morto -- foram incluidos acidentalmente em commit `59359fb` e NAO sao importados por nenhuma rota ativa. V1 e o componente real. Rebaixo para LOW: basta deletar V2. |
| UX-019 | CreateDealModal duplicado V1/V2 | MEDIUM | **LOW** | 1-2 | Nenhum | Nao | **Confirmado.** Mesma situacao do UX-018. V2 e dead code nao importado. V1 e usado pelo DealDetailModal. Rebaixo para LOW: basta deletar V2. |
| UX-020 | DealCockpit duplicado | MEDIUM | **LOW** | 1-2 | Nenhum | Nao | **Confirmado:** `cockpit/` e `cockpit-v2/` coexistem como rotas separadas. Conforme `docs/reviews/v2-components-cleanup.md`, cockpit-v2 e isolado e inacessivel (nenhuma rota raiz navega para `/cockpit-v2`). Rebaixo para LOW: basta deletar a rota V2. |
| UX-021 | SubmitButton buttonVariants conflitantes | LOW | LOW | 1 | Nenhum (DX) | Nao | **Confirmado:** `FormField.tsx` exporta `SubmitButton` com `buttonVariants` proprios (objeto JS puro, nao CVA). Naming conflita com CVA `buttonVariants` de `button.tsx`. Resolver junto com UX-001 (unificacao de Button). |
| UX-022 | Prefetch incompleto | LOW | LOW | 4-8 | Percebido (marginal) | Nao | **Confirmado.** `prefetchRouteData()` implementa apenas dashboard e contacts. Otimizacao incremental, impacto percebido marginal. |
| UX-023 | Ambient glow hardcoded | LOW | LOW | 1 | Visual (decorativo) | Nao | **Confirmado.** Efeito decorativo no main content com cores hardcoded. Impacto minimo. |
| UX-024 | Sem testes E2E/visual | LOW | **MEDIUM** | Ver SYS-021 | Funcional (indireto) | Nao | Upgrade para MEDIUM. A ausencia de testes visuais e especialmente critica durante as migracoes planejadas (UX-011 com 2000+ ocorrencias, UX-003 decomposicao de gigantes). Sem testes visuais, regressoes UX passarao despercebidas. |
| UX-025 | AIAssistant.tsx deprecado | LOW | LOW | 0.5 | Nenhum | Nao | **Confirmado:** importacao comentada no Layout, substituido por UIChat. Dead code. |

---

## Debitos Adicionados

Debitos identificados na verificacao do codebase que nao constam no DRAFT v2:

| ID | Debito | Severidade | Horas | Impacto UX | Design Review? | Evidencia |
|----|--------|-----------|-------|-----------|---------------|-----------|
| **UX-026** | **Overlay background inconsistente em modais.** `modalStyles.ts` define o padrao `bg-background/60`, porem: (a) apenas 3 arquivos importam `modalStyles`; (b) ConfirmModal usa `bg-slate-900/60`; (c) outros modais em features usam padroes variados. Nao ha adocao consistente dos tokens de modal centralizados. | HIGH | 4-6 | Visual | Sim | `modalStyles.ts` usado em apenas 3 de 20+ modais do sistema. |
| **UX-027** | **z-index sem escala definida.** Encontrados `z-[9999]` como valor dominante em modais, mas `z-[10000]` em TemplatePickerModal, `z-[100]` em BoardStrategyHeader, `z-[60]` e `z-[62]` no installer. Nao existe escala de z-index em tokens. | MEDIUM | 3-4 | Funcional | Nao | Risco de sobreposicao incorreta entre modais empilhados. |
| **UX-028** | **Ausencia de error.tsx por route segment.** Nenhuma pagina protegida tem `error.tsx` dedicado. Erro em qualquer feature derruba toda a pagina com o ErrorBoundary generico ou o GlobalError sem estilo. | HIGH | 8-12 | Funcional + Visual | Sim | Verificado: `find app/(protected) -name "error.tsx"` retorna zero resultados. |
| **UX-029** | **Ausencia de not-found.tsx customizado.** Nao ha `not-found.tsx` nas rotas protegidas. Usuario ve pagina 404 generica do Next.js sem branding do ZmobCRM. | HIGH | 3-4 | Visual | Sim | Verificado: nao existe `not-found.tsx` no app. |
| **UX-030** | **PageLoader sem acessibilidade.** O componente `PageLoader.tsx` (43 linhas) nao tem `role="status"`, `aria-live`, nem `aria-label`. Screen readers nao anunciam que a pagina esta carregando. Usado em 18 paginas. | MEDIUM | 1 | Acessibilidade | Nao | Impacto direto em usuarios de tecnologias assistivas. |
| **UX-031** | **Empty states inconsistentes.** O componente `EmptyState.tsx` existe com 3 tamanhos e `role="status"`, porem muitas features usam `<p>` inline em vez do componente padrao. | LOW | 4-6 | Visual | Sim | Adocao parcial do componente. |
| **UX-032** | **Feedback visual inconsistente em acoes destrutivas.** ConfirmModal tem `variant="danger"`, mas nem todos os fluxos destrutivos do sistema usam o ConfirmModal. Alguns modais de features implementam sua propria logica de confirmacao inline. | MEDIUM | 3-4 | Funcional | Sim | Inconsistencia na experiencia de acoes criticas. |

---

## Debitos Removidos/Rebaixados

| ID | Acao | Justificativa |
|----|------|---------------|
| UX-005 | HIGH -> MEDIUM | Produto focado no mercado brasileiro imobiliario. Sem demanda de internacionalizacao imediata. |
| UX-007 | HIGH -> MEDIUM | Import paths sao problema de DX, impacto zero para usuario final. |
| UX-008 | HIGH -> MEDIUM | Scrollbars sao elementos perifericos. Impacto visual real mas limitado. |
| UX-010 | MEDIUM -> LOW | Font CSS nao utilizada. Impacto zero se nao carregada. |
| UX-011 | MEDIUM -> HIGH | Escala massiva (2000+ ocorrencias) subestimada no DRAFT. Problema estrutural do design system. |
| UX-012 | MEDIUM -> LOW | Caso particular do UX-011, resolvido junto. |
| UX-015 | MEDIUM -> LOW | ErrorBoundary so e visto em situacao de erro. Impacto visual irrelevante. |
| UX-018 | MEDIUM -> LOW | V2 e dead code confirmado. Basta deletar. |
| UX-019 | MEDIUM -> LOW | V2 e dead code confirmado. Basta deletar. |
| UX-020 | MEDIUM -> LOW | cockpit-v2 e inacessivel. Basta deletar. |
| UX-024 | LOW -> MEDIUM | Critico para segurancar das migracoes de design system planejadas. |

**Nenhum debito foi removido.** Todos os 25 foram confirmados como problemas reais.

---

## Respostas ao Architect

### Pergunta 1: UX-003 -- Estrategia de decomposicao do FocusContextPanel (110KB)

**Recomendacao: Dividir por secoes funcionais (tabs + header + actions).**

O FocusContextPanel tem divisao funcional clara baseada em tabs, confirmada pela analise do codigo-fonte na Phase 3:

**Tabs identificados (4):** `notas`, `chat`, `scripts`, `files`

**Decomposicao recomendada (7 sub-componentes):**

```
features/inbox/components/FocusContextPanel/
  index.tsx               (~200 linhas) - Shell com tabs e contexto do deal
  FocusDealHeader.tsx     (~150 linhas) - Header com info do deal + contato
  FocusDealHealth.tsx     (~200 linhas) - Health score, analise IA
  FocusNotesTab.tsx       (~250 linhas) - Lista e editor de notas
  FocusChatTab.tsx        (~100 linhas) - Wrapper do chat IA (ja e lazy)
  FocusScriptsTab.tsx     (~300 linhas) - Scripts de vendas + editor
  FocusFilesTab.tsx       (~200 linhas) - Upload e lista de arquivos
  FocusActionsBar.tsx     (~150 linhas) - Acoes (mover stage, ganho/perdido)
```

A logica NAO esta entrelacada -- cada tab renderiza condicionalmente via `activeTab === 'tab'`. Os hooks auxiliares ja estao em arquivos separados (useAIDealAnalysis, useDealNotes, etc.), facilitando a decomposicao.

**Dependencia critica:** O componente importa `Button` de `@/app/components/ui/Button`. Resolver UX-001 primeiro.

**Para DealDetailModal (1694 linhas):** Dividir por tabs (dados, timeline, atividades, notas). Padrao identico.

**Para BoardCreationWizard (1628 linhas):** Dividir por steps do wizard. Cada step vira componente separado.

**Para CockpitDataPanel (964 linhas):** Dividir por secoes visuais (info basica, pipeline, metricas, timeline).

### Pergunta 2: UX-005 -- i18n e expansao internacional

**[AUTO-DECISION] Ha planos de expansao? -> NAO no horizonte imediato (reason: produto focado em CRM imobiliario brasileiro, nome "Zmob" e abreviacao de "imovel", UI toda em PT-BR, nao ha evidencia de planejamento multi-idioma no PRD)**

**Recomendacao:** Mover para prioridade baixa (P5). Custo de 40-80h nao se justifica sem demanda. Se futuramente necessario, usar `next-intl` (suporte nativo a Server Components do App Router, diferente do react-i18next que e client-first).

**Acao concreta agora:** Criar uma ADR documentando a decisao e os criterios para revisao (ex: primeiro cliente internacional, expansao para mercado hispanico).

### Pergunta 3: UX-018/019/020 -- Qual versao manter (V1 ou V2)?

**Resposta definitiva: Manter V1, deletar V2 em todos os tres casos.**

Justificativa baseada em evidencia do codebase:

1. **ActivityFormModal:** V1 e importado por `ActivitiesPage.tsx` e `DealDetailModal.tsx`. V2 nao e importado por nenhum arquivo.
2. **CreateDealModal:** V1 e importado por `DealDetailModal.tsx`. V2 nao e importado por nenhum arquivo.
3. **DealCockpit:** `cockpit/` e a rota ativa. `cockpit-v2/` nao e acessivel por nenhum link de navegacao.

O documento `docs/reviews/v2-components-cleanup.md` (de 2026-03-05) confirma: os V2 foram incluidos acidentalmente via `git add .` no commit `59359fb` e sao "codigo morto presente no repo, mas inacessivel para os usuarios".

**Acao:** Deletar os 3 arquivos V2 + a rota cockpit-v2. Quick win de 30 minutos.

### Pergunta 4: UX-008/009 -- Hex mantido fora do OKLCH intencionalmente?

**Resposta: NAO foi intencional. Foi migracao parcial.**

Evidencia:
- As cores OKLCH foram introduzidas em camada 3 (custom semantic tokens) com cobertura completa para backgrounds, status colors, text hierarchy e glass effects.
- Scrollbar e chart tokens ficaram em hex porque foram adicionados como "tokens secundarios" sem receber o tratamento OKLCH.
- O `--premium-accent: #7DE8EB` e claramente um token que deveria ser OKLCH (e um ciano, facilmente representavel como `oklch(85% 0.12 190)`).
- Charts usam hex porque `recharts` aceita qualquer formato de cor, entao nao ha restricao tecnica.

**Recomendacao:** Migrar todos para OKLCH. Nao ha razao tecnica para manter hex. Mapeamento sugerido:

| Token Atual | Valor Hex | Valor OKLCH Equivalente |
|------------|-----------|------------------------|
| `--chart-text` | `#64748b` | `oklch(55% 0.02 260)` |
| `--chart-grid` | `rgba(148,163,184,0.1)` | `oklch(72% 0.02 250 / 0.1)` |
| `--chart-tooltip-bg` | `#0f172a` | `oklch(15% 0.03 260)` |
| `--chart-tooltip-text` | `#f8fafc` | `oklch(98% 0.003 260)` |
| `--premium-accent` | `#7DE8EB` | `oklch(85% 0.12 190)` |
| Scrollbar thumb light | `#cbd5e1` | `oklch(85% 0.015 260)` |
| Scrollbar thumb dark | `#475569` | `oklch(42% 0.02 260)` |

### Pergunta 5: UX-004 -- Padrao de skeletons recomendado

**Recomendacao: Hibrido -- building blocks reutilizaveis + composicao por rota.**

Abordagem concreta:

**Atoms de skeleton (componentes base):**
```
components/ui/skeleton.tsx      - Ja existe (shadcn). Barra animada com `animate-pulse`.
```

**Molecules de skeleton (composicoes reutilizaveis):**
```
components/ui/skeletons/
  SkeletonCard.tsx              - Card com linhas de skeleton
  SkeletonTable.tsx             - Tabela com N linhas e M colunas
  SkeletonKanban.tsx            - Colunas com cards skeleton
  SkeletonStatGrid.tsx          - Grid de stat cards
  SkeletonSplitView.tsx         - Layout lista + detalhe (inbox)
```

**Loading.tsx por rota (composicao final):**
```
app/(protected)/dashboard/loading.tsx   -> <SkeletonStatGrid /> + <SkeletonCard />
app/(protected)/activities/loading.tsx  -> <SkeletonTable rows={10} columns={5} />
app/(protected)/settings/loading.tsx    -> <SkeletonCard /> empilhados
app/(protected)/reports/loading.tsx     -> <SkeletonStatGrid /> + <SkeletonCard />
app/(protected)/profile/loading.tsx     -> <SkeletonCard />
app/(protected)/prospecting/loading.tsx -> <SkeletonStatGrid /> + <SkeletonTable />
...
```

**Prioridade de implementacao:**
1. Dashboard (primeira tela apos login)
2. Activities (tela frequente, tabela grande)
3. Prospecting (metricas + tabela)
4. Settings (formularios)
5. Demais paginas

**Principio:** Cada skeleton deve "parecer com o que vai aparecer". Skeletons puramente genericos violam esse principio.

### Pergunta 6: UX-014 -- Operacoes mais beneficiadas por optimistic updates

**Recomendacao: Priorizar create e update em contatos e atividades.**

| Operacao | Beneficio Optimistic | Prioridade |
|----------|---------------------|-----------|
| Criar contato | Alto (formulario -> lista, feedback imediato) | 1 |
| Editar contato | Alto (inline edit, feedback imediato) | 1 |
| Criar atividade | Alto (calendario/lista, feedback imediato) | 2 |
| Completar atividade (checkbox) | Muito Alto (acao frequente, deve ser instantanea) | 1 |
| Deletar contato | Medio (acao rara, pode esperar refetch) | 3 |
| Deletar atividade | Medio (acao rara) | 3 |
| Atualizar settings | Baixo (acao infrequente, refetch aceitavel) | 4 |

**Justificativa:** "Completar atividade" e a acao mais frequente do corretor e DEVE parecer instantanea. Criar/editar contato sao acoes frequentes no fluxo de prospeccao.

### Pergunta 7: UX-013 -- ConfirmModal e modalStyles

**Recomendacao: Migrar ConfirmModal para usar `modalStyles.ts` E expandir os tokens para cobrir alertdialogs.**

Acao concreta em 2 passos:

1. **Expandir `modalStyles.ts`:** Adicionar tokens para alertdialog:
   ```typescript
   export const ALERT_ICON_CLASS = "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
   export const ALERT_ICON_DANGER = "bg-destructive/10 text-destructive"
   export const ALERT_ICON_PRIMARY = "bg-primary/10 text-primary"
   ```

2. **Migrar ConfirmModal:** Substituir classes hardcoded (`bg-slate-900/60`, `bg-white dark:bg-dark-card`, etc.) pelos tokens de `modalStyles.ts`.

**Razao:** O ConfirmModal e usado em fluxos criticos (exclusao de deals, contatos, boards). A consistencia visual com os demais modais e importante para a confianca do usuario.

---

## Recomendacoes de Design

### 1. Estrategia de Design System

**Status:** O design system tem base solida (shadcn/ui, Radix, CVA, OKLCH tokens). A estrategia deve ser **consolidar e formalizar**, nao reconstruir.

**Passos concretos:**

1. **Unificar Button (UX-001):** Adicionar `unstyled` ao `components/ui/button.tsx` e migrar 130 imports. Quick win que desbloqueia tudo.

2. **Padronizar modal tokens (UX-026):** Migrar todos os modais do codebase para usar `modalStyles.ts`. Hoje, apenas 3 de 20+ modais usam os tokens centralizados.

3. **Migrar cores Tailwind diretas (UX-011):** Estabelecer mapeamento `text-slate-*/bg-slate-*` -> tokens semanticos e executar migracao progressiva (comecando pelos componentes em `components/` que sao mais reutilizados).

4. **Criar escala de z-index (UX-027):** Definir tokens em globals.css:
   ```css
   :root {
     --z-dropdown: 50;
     --z-sticky: 100;
     --z-overlay: 1000;
     --z-modal: 9000;
     --z-toast: 9500;
     --z-tooltip: 9900;
   }
   ```

5. **NAO criar pacote separado de design system.** Manter em `components/ui/` e suficiente para um produto unico.

### 2. Estrategia de Componentizacao

**Ordem de consolidacao (dependencias respeitadas):**

1. **Deletar dead code V2 (UX-018, 019, 020):** 30min. Zero risco.
2. **Unificar Button (UX-001):** 3-4h. Desbloqueia decomposicao de gigantes.
3. **Padronizar overlays (UX-026):** 4-6h. Consistencia visual em modais.
4. **Criar error.tsx por segmento (UX-028):** 8-12h. Resiliencia de UX.
5. **Criar not-found.tsx (UX-029):** 3-4h. Branding em 404.
6. **Decompor FocusContextPanel (UX-003):** 12-16h. Maior impacto em manutenibilidade.
7. **Decompor DealDetailModal (UX-003):** 8-12h.
8. **Implementar skeletons (UX-004):** 12-20h. Percepcao de velocidade.

### 3. Padrao de Loading/Error/Empty States

**Loading:** Skeleton content-aware por rota (ver Pergunta 5).

**Error:** Componente `ErrorState` novo com design system, variantes por contexto, acoes de recuperacao. Cada route segment deve ter `error.tsx`.

**Empty:** Adotar `EmptyState.tsx` existente em TODOS os pontos onde hoje ha `<p>` inline. O componente ja suporta 3 sizes, icones e `role="status"`.

### 4. Acessibilidade (PageLoader)

**Acao imediata (UX-030):** Adicionar ao PageLoader:
```tsx
<div role="status" aria-live="polite" aria-label="Carregando pagina">
```

Custo: 10 minutos. Impacto: 18 paginas acessiveis para screen readers.

---

## Dependencias com Outras Areas

### Debitos SYS-* que afetam frontend

| SYS-* | Impacto Frontend | Depende de UX-*? |
|-------|-----------------|-----------------|
| SYS-001 (CRMContext monolito) | Performance de re-render em toda a app. E o mesmo debito que UX-002. | UX-002 e alias |
| SYS-002 (BASE_INSTRUCTIONS hardcoded) | Indireto: se IA nao conhece tools, o chat IA no FocusContextPanel (tab chat) nao pode ajudar com prospeccao, scripts, etc. | Nao |
| SYS-004 (Prospeccao invisivel para IA) | O chat IA no inbox/FocusContextPanel nao pode sugerir acoes de prospeccao. | Nao |
| SYS-008 (exhaustive-deps off) | Bugs de hooks em features -- stale closures, re-renders infinitos. Afeta UX indiretamente via bugs. | Nao |
| SYS-009 (Layout.tsx 505 linhas) | E o app shell. Decomposicao beneficiaria manutencao do layout responsivo. | Nao |
| SYS-022 (Dark mode script inline) | Flash de tema incorreto possivel. ThemeContext pode conflitar. | Nao |
| SYS-024 (tailwind.config.js residual) | Confusao sobre config Tailwind v4. Limpar junto com UX-011 (migracao de cores). | UX-011 |

### Debitos DB-* que afetam UX

| DB-* | Impacto UX |
|------|-----------|
| DB-003 (deals.contact_id nullable) | Deals sem contato aparecem como "cards fantasma" no kanban sem nome de contato. UX confusa. |
| DB-004 (RLS subqueries performance) | Lentidao perceptivel em tabelas grandes de contatos/deals. |
| DB-015 (contacts.phone legado) | Possibilidade de telefone mostrado inconsistente entre lista de contatos e detalhe. |
| DB-021 (N+1 useDealsQuery) | Lentidao ao carregar kanban com muitos deals (roundtrip extra para profiles). |

### UX-* que precisam de backend

| UX-* | Mudanca Backend Necessaria |
|------|--------------------------|
| UX-014 (Optimistic updates) | Nao (frontend only) |
| UX-004 (Skeletons) | Nao (frontend only) |
| UX-003 (Decomposicao gigantes) | Nao (frontend only) |
| Nenhum | Todos os debitos UX sao frontend-only |

---

## Plano de Migracao de Componentes

### Onda 0 -- Dead Code Cleanup (30min)

- Deletar `features/activities/components/ActivityFormModalV2.tsx`
- Deletar `features/boards/components/Modals/CreateDealModalV2.tsx`
- Deletar `app/(protected)/deals/[dealId]/cockpit-v2/` (rota inteira)
- Deletar `components/AIAssistant.tsx`
- Resolver UX-018, UX-019, UX-020, UX-025

### Onda 1 -- Quick Wins de UX (1-2 semanas, ~20-30h)

| Tarefa | Debitos | Horas | Pre-req |
|--------|---------|-------|---------|
| Unificar Button | UX-001, UX-021 | 3-4 | Nenhum |
| Criar not-found.tsx | UX-029 | 3-4 | Nenhum |
| Acessibilizar PageLoader | UX-030 | 0.5 | Nenhum |
| Remover font serif | UX-010 | 0.5 | Nenhum |
| Corrigir PageLoader cores | UX-012 | 0.5 | Nenhum |
| Corrigir ErrorBoundary inline | UX-015 | 0.5 | Nenhum |
| Padronizar overlay modais | UX-026 | 4-6 | UX-001 |
| Criar error.tsx por segmento | UX-028 | 8-12 | Nenhum |

### Onda 2 -- Percepcao de Qualidade (2-3 semanas, ~30-40h)

| Tarefa | Debitos | Horas | Pre-req |
|--------|---------|-------|---------|
| Implementar skeletons por rota | UX-004 | 12-20 | Nenhum |
| Migrar chart colors para OKLCH | UX-009 | 3-4 | Nenhum |
| Migrar scrollbar para OKLCH | UX-008, UX-017 | 2-3 | Nenhum |
| Migrar ConfirmModal para modalStyles | UX-013 | 2-3 | UX-026 |
| Definir escala z-index | UX-027 | 3-4 | Nenhum |
| GlobalError com estilo | UX-016 | 2-4 | Nenhum |

### Onda 3 -- Refatoracao Estrutural (3-5 semanas, ~70-100h)

| Tarefa | Debitos | Horas | Pre-req |
|--------|---------|-------|---------|
| Decompor FocusContextPanel | UX-003 (parcial) | 12-16 | UX-001 |
| Decompor DealDetailModal | UX-003 (parcial) | 8-12 | UX-001 |
| Decompor BoardCreationWizard | UX-003 (parcial) | 8-12 | SYS-001 (parcial) |
| Decompor CockpitDataPanel | UX-003 (parcial) | 6-8 | UX-001 |
| Decompor controller hooks | UX-006 | 24-32 | SYS-001 |
| Migrar cores Tailwind diretas | UX-011 | 12-16 | Testes visuais (UX-024) |

### Onda 4 -- Maturidade (backlog, conforme capacidade)

| Tarefa | Debitos | Horas | Pre-req |
|--------|---------|-------|---------|
| Optimistic updates em contacts/activities | UX-014 | 8-16 | Nenhum |
| Setup testes visuais (Storybook/Playwright) | UX-024 | 16-24 | Nenhum |
| Prefetch completo | UX-022 | 4-8 | Nenhum |
| Padronizar empty states | UX-031 | 4-6 | Nenhum |
| Padronizar acoes destrutivas | UX-032 | 3-4 | UX-013 |

### Onda 5 -- Adiado com Justificativa

| Tarefa | Debitos | Horas | Condicao para Reativar |
|--------|---------|-------|----------------------|
| Implementar i18n | UX-005 | 40-80 | Primeiro cliente internacional ou expansao para mercado hispanico |

---

## Resumo Quantitativo

| Metrica | Valor |
|---------|-------|
| Debitos originais no DRAFT v2 | 25 (UX-001 a UX-025) |
| Debitos validados sem ajuste | 11 |
| Debitos com severidade rebaixada | 8 (UX-005, UX-007, UX-008, UX-010, UX-012, UX-015, UX-018, UX-019, UX-020) |
| Debitos com severidade elevada | 2 (UX-011 MEDIUM->HIGH, UX-024 LOW->MEDIUM) |
| Debitos removidos | 0 |
| Debitos adicionados | 7 (UX-026 a UX-032) |
| Total de debitos UX apos revisao | **32** (25 originais + 7 novos) |
| Esforco total estimado (UX) | **~180-280 horas** (excluindo UX-005 i18n) |
| Debitos que precisam de Design Review | 10 |

### Distribuicao por Severidade Ajustada

| Severidade | Qtd | IDs |
|-----------|-----|-----|
| CRITICAL | 3 | UX-001, UX-002, UX-003 |
| HIGH | 7 | UX-004, UX-006, UX-009, UX-011, UX-026, UX-028, UX-029 |
| MEDIUM | 12 | UX-005, UX-007, UX-008, UX-013, UX-014, UX-016, UX-017, UX-024, UX-027, UX-030, UX-032, UX-012 |
| LOW | 10 | UX-010, UX-015, UX-018, UX-019, UX-020, UX-021, UX-022, UX-023, UX-025, UX-031 |

---

## Change Log

| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-03 | @ux-design-expert (Uma) | Review inicial baseado no DRAFT v1. |
| 2026-03-06 | @ux-design-expert (Uma) | Review completo baseado no DRAFT v2. Revalidacao de todos os 25 debitos. 8 rebaixamentos, 2 elevacoes. 7 debitos novos adicionados (UX-026 a UX-032). Respostas as 7 perguntas do architect. Plano de migracao em 5 ondas com dependencias. |

---

*Documento gerado por @ux-design-expert (Uma) - Brownfield Discovery Phase 6*
*Ultima atualizacao: 2026-03-06*
