# UX/Design System Specialist Review

**Revisor:** Brad Frost (Design System Architect)
**Data:** 2026-02-23
**Metodologia:** Metric-driven Atomic Design analysis com contagem automatizada no codebase real
**Fase:** Brownfield Discovery - Phase 6
**Documentos Revisados:** `docs/prd/technical-debt-DRAFT.md` (secao 3), `docs/frontend/frontend-spec.md`

---

## 1. Inventario de Padroes (numeros reais do codebase)

### 1.1 Resumo Quantitativo

| Categoria | Variacoes Encontradas | Variacoes Necessarias | Reducao Potencial |
|---|---|---|---|
| **Elementos `<button>` raw** | 557 ocorrencias ad-hoc | ~50 (via componente unificado) | 91% de pontos de manutencao |
| **Componente `<Button>` (shadcn)** | 0 importacoes nas features | Deveria ser 100% | Componente MORTO |
| **Sistemas de Button concorrentes** | 3 sistemas | 1 | 66.7% |
| **Cores hardcoded hex/rgb em .tsx** | 117 ocorrencias em 13 arquivos | 0 | 100% |
| **Cores hardcoded hex em globals.css** | 34 ocorrencias | ~10 (chart colors) | 70% |
| **Cores slate-* diretas em .tsx** | 2.234 ocorrencias em 114 arquivos | 0 (migrar para tokens) | 100% |
| **Cores utility diretas (red/green/blue/etc)** | 528 ocorrencias em 72 arquivos | 0 (migrar para success/error/warning) | 100% |
| **Uso de tokens semanticos `var(--color-*)`** | 13 ocorrencias em 5 arquivos | Deveria ser ~2.775 | Deficit de 99.53% |
| **Tokens shadcn orfaos (inexistentes)** | 184 ocorrencias em 69 arquivos | 0 (definir ou migrar) | 100% |
| **Tamanhos de texto** | 8 variacoes | 5 (xs, sm, base, lg, xl) | 37.5% |
| **Pesos de fonte** | 7 variacoes | 3 (medium, semibold, bold) | 57% |
| **Border radius** | 14 variacoes | 4 (md, lg, xl, full) | 71% |
| **Valores de spacing unicos** | 40+ variacoes | ~15 (escala padronizada) | 62.5% |
| **Modais/Dialogs** | 23 arquivos modal + 3 sistemas base | 1 sistema base | 66.7% sistemas |
| **Componentes duplicados V1/V2** | 4 pares (1.356 linhas) | 0 pares | 100% |
| **Cockpit V1/V2** | 2.621 linhas (2.525 + 96) | 1 versao decomposta | Componente monolitico |
| **Sistemas de notificacao** | 2 (Toast: 51 refs, NotifStore: 10 refs) | 1 | 50% |
| **CRMContext consumidores** | 98 importacoes | 0 (migrar para hooks) | 100% |

### 1.2 Os 3 Sistemas de Button Concorrentes

| Sistema | Arquivo | Variantes | Tokens Usados | Problema |
|---|---|---|---|---|
| **shadcn Button (CVA)** | `components/ui/button.tsx` | 6 variants x 4 sizes = 24 combinacoes | `bg-primary`, `text-primary-foreground`, `ring-ring`, etc. | **0 importacoes. Tokens NAO existem.** |
| **SubmitButton (FormField)** | `components/ui/FormField.tsx:480-555` | 3 variants (primary/secondary/danger) | `bg-primary-600`, `bg-slate-600`, `bg-red-600` | Tokens validos, mas API diferente |
| **Raw `<button>`** | 557 ocorrencias em ~100 arquivos | Ad-hoc por arquivo | Mistura de tudo | Zero consistencia |

**Dado critico:** O componente `Button` do shadcn existe (`components/ui/button.tsx`, 56 linhas) mas tem **ZERO importacoes** nas features. E codigo morto funcional. Os 557 `<button>` sao TODOS artesanais com classes Tailwind inline.

### 1.3 Tokens Orfaos Detalhados

O componente Button, Badge e Card referenciam **16 tokens CSS que NAO existem** no projeto:

| Token Referenciado | Existe? | Componentes Afetados |
|---|---|---|
| `bg-primary` / `text-primary-foreground` | NAO | button.tsx, badge.tsx |
| `bg-destructive` / `text-destructive-foreground` | NAO | button.tsx, badge.tsx |
| `bg-secondary` / `text-secondary-foreground` | NAO | button.tsx, badge.tsx |
| `bg-accent` / `text-accent-foreground` | NAO | button.tsx |
| `bg-card` / `text-card-foreground` | NAO | card.tsx |
| `text-muted-foreground` / `text-foreground` | NAO | card.tsx, badge.tsx |
| `bg-background` / `border-input` | NAO | button.tsx |
| `ring-ring` / `ring-offset-background` | NAO | button.tsx, badge.tsx |

**Total: 16 tokens, 184 ocorrencias em 69 arquivos.** Estes componentes renderizam com fallbacks do Tailwind (provavelmente transparente ou preto).

### 1.4 Tipografia em Numeros

| Tamanho | Ocorrencias | Peso | Ocorrencias |
|---|---|---|---|
| `text-xs` | 532 | `font-semibold` | 404 |
| `text-sm` | 709 | `font-bold` | 334 |
| `text-base` | 10 | `font-medium` | 270 |
| `text-lg` | 76 | `font-display` | 48 |
| `text-xl` | 19 | `font-black` | 3 |
| `text-2xl` | 56 | `font-normal` | 1 |
| `text-3xl` | 18 | `font-extrabold` | 1 |
| `text-4xl` | 5 | | |

**Problema:** 87.5% dos usos concentrados em `text-xs` (532) e `text-sm` (709). Nao ha hierarquia tipografica clara -- `font-bold` vs `font-semibold` e usado sem regra (404 vs 334, quase 50/50).

### 1.5 Border Radius em Numeros

| Variacao | Ocorrencias |
|---|---|
| `rounded-lg` | 460 |
| `rounded-xl` | 313 |
| `rounded-full` | 281 |
| `rounded-2xl` | 166 |
| `rounded-md` | 49 |
| `rounded-3xl` | 8 |
| Outros 8 variacoes | 13 |

**Total: 14 variacoes.** Nao ha padrao se um card usa `rounded-lg`, `rounded-xl` ou `rounded-2xl`. Modais usam `rounded-xl sm:rounded-2xl`. Botoes usam `rounded-md` ou `rounded-lg`.

---

## 2. Debitos Validados

| ID | Debito | Severidade Original | Severidade Ajustada | Horas Ajustadas | Evidencia Quantitativa |
|---|---|---|---|---|---|
| FE-001 | Componentes duplicados V1/V2 | ALTO | **CRITICO** | 16-24 | 4 pares = 1.356 linhas duplicadas. V2 sao codigo morto (0 importacoes). Mas V1 precisa consolidacao. |
| FE-002 | CRMContext monolitico | ALTO | **CRITICO** | 60-80 | 922 linhas, ~180 props, **98 importacoes** no codebase. Cada mudanca = re-render em 98 componentes. |
| FE-003 | Dois sistemas de notificacao | MEDIO | **ALTO** | 10-14 | Toast: 51 refs. NotifStore: 10 refs. Feedback inconsistente ao usuario. |
| FE-004 | Tokens Button orfaos | MEDIO | **ALTO** | 6-10 | **184 ocorrencias** de tokens inexistentes em **69 arquivos**. Afeta Button, Badge, Card -- 3 primitivos fundamentais. |
| FE-005 | Debug logging excessivo | MEDIO | MEDIO (confirmo) | 3-4 | Impacto limitado a dev. |
| FE-006 | AI Panel nao responsivo | MEDIO | **ALTO** | 16-24 | Funcionalidade de IA inacessivel em mobile/tablet. |
| FE-007 | Ausencia de Error Boundaries | MEDIO | **ALTO** | 10-16 | **0 (zero)** ErrorBoundary em todo o codebase. Qualquer erro = tela branca. |
| FE-008 | Design system informal | BAIXO | **ALTO** | 24-40 | Taxa de adocao de tokens: **0.47%** (13 de 2.775 ocorrencias). Nao e "informal" -- e AUSENTE. |
| FE-009 | Hydration flash mobile | BAIXO | MEDIO | 4-6 | Flash em 100% dos acessos mobile. |
| FE-010 | PWA incompleto | BAIXO | BAIXO (confirmo) | 16-24 | Funcional para instalacao basica. |
| TD-009 | Cockpit v1/v2 coexiste | ALTO | **CRITICO** | 40-60 | DealCockpitClient: **2.525 linhas** (maior arquivo .tsx). FocusClient: 96 linhas (codigo morto). |
| TD-023 | Tailwind config JS com v4 | BAIXO | **MEDIO** | 2-4 | Mesmos valores duplicados em tailwind.config.js E globals.css @theme. Fonte de verdade ambigua. |

---

## 3. Debitos Adicionados

### FE-011: Componente Button Morto (ALTO)

**Descricao:** `components/ui/button.tsx` (shadcn, 56 linhas) tem **0 importacoes** nas features. 557 `<button>` raw usados com classes ad-hoc.
**Impacto:** Zero consistencia de botoes. Cada dev inventa seu estilo.
**Esforco:** 24-40h (criar button unificado + migrar 557 ocorrencias)

### FE-012: Card/Badge com Tokens Inexistentes (ALTO)

**Descricao:** `components/ui/card.tsx` (79 linhas) usa `bg-card`, `text-card-foreground`, `text-muted-foreground`. `components/ui/badge.tsx` (42 linhas) usa tokens identicos ao Button. Nenhum existe.
**Impacto:** Primitivos renderizando com cores erradas/fallback.
**Esforco:** 4-8h

### FE-013: Excesso de Variacoes de Border Radius (MEDIO)

**Descricao:** 14 variacoes de border-radius. Top: rounded-lg (460), rounded-xl (313), rounded-full (281), rounded-2xl (166), rounded-md (49). Sem padrao claro.
**Impacto:** Inconsistencia visual nos cantos.
**Esforco:** 8-16h

### FE-014: DealCockpitClient Monolitico (CRITICO)

**Descricao:** `features/deals/cockpit/DealCockpitClient.tsx` com **2.525 linhas**. Maior arquivo .tsx do projeto. 152 ocorrencias de slate-* nesse arquivo sozinho. Impossivel testar, manter ou reutilizar.
**Esforco:** 40-60h (decomposicao em 6-8 sub-componentes)

### FE-015: Font Weight Inconsistente (BAIXO)

**Descricao:** 7 variacoes de font-weight. font-semibold (404) vs font-bold (334) usados quase 50/50 sem regra. font-black (3) e font-extrabold (1) sao outliers.
**Esforco:** 8-12h

### FE-016: Ausencia de Skeleton Loading (MEDIO)

**Descricao:** Nenhum componente Skeleton encontrado. Unico loading e PageLoader (spinner). Kanban, contacts, dashboard -- todos mostram spinner generico.
**Impacto:** Percepcao de lentidao.
**Esforco:** 12-16h

### FE-017: Kanban DnD sem Acessibilidade (MEDIO)

**Descricao:** Drag-and-drop sem alternativa de teclado. Sem `aria-grabbed`, `aria-dropeffect` ou anuncios ARIA Live para movimentacao.
**Impacto:** Funcionalidade principal inacessivel para usuarios de teclado/screen reader.
**Esforco:** 16-24h

### FE-018: Ausencia de next/image (MEDIO)

**Descricao:** Zero uso de `next/image` nos componentes. Avatares e imagens usam `<img>` sem otimizacao.
**Esforco:** 4-8h

### FE-019: Empty States Inconsistentes (BAIXO)

**Descricao:** Apenas 3 features tem empty states. Contacts, activities, dashboard sem tratamento vazio.
**Esforco:** 8-12h

---

## 4. Analise Atomic Design

### 4.1 Estado Atual dos Atomos (`components/ui/`)

| Componente | Linhas | Status | Adotado nas Features? |
|---|---|---|---|
| Button (shadcn/CVA) | 56 | **MORTO** - tokens inexistentes, 0 importacoes | NAO |
| Card (shadcn) | 79 | **QUEBRADO** - tokens inexistentes | PARCIAL |
| Badge (shadcn) | 42 | **QUEBRADO** - tokens inexistentes | PARCIAL |
| FormField/Input/Select/etc | 603 | **FUNCIONAL** - tokens validos, API consistente | SIM |
| Modal | 188 | **FUNCIONAL** - bem estruturado, a11y completa | SIM |
| SubmitButton (dentro FormField) | ~75 | **FUNCIONAL** - tokens validos | SIM |
| Sheet/FullscreenSheet/ActionSheet | ~200 | **FUNCIONAL** | SIM |
| Tabs (shadcn) | ~50 | **QUEBRADO** - tokens inexistentes | PARCIAL |
| Popover (Radix) | ~30 | **QUEBRADO** | PARCIAL |
| Tooltip (Radix) | ~30 | **FUNCIONAL** | SIM |
| Avatar (Radix) | ~30 | **FUNCIONAL** | SIM |
| Alert | ~30 | **QUEBRADO** - tokens inexistentes | PARCIAL |
| AudioPlayer | ~80 | **FUNCIONAL** | SIM |
| ContactSearchCombobox | ~100 | Molecula disfarada de atomo | N/A |
| CorretorSelect | ~100 | Molecula disfarada de atomo | N/A |
| LossReasonModal | ~120 | Molecula disfarada de atomo | N/A |
| modalStyles.ts | 37 | **FUNCIONAL** - excelente design tokens para modais | SIM |

**Resumo:**
- Atomos funcionais: 8/17 (47%)
- Atomos quebrados (tokens): 5/17 (29.4%)
- Atomos mortos: 1/17 (5.9%)
- Moleculas disfaradas: 3/17 (17.6%)

### 4.2 Hierarquia Atual vs Ideal

| Camada | Atual | Ideal | Gap |
|---|---|---|---|
| **Design Tokens** | 0.47% adocao | 100% | **CATASTROFICO** |
| **Atomos** | 17 (47% funcionais) | ~20 (100% funcionais) | GRANDE |
| **Moleculas** | ~5 (ConfirmModal, FormErrorSummary, etc.) | ~15 | GRANDE |
| **Organismos** | 87 arquivos em features/ (muitos monoliticos) | ~50 (decompostos) | ENORME |
| **Templates/Pages** | 17 rotas protegidas | OK | Pequeno |

### 4.3 Potencial de Reducao

| Padrao | Ocorrencias Atuais | Apos Consolidacao | Reducao |
|---|---|---|---|
| Botoes ad-hoc (`<button>`) | 557 | 1 componente `<Button>` | **99.8%** |
| Cores hardcoded (slate + utility + hex) | 2.879 | 0 (tokens semanticos) | **100%** |
| Modais de feature | 23 modais | ~10 (com composicao via Modal base) | **56.5%** |
| V1/V2 duplicados | 5 pares | 0 | **100%** |
| Sistemas de notificacao | 2 | 1 | **50%** |
| Sistemas de button | 3 | 1 | **66.7%** |

---

## 5. Assessment de Design Tokens

### 5.1 Cobertura Numerica

| Metrica | Valor |
|---|---|
| Tokens semanticos definidos (CSS vars em :root) | 38 variaveis |
| Tokens de cor @theme (Tailwind v4) | 14 cores |
| Ocorrencias usando tokens semanticos `var(--color-*)` | **13** em 5 arquivos |
| Ocorrencias usando cores Tailwind diretas (slate/red/green/etc) | **2.762** |
| Ocorrencias usando hex hardcoded em .tsx | **117** em 13 arquivos |
| Hex hardcoded em globals.css | **34** |
| **Taxa de adocao de tokens semanticos** | **0.47%** |
| Tokens shadcn referenciados mas inexistentes | **16 tokens, 184 ocorrencias** |

### 5.2 As 3 Fontes de Verdade Conflitantes

| Fonte | Arquivo | Conteudo | Problema |
|---|---|---|---|
| **tailwind.config.js** | `tailwind.config.js` | primary-50..900 (hex), dark-bg/card/border/hover (hex) | Duplicado com @theme |
| **globals.css @theme** | `globals.css:8-31` | Mesmos 14 valores duplicados | Duplicado com config.js |
| **globals.css :root** | `globals.css:48-109` | Tokens semanticos OKLCH (bg, surface, muted, border, text, status, glass) | **O unico sistema bem desenhado** |

O sistema semantico em `:root` com OKLCH e moderno e excelente. O problema: **quase ninguem o usa.** Os devs usam classes Tailwind diretas (`text-slate-500`, `bg-red-600`) em vez dos tokens.

### 5.3 Diagnostico

**O design system esta morto na chegada.** Os tokens foram criados com cuidado (OKLCH, light/dark, semanticos) mas nunca foram adotados pelo time. Taxa de 0.47% e funcional zero. O `modalStyles.ts` e o unico caso de sucesso -- usa tokens semanticos consistentemente e e adotado por todos os modais.

---

## 6. Respostas ao Architect (DRAFT Secao 6)

### Pergunta 1: Componentes V1/V2 - Qual manter?

| Par | V1 (linhas) | V2 (linhas) | V2 Importado? | Recomendacao |
|---|---|---|---|---|
| ActivityFormModal | 184 | 171 | NAO | **Deletar V2** (codigo morto). Manter V1 em uso. |
| CreateDealModal | 392 | 160 | NAO | **Deletar V2**. V1 em uso em PipelineView. |
| ContactFormModal | 332 | 117 | NAO | **Deletar V2**. V1 em uso em ContactsPage. |
| DealCockpit | 2.525 | 96 (Focus) | NAO | **Deletar Focus**. Decompor V1 em 6-8 sub-componentes. |

**Procedimento:** Deletar V2/Focus imediatamente (codigo morto confirmado). Depois decompor os V1 monoliticos.

### Pergunta 2: CRMContext - Migracao incremental?

**Sim, obrigatoriamente incremental.** 98 importacoes, 922 linhas.

**Estrategia:**
1. Criar hooks domain-specific como wrappers do CRMContext existente
2. Migrar feature por feature (menores primeiro: decisions, profile, reports)
3. Depois maiores: boards/Kanban (complexo), dashboard, contacts
4. Quando 0 consumidores diretos, remover CRMContext

**Maiores consumidores (por complexidade de UI, medido por refs slate-*):**
- `DealCockpitClient.tsx`: 152 refs
- `FocusContextPanel.tsx`: 96 refs
- `BoardCreationWizard.tsx`: 104 refs
- `DealDetailModal.tsx`: 87 refs

### Pergunta 3: AI Panel responsivo

**FullscreenSheet** (ja existe como `components/ui/FullscreenSheet.tsx`).
- Mobile: FullscreenSheet bottom-up (90% da tela)
- Tablet: Sheet lateral 50%
- Desktop: Sidebar w-96 (manter atual)

### Pergunta 4: Tokens Button

**Criar os 16 tokens semanticos do shadcn** no `globals.css`. Mapeamento:

```css
:root {
  --background: var(--color-bg);
  --foreground: var(--color-text-primary);
  --primary: oklch(0.62 0.19 250);
  --primary-foreground: #ffffff;
  --destructive: var(--color-error);
  --destructive-foreground: #ffffff;
  --secondary: var(--color-muted);
  --secondary-foreground: var(--color-text-primary);
  --accent: var(--color-surface);
  --accent-foreground: var(--color-text-primary);
  --ring: var(--color-primary-400);
  --input: var(--color-border);
  --border: var(--color-border);
  --card: var(--color-surface);
  --card-foreground: var(--color-text-primary);
  --muted-foreground: var(--color-text-muted);
}
```

**Estimativa: 2-4h.** Desbloqueia Button, Card, Badge, Tabs, Popover, Alert -- 6 componentes de uma vez.

### Pergunta 5: Error Boundaries

**Estrategia em camadas:**
1. **Global** (`app/(protected)/layout.tsx`): 2h -- captura erros catastroficos
2. **Por feature** (6 feature pages): 6h -- fallback contextualizado com retry
3. **Componentes criticos** (AI Panel, Kanban): 2h -- isola complexidade

### Pergunta 6: Sistemas de notificacao

**Manter useNotificationStore (Zustand).** Toast tem 51 refs vs NotifStore 10 refs.

Estrategia: Criar adapter `ToastContext -> useNotificationStore`. Migrar incrementalmente. Preservar acessibilidade do Toast (role="alert", aria-live).

### Pergunta 7: Storybook

**Tokens primeiro, Storybook depois.**

Com 0.47% de adocao, Storybook documentaria o caos. Sequencia:
1. Definir tokens semanticos (2-4h)
2. Migrar componentes shadcn quebrados (4-8h)
3. Criar Button funcional e migrar (24-40h)
4. SO ENTAO Storybook (24-40h)

---

## 7. Estrategia de Consolidacao (Phased Rollout)

### Phase 1 - Foundation (Semanas 1-2) [36-64h]

**Objetivo:** Fonte de verdade unica para tokens. Primitivos funcionais.

| Tarefa | Esforco | Impacto |
|---|---|---|
| Definir 16 tokens semanticos shadcn em globals.css | 2-4h | Desbloqueia 6 componentes primitivos |
| Remover duplicacao tailwind.config.js vs globals.css @theme | 2-4h | 1 fonte de verdade |
| Migrar Button, Card, Badge, Tabs, Alert, Popover para tokens validos | 4-8h | 6 componentes corrigidos |
| Deletar codigo morto V2/Focus | 2-4h | -1.356 linhas de confusao |
| Adicionar ErrorBoundary global + por feature | 10-16h | App nao crasha mais |
| Criar adapter Toast -> NotificationStore | 4-8h | Caminho para unificacao |
| Remover debug logging | 3-4h | Codigo limpo |
| Limpar duplicacao tailwind config | 2-4h | 1 fonte de verdade |

### Phase 2 - High Impact (Semanas 3-6) [96-152h]

**Objetivo:** Componentes mais usados consistentes. CRMContext em migracao.

| Tarefa | Esforco | Impacto |
|---|---|---|
| Criar Button unificado + migrar 557 `<button>` raw | 24-40h | Consistencia de botoes em toda app |
| Iniciar migracao CRMContext (features menores: decisions, profile, reports) | 16-24h | -30% consumidores CRMContext |
| Decomposicao DealCockpitClient (2.525 linhas -> 6-8 componentes) | 40-60h | Manutenibilidade do componente mais critico |
| Migrar cores slate-* para tokens (top 20 arquivos por ocorrencia) | 16-24h | ~40% do codebase tokenizado |
| Criar Skeleton loading component + implementar nas 4 telas principais | 12-16h | Percepcao de velocidade |

### Phase 3 - Long Tail (Semanas 7-12) [132-196h]

**Objetivo:** Cobertura completa de tokens. Eliminacao total de ad-hoc.

| Tarefa | Esforco | Impacto |
|---|---|---|
| Migrar restante dos 2.234 refs slate-* | 40-60h | 100% tokens semanticos |
| Migrar 528 refs de cores utility (red/green/blue) | 24-32h | Cores consistentes |
| Eliminar 117 hex hardcoded em .tsx | 8-16h | Zero hardcoded |
| Completar migracao CRMContext (features maiores: boards, contacts, deals) | 32-48h | CRMContext removivel |
| Padronizar border-radius (14 -> 4 variacoes) | 8-16h | Consistencia visual |
| Padronizar font-weight (7 -> 3 variacoes) | 8-12h | Hierarquia tipografica |
| AI Panel responsivo | 16-24h | IA acessivel em mobile |

### Phase 4 - Enforcement (Semana 13+) [32-56h]

**Objetivo:** Prevenir regressao. Documentar.

| Tarefa | Esforco | Impacto |
|---|---|---|
| ESLint: proibir `<button>` raw (forcar `<Button>`) | 4-8h | Zero botoes ad-hoc futuros |
| ESLint: proibir cores slate-*/red-*/green-* diretas | 4-8h | Forca token usage |
| Stylelint: proibir hex hardcoded | 2-4h | Zero hardcoded futuro |
| Storybook para primitivos | 24-40h | Documentacao viva |
| CI check: token coverage report | 4-8h | Metricas continuas |
| Kanban DnD acessibilidade | 16-24h | a11y completa |

---

## 8. ROI Estimado

### Investimento Total

| Phase | Esforco (h) | Prazo |
|---|---|---|
| Phase 1 - Foundation | 36-64h | 2 semanas |
| Phase 2 - High Impact | 96-152h | 4 semanas |
| Phase 3 - Long Tail | 132-196h | 6 semanas |
| Phase 4 - Enforcement | 32-56h | 2+ semanas |
| **TOTAL** | **296-468h** | **~14-17 semanas (1 dev)** |

### Retorno Esperado

| Metrica | Antes | Depois | Melhoria |
|---|---|---|---|
| Tempo para criar nova tela | Alto (copiar/colar, ajustar cores) | Baixo (compor atomos) | **-60%** |
| Bugs visuais por sprint | Frequentes (tokens inexistentes) | Raros (enforced) | **-80%** |
| Onboarding de dev | Lento (3 sistemas de button, 3 fontes de cor) | Rapido (1 documentado) | **-70%** |
| Linhas duplicadas | ~4.000 (V1/V2 + cockpit) | 0 | **-100%** |
| Re-renders CRMContext | 98 componentes a cada mudanca | 0 (hooks isolados) | **-100%** |
| Token coverage | 0.47% | >95% | **+94.53pp** |
| Primitivos funcionais | 47% | 100% | **+53pp** |

### Custo de Inacao

Cada sprint sem intervencao:
- 557 `<button>` vira 600, 700... (entropia exponencial)
- 98 consumidores CRMContext vira 120, 150...
- 2.525 linhas do Cockpit vira 3.000...
- Novos devs copiam o padrao ad-hoc existente
- Tokens semanticos permanecem mortos (0.47%)

---

## 9. Totais Atualizados de Frontend

| Metrica | DRAFT Original | Revisado |
|---|---|---|
| Total de debitos FE | 10 | **19** |
| Criticos | 0 | **3** (FE-001, FE-002, FE-014/TD-009) |
| Altos | 2 | **7** (FE-003, FE-004, FE-006, FE-007, FE-008, FE-011, FE-012) |
| Medios | 5 | **6** (FE-005, FE-009, FE-013, FE-016, FE-017, FE-018, TD-023) |
| Baixos | 3 | **3** (FE-010, FE-015, FE-019) |
| Esforco total estimado | 116-216h | **296-468h** |

---

## 10. O Diagnostico em 5 Numeros

| # | Numero | O que significa |
|---|---|---|
| **1** | **0.47%** | Taxa de adocao de design tokens. O sistema existe, ninguem usa. |
| **2** | **557** | Botoes `<button>` ad-hoc. O componente Button tem ZERO importacoes. |
| **3** | **2.762** | Ocorrencias de cores hardcoded que deveriam ser tokens semanticos. |
| **4** | **2.525** | Linhas do maior componente (DealCockpitClient). Intestavel. Inmantenivel. |
| **5** | **184** | Ocorrencias de tokens CSS que nao existem. Componentes renderizando errado. |

---

*Revisao gerada por Brad Frost (Design System Architect) como parte da Brownfield Discovery Phase 6.*
*Metodologia: Contagem automatizada via grep/find no codebase real. Zero opiniao sem dado.*
*Synkra AIOS v2.2.0*
