# QA Review - Technical Debt Assessment

**Reviewer:** @qa (Quinn)
**Data:** 2026-03-03
**Documentos revisados:** technical-debt-DRAFT.md + db-specialist-review.md + ux-specialist-review.md + system-architecture.md + DB-AUDIT.md + frontend-spec.md (6 documentos, ~3.000 linhas)

---

## Gate Status: APPROVED

O assessment esta completo o suficiente para prosseguir para a Phase 8 (consolidacao final do @architect). Os gaps identificados abaixo sao complementares -- nenhum deles bloqueia a consolidacao, mas devem ser incorporados no documento final.

---

## 1. Gaps Identificados

### 1.1 Areas Nao Cobertas pelo Assessment

| Gap | Descricao | Severidade do Gap | Recomendacao |
|-----|-----------|-------------------|--------------|
| **GAP-01** | **API Routes nao auditadas.** O sistema tem 69 API routes, incluindo 13 routes de installer e a API publica v1 completa. Nenhum debito foi catalogado sobre seguranca, validacao de input, ou error handling nas API routes. A system-architecture documenta a existencia, mas o DRAFT nao analisa. | MEDIUM | Adicionar secao "5. Debitos de API" no assessment final, ou incluir como sub-secao de Sistema. Minimo: auditar rate limiting, input validation, e error handling na API publica v1. |
| **GAP-02** | **AI Agent nao auditado.** O agente de IA (`lib/ai/crmAgent.ts`, 24KB) usa service role para acessar dados, tem 25+ tools, e a unica protecao mencionada e o `AI_TOOL_APPROVAL_BYPASS` env var. TD-SYS-001 cobre o admin client, mas nao cobre as tools individuais do agente que podem executar acoes destrutivas (delete deals, merge contacts). | MEDIUM | Incluir auditoria das AI tools como sub-item de TD-SYS-001 ou como debito separado. Verificar quais tools bypassam approval e quais executam write operations. |
| **GAP-03** | **Middleware de auth sem auditoria.** O middleware (`middleware.ts` + `lib/supabase/middleware.ts`) e o ponto de entrada de seguranca. Nao ha debito catalogado sobre a ausencia de CSP headers, CORS, ou rate limiting no middleware level (rate limiting existe apenas na API publica). | LOW | Avaliar se merece debito dedicado ou se e aceitavel para o estagio atual do produto. |
| **GAP-04** | **Server Actions sem cobertura.** `app/actions/` contem Server Actions para contacts, deals, notifications, contact-metrics. Nao ha auditoria de seguranca dessas actions (validacao de input, autorizacao, error handling). | LOW | Incluir como nota no assessment final. Server Actions herdam autorizacao do middleware, mas validacao de input precisa ser verificada. |
| **GAP-05** | **Dependency audit ausente.** O projeto usa ~50+ dependencias em producao. Nenhum debito cataloga vulnerabilidades conhecidas em dependencias (npm audit). Zod v4 e relativamente novo, React 19.2.1 esta fixado em vez de range. | LOW | Executar `npm audit` e incluir resultado como apendice no assessment final. |
| **GAP-06** | **Supabase Edge Functions nao analisadas.** O diretorio `supabase/functions/` existe mas nao foi mencionado em nenhum documento. Pode estar vazio ou conter funcoes nao documentadas. | LOW | Verificar conteudo na Phase 8. Se vazio, documentar como tal. |

### 1.2 Blind Spots Entre Especialistas

| Blind Spot | Descricao |
|------------|-----------|
| **BS-01** | O @data-engineer identificou que ~13 tabelas usam subquery direta em RLS (TD-DB-NEW-002, ~40 policies), mas o DRAFT original so mencionava 2 tabelas. O escopo real e 6.5x maior. O @architect precisa atualizar a estimativa de esforco no assessment final. |
| **BS-02** | O @ux-design-expert identificou 2.475 ocorrencias de cores Tailwind diretas em 137 arquivos, mas o DRAFT classificava TD-UX-010 como MEDIUM sem essa quantificacao. A escala do problema era subestimada. |
| **BS-03** | Nenhum especialista analisou a intersecao AI + DB: o agente de IA usa `createStaticAdminClient()` (service role) para executar queries. Se uma AI tool construir queries dinamicas, existe risco de injection ou data leakage que vai alem do que TD-SYS-001 cobre. |

---

## 2. Riscos Cruzados

| Risco | Areas Afetadas | Probabilidade | Impacto | Mitigacao |
|-------|----------------|---------------|---------|-----------|
| **RC-01: Regressao ao decompor CRMContext** | Frontend (estado), todas as features, testes | Alta | Alto | TD-CC-001 e o debito mais interconectado (bloqueia 5 outros). A decomposicao pode quebrar qualquer feature que usa `useCRM()`. Mitigacao: criar test suite de regressao ANTES da decomposicao, cobrindo todos os 930 linhas de comportamento. A cobertura de testes atual (11.6%) e insuficiente para essa mudanca. |
| **RC-02: Fix de RLS pode bloquear acesso legitimO** | DB, Frontend, todas as operacoes CRUD | Media | Alto | Fixes de RLS (TD-DB-004, TD-DB-009, TD-DB-NEW-002) afetam acesso a dados. Um erro na policy pode bloquear usuarios de acessar seus proprios dados. Mitigacao: testar CADA policy pos-fix com queries manuais como usuario regular, admin e corretor. Staging obrigatorio. |
| **RC-03: Migration de tokens pode quebrar dark mode** | Frontend (design system), todas as paginas | Media | Medio | Migrar 2.475 ocorrencias de cores Tailwind (TD-UX-010) para tokens pode introduzir inconsistencias visuais, especialmente no dark mode onde o mapeamento nao e 1:1. Mitigacao: implementar testes visuais (TD-UX-019) ANTES da migracao de tokens. |
| **RC-04: Fix de webhook + campos incompativeis** | DB (funcoes), webhooks outbound, integracoes externas | Media | Alto | TD-DB-001 + TD-DB-NEW-001 requerem reescrever INSERTs com schema correto. Se os campos nao corresponderem exatamente, webhooks continuam quebrados mas agora de forma diferente. Mitigacao: usar funcao original do schema_init como base (conforme @data-engineer recomendou). Testar com deal move real em staging. |
| **RC-05: Backfill de org_id pode encontrar orfaos irrecuperaveis** | DB (integridade), RLS | Baixa | Medio | TD-DB-017/018/024 requerem backfill antes de SET NOT NULL. Se existirem registros sem owner_id E sem organization_id, nao ha como derivar a org. Mitigacao: executar SELECT COUNT antes do ALTER; resolver orfaos manualmente ou com DELETE se forem dados de teste. |
| **RC-06: Unificacao de Button pode quebrar 111 arquivos** | Frontend (todos os componentes), design system | Media | Baixo | TD-UX-001 requer grep/replace em 111 arquivos. Um erro no replace pode quebrar imports em multiplos locais. Mitigacao: o replace e mecanico (`@/app/components/ui/Button` -> `@/components/ui/button`), mas exige verificacao visual por amostragem. Executar lint + typecheck apos replace. |
| **RC-07: Seguranca DB + Seguranca App desalinhadas** | DB (RLS), App (admin client), AI (tools) | Media | Alto | TD-SYS-001 (admin client bypassa RLS) e TD-DB-003/009 (SECURITY DEFINER sem org check) sao vulnerabilidades da mesma classe (cross-tenant), mas em camadas diferentes. Corrigir apenas uma camada sem a outra deixa a vulnerabilidade aberta pela outra via. Mitigacao: resolver ambas em conjunto no Sprint 1 de seguranca. |

---

## 3. Validacao de Dependencias

### 3.1 Cadeia de Bloqueio -- Validacao

A cadeia de dependencias proposta no DRAFT (Secao 6) esta **correta e bem mapeada**. Verificacao ponto a ponto:

| Dependencia | Valida? | Notas |
|-------------|---------|-------|
| TD-CC-001 bloqueia TD-CC-002 | Sim | Context split precisa acontecer antes de unificar estado |
| TD-CC-001 bloqueia TD-CC-004 | Sim | BoardCreationWizard depende diretamente de CRMContext |
| TD-CC-001 bloqueia TD-UX-002 | Parcial | Apenas BoardCreationWizard depende; FocusContextPanel, DealDetailModal e outros componentes gigantes NAO dependem de CRMContext para decomposicao. Podem ser decompostos independentemente. |
| TD-CC-001 bloqueia TD-SYS-003 | Sim | Debug logging esta dentro do CRMContext |
| TD-CC-001 bloqueia TD-UX-013 | Sim | Optimistic updates centralizados no CRMContext |
| TD-SYS-005 depende de TD-CC-001 + TD-SYS-014 | Sim | SSR requer providers desacoplados |
| TD-DB-001 correlato TD-DB-008 | Sim | Confirmado pelo @data-engineer como causa raiz |
| TD-DB-002 antes de TD-DB-016/024 | Parcial | TD-DB-002 foi reclassificado para MEDIUM pelo @data-engineer. A ordem ainda faz sentido mas a urgencia diminuiu. |
| TD-UX-001 antes de TD-UX-016/TD-SYS-019 | Sim | Unificacao do Button desbloqueia SubmitButton e ErrorBoundary |

### 3.2 Dependencias Nao Mapeadas

| Dependencia Nao Documentada | Descricao |
|-----------------------------|-----------|
| **TD-UX-019 (testes visuais) deveria bloquear TD-UX-010 (migracao de cores)** | A migracao de 2.475 ocorrencias de cores sem testes visuais e arriscada. O @ux-design-expert recomendou upgrade de TD-UX-019 para MEDIUM exatamente por isso. Adicionar esta dependencia explicitamente. |
| **TD-SYS-004 (cobertura de testes) deveria bloquear TD-CC-001 (CRMContext split)** | A decomposicao do CRMContext sem cobertura de testes adequada e a mudanca de maior risco do assessment inteiro. No minimo, testes de regressao para os fluxos criticos do CRMContext devem existir ANTES da decomposicao. |
| **TD-DB-NEW-002 (subquery -> function) depende de estabilidade de profiles RLS** | O @data-engineer nota que a subquery funciona hoje porque profiles_select usa `get_user_organization_id()`. Qualquer mudanca futura em profiles quebraria ~40 policies. Esta dependencia temporal deveria estar documentada. |

### 3.3 Conflitos de Prioridade Entre Especialistas

| Item | @data-engineer | @ux-design-expert | DRAFT | Resolucao Recomendada |
|------|----------------|-------------------|-------|-----------------------|
| TD-DB-002 (FK sem ON DELETE) | **MEDIUM** (soft delete mitiga) | N/A | **CRITICAL** | Aceitar MEDIUM. Justificativa tecnica do @data-engineer e solida -- soft delete torna o cenario CRITICAL teorico, nao pratico. |
| TD-UX-002 (componentes gigantes) | N/A | **HIGH** (impacto indireto no usuario) | **CRITICAL** | Aceitar HIGH. O impacto para o usuario final e indireto (manutenibilidade, bundle). O risco e para a equipe, nao para o usuario. |
| TD-UX-004 / TD-CC-003 (i18n) | N/A | **MEDIUM** (sem demanda atual) | **HIGH** | Aceitar MEDIUM. Produto focado no mercado brasileiro. Sem demanda de internacionalizacao. |
| TD-DB-005 (dupla notificacoes) | **MEDIUM** (sem bloqueio operacional) | N/A | **HIGH** | Aceitar MEDIUM. Ambas tabelas funcionam. O problema e de dominio limpo, nao de seguranca ou funcionalidade. |
| TD-DB-007 (migrations nao idempotentes) | **MEDIUM** (Supabase marca como aplicada) | N/A | **HIGH** | Aceitar MEDIUM. O cenario de re-run e raro e apenas para recovery manual. |

**Veredicto:** Todos os conflitos tem justificativa tecnica valida dos especialistas. Recomendo aceitar os ajustes dos especialistas na consolidacao final.

---

## 4. Validacao de Ajustes de Severidade

### 4.1 Ajustes do @data-engineer

| ID | Original | Ajustado | Justificado? | Comentario QA |
|----|----------|----------|-------------|---------------|
| TD-DB-002 | CRITICAL | MEDIUM | **Sim** | Soft delete torna hard delete excepcional. O risco teorico nao justifica CRITICAL. |
| TD-DB-005 | HIGH | MEDIUM | **Sim** | Sem bloqueio operacional. Confusao de dominio, nao de seguranca. |
| TD-DB-007 | HIGH | MEDIUM | **Sim** | Supabase marca migrations como aplicadas. Re-run e raro. |
| TD-DB-009 | MEDIUM | HIGH | **Sim** | Mesma classe de vulnerabilidade que TD-DB-003 (cross-tenant SECURITY DEFINER). Impacto financeiro direto em LTV. Upgrade justificado. |
| TD-DB-011 | MEDIUM | LOW | **Sim** | Comportamento possivelmente intencional (audit trail). Sem impacto funcional. |
| TD-DB-021 | MEDIUM | LOW | **Sim** | Puramente cosmetico. VARCHAR no PostgreSQL nao tem vantagem de performance. |
| TD-DB-022 | MEDIUM | LOW | **Sim** | Funciona corretamente. Inconsistencia cosmetica apenas. |
| TD-DB-024 | LOW | MEDIUM | **Sim** | boards.organization_id nullable pode afetar RLS em JOINs. Impacto maior que LOW. |
| TD-DB-030 | LOW | MEDIUM | **Sim** | Secrets em texto claro representam risco em cenario de breach. RLS nao protege dados em repouso. |

**Conclusao:** 9/9 ajustes do @data-engineer sao tecnicamente justificados. Nenhum conflito.

### 4.2 Ajustes do @ux-design-expert

| ID | Original | Ajustado | Justificado? | Comentario QA |
|----|----------|----------|-------------|---------------|
| TD-UX-002 | CRITICAL | HIGH | **Sim** | Impacto indireto no usuario. Afeta manutenibilidade e bundle, nao funcionalidade visivel. |
| TD-UX-004 | HIGH | MEDIUM | **Sim** | Mercado brasileiro. Sem demanda de internacionalizacao atual. |
| TD-UX-006 | HIGH | MEDIUM | **Sim** | Import paths inconsistentes tem impacto zero no usuario final. DX only. |
| TD-UX-007 | HIGH | MEDIUM | **Sim** | Scrollbars sao detalhe periferico. Dark mode ja tem valores separados. |
| TD-UX-009 | MEDIUM | LOW | **Sim** | Se a fonte nao e importada, impacto zero. |
| TD-UX-010 | MEDIUM | HIGH | **Sim** | 2.475 ocorrencias em 137 arquivos. Escala subestimada no DRAFT. Upgrade fortemente justificado pelos dados concretos. |
| TD-UX-019 | LOW | MEDIUM | **Sim** | Ausencia de testes visuais e especialmente critica durante migracoes de tokens e decomposicao de componentes. |
| TD-SYS-012 | MEDIUM | HIGH | **Sim** | 14+ paginas sem loading.tsx = tela branca. Impacto direto na percepcao de qualidade. |
| TD-CC-003 | HIGH | MEDIUM | **Sim** | Mesma justificativa de TD-UX-004. Consistente. |

**Conclusao:** 9/9 ajustes do @ux-design-expert sao justificados com dados concretos do codebase. Nenhum conflito.

### 4.3 Conflitos Entre Especialistas

**Nao ha conflitos diretos.** Os especialistas ajustaram debitos de suas respectivas areas sem contradizer um ao outro. Os unicos pontos de sobreposicao (TD-CC-003/TD-UX-004 sobre i18n) estao alinhados na mesma direcao (rebaixar para MEDIUM).

---

## 5. Testes Requeridos

### 5.1 Testes de Regressao (por cluster de resolucao)

**Cluster 1: Seguranca DB**

| Teste | Debitos Cobertos | Prioridade |
|-------|-----------------|-----------|
| Webhook outbound: criar deal, mover de stage, verificar INSERT em `webhook_events_out` e `webhook_deliveries` com campos corretos | TD-DB-001, TD-DB-008, TD-DB-NEW-001 | P1 |
| merge_contacts: tentar merge cross-org como usuario regular, verificar DENY | TD-DB-003, TD-DB-NEW-003 | P1 |
| merge_contacts: merge concorrente do mesmo loser, verificar serialização (FOR UPDATE) | TD-DB-003 | P1 |
| increment/decrement_contact_ltv: tentar manipular LTV de contato de outra org | TD-DB-009 | P1 |
| ai_suggestion_interactions: verificar que usuario so ve suas proprias interacoes | TD-DB-004 | P2 |

**Cluster 2: CRMContext Refactor**

| Teste | Debitos Cobertos | Prioridade |
|-------|-----------------|-----------|
| Snapshot test de todos os fluxos criticos do CRMContext ANTES da decomposicao: addDeal, moveDeal, deleteDeal, wallet health check, stagnant deals detection | TD-CC-001 | P1 (pre-requisito) |
| Optimistic update de deal move: verificar que UI atualiza imediatamente e reverte em caso de erro | TD-CC-001, TD-UX-013 | P2 |
| Estado sincronizado entre Context e Zustand apos decomposicao | TD-CC-002 | P2 |
| BoardCreationWizard: fluxo completo de criacao de board apos decomposicao | TD-CC-004 | P2 |

**Cluster 3: Design System Tokens**

| Teste | Debitos Cobertos | Prioridade |
|-------|-----------------|-----------|
| Screenshot comparison de todas as paginas em light e dark mode ANTES e APOS migracao de tokens | TD-UX-010, TD-UX-007, TD-UX-008 | P1 (pre-requisito) |
| Verificar que scrollbars, charts, modais e overlays manteem aparencia correta em ambos os modos | TD-UX-007, TD-UX-008, TD-UX-020 | P2 |

### 5.2 Testes de Integracao

| Teste | Areas Cruzadas | Prioridade |
|-------|---------------|-----------|
| Kanban end-to-end: carregar board com 50+ deals, verificar que contacts sao resolvidos em batch (nao N+1), mover deal, verificar webhook, verificar realtime sync | TD-CC-005, TD-DB-006, TD-DB-015, TD-DB-001 | P1 |
| Multi-tenant isolation: como usuario da Org A, tentar acessar dados da Org B via RPC (merge_contacts, increment_ltv), via API publica, e via AI tools | TD-DB-003, TD-DB-009, TD-SYS-001 | P1 |
| Auth flow completo: login -> middleware -> RLS -> query -> realtime | Middleware, RLS, Frontend | P2 |
| Migration rollback test: aplicar fix de notify_deal_stage_changed em staging, reverter, re-aplicar | TD-DB-001, Migration strategy | P2 |

### 5.3 Baselines de Performance

| Metrica | Quando Capturar | Debitos Relacionados |
|---------|----------------|---------------------|
| Kanban load time (50, 100, 200 deals) | ANTES e APOS fix de N+1 (TD-CC-005) | TD-CC-005, TD-DB-006, TD-DB-012 |
| First Contentful Paint em paginas protegidas | ANTES e APOS loading.tsx (TD-SYS-012) | TD-SYS-012, TD-SYS-005 |
| Bundle size total e por chunk | ANTES e APOS decomposicao de componentes gigantes | TD-UX-002, TD-CC-001 |
| Re-render count em operacoes CRUD | ANTES e APOS CRMContext split | TD-CC-001, TD-CC-002 |
| Query count em dashboard load | ANTES e APOS indexes (TD-DB-012/013/014) | TD-DB-012, TD-DB-013, TD-DB-014 |

### 5.4 Validacao de Seguranca

| Teste | Debitos Relacionados | Prioridade |
|-------|---------------------|-----------|
| Penetration test de cross-tenant access via todos os RPCs SECURITY DEFINER | TD-DB-003, TD-DB-009, TD-SYS-001 | P1 |
| Verificar que admin client (service role) NAO e exposto a client-side (env var com NEXT_PUBLIC_ prefix) | TD-SYS-001 | P1 |
| Verificar que AI tools destrutivas (delete, merge, update) requerem approval quando `AI_TOOL_APPROVAL_BYPASS` nao esta setado | TD-SYS-001, GAP-02 | P1 |
| Verificar que API keys de IA NAO aparecem em responses de API, logs de cliente, ou bundle JavaScript | TD-SYS-002, TD-CC-006 | P1 |
| Verificar que debug endpoint (`127.0.0.1:7242`) nao e acessivel em producao (NODE_ENV check) | TD-SYS-003 | P2 |
| npm audit: verificar vulnerabilidades conhecidas em dependencias | GAP-05 | P2 |

---

## 6. Parecer Final

### 6.1 Qualidade do Processo de Discovery

O processo de Brownfield Discovery foi executado com rigor. Os 6 documentos demonstram:

1. **Cobertura ampla:** 71 debitos catalogados no DRAFT, expandidos para 76+ apos revisoes dos especialistas (5 DB novos + 5 UX novos - debitos zerados).
2. **Cross-reference consistente:** Cada debito do DRAFT referencia a origem no documento fonte (TD-001 sys-arch, SEC-03 db-audit, DEBT-001 frontend-spec). Rastreabilidade mantida.
3. **Especialistas rigorosos:** Ambos os especialistas fizeram verificacao direta no codigo-fonte, nao apenas leitura do DRAFT. O @data-engineer comparou migrations linha a linha; o @ux-design-expert fez grep quantitativo (2.475 ocorrencias, 111 imports).
4. **Respostas completas as perguntas:** As 12 perguntas do architect (6 para cada especialista) foram respondidas com profundidade tecnica e recomendacoes acionaveis.
5. **Debitos adicionados com evidencia:** Os 10 debitos novos (5 DB + 5 UX) foram descobertos durante a revisao, nao inventados. Cada um tem evidencia de codigo.

### 6.2 Pontos Fortes do Assessment

- **Clusters de resolucao conjunta** facilitam o planejamento de sprints
- **Dependencias mapeadas** evitam trabalho desperdicado
- **Estimativas revisadas** pelo @data-engineer (57-81h DB vs 74-116h DRAFT) refletem escopo real
- **Perguntas e respostas** criaram um dialogo produtivo entre architect e especialistas
- **Ajustes de severidade** sao todos justificados com dados concretos

### 6.3 Pontos de Atencao para Phase 8

1. **Incorporar os 6 gaps identificados** (GAP-01 a GAP-06) no assessment final, pelo menos como secao de "Areas Nao Avaliadas" com recomendacao de auditoria futura.
2. **Atualizar TD-DB-002 de CRITICAL para MEDIUM** conforme recomendacao do @data-engineer.
3. **Atualizar TD-UX-010 de MEDIUM para HIGH** conforme dados concretos do @ux-design-expert (2.475 ocorrencias).
4. **Adicionar dependencia explicita:** TD-UX-019 (testes visuais) deve preceder TD-UX-010 (migracao de cores).
5. **Adicionar dependencia explicita:** Cobertura minima de testes para CRMContext deve preceder TD-CC-001.
6. **Resolver o BS-03:** A intersecao AI + DB precisa de pelo menos uma nota no assessment final sobre o risco de AI tools com service role executando queries nao auditadas.
7. **Contagem final de debitos** deve refletir os ajustes: removidos (TD-DB-027, TD-DB-028 como nao-debitos), adicionados (TD-DB-NEW-001 a NEW-005, TD-UX-020 a UX-024), e reclassificados.

### 6.4 Estimativa Total Consolidada

| Area | DRAFT Original | Pos-Revisao Especialistas | Observacao |
|------|---------------|---------------------------|-----------|
| Sistema | ~200-300h | ~200-300h | Sem revisao de especialista (pendente @architect Phase 8) |
| Database | ~74-116h | **~57-81h** | Reducao por reclassificacao (TD-DB-002) e priorizacao |
| Frontend/UX | ~200-330h | **~290-410h** | Aumento por 5 debitos novos + TD-UX-010 escopo maior |
| Cross-Cutting | ~120-190h | ~120-190h | Sem alteracao significativa |
| **Total** | **~490-610h** | **~550-750h** | Aumento liquido de ~60-140h por escopo real descoberto |

**Nota:** O aumento e esperado e saudavel -- significa que os especialistas descobriram trabalho que estava oculto. E melhor saber agora do que descobrir durante a implementacao.

---

## Change Log

| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-03 | @qa (Quinn) | QA Review inicial. Gate: APPROVED. 6 gaps identificados, 7 riscos cruzados mapeados, 3 dependencias nao documentadas descobertas, 18 ajustes de severidade validados (todos justificados), suite de testes requeridos definida. |
