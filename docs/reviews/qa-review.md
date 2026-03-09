# QA Review - Technical Debt Assessment (Phase 7 v2)

**Reviewer:** @qa (Quinn)
**Data:** 2026-03-06
**Gate Status:** APPROVED
**Documentos revisados:** technical-debt-DRAFT.md v2 + db-specialist-review.md v2 + ux-specialist-review.md v2 + system-architecture.md v2 + DB-AUDIT.md + frontend-spec.md v2 (6 documentos, ~4.500 linhas)
**Revisao anterior:** qa-review.md 2026-03-03 (baseado no DRAFT v1 e reviews v1)

---

## 1. Resumo da Revisao

Esta e a segunda passagem do quality gate (Phase 7) sobre o Technical Debt Assessment do ZmobCRM Brownfield Discovery. O DRAFT v2 consolida 67 debitos identificados nas Phases 1-3 (@architect, @data-engineer, @ux-design-expert), e as reviews v2 dos especialistas (Phases 5-6) validaram, ajustaram, removeram e adicionaram debitos com base em verificacao direta do codigo-fonte e das migrations.

**Impressao geral:** O assessment melhorou significativamente do v1 para o v2. O DRAFT v2 tem estrutura clara, priorizacao unificada, grafo de dependencias e plano de ondas. As reviews dos especialistas sao rigorosas -- o @data-engineer verificou cada debito contra os 54 arquivos de migration, e o @ux-design-expert fez contagem quantitativa de imports e ocorrencias. Os achados sao bem fundamentados.

**Achado mais relevante desta revisao:** O @data-engineer identificou que **5 dos 21 debitos de database ja estavam corrigidos** em migrations posteriores ao schema_init. Isso foi verificado e confirmado contra o codigo real das migrations. A auditoria original (DB-AUDIT.md, Phase 2) documentou debitos do schema_init sem cross-reference completa com as 52+ migrations subsequentes, levando a falsos positivos. O processo de review dos especialistas cumpriu seu papel ao detectar e corrigir isso.

---

## 2. Gaps Identificados

### 2.1 Gaps Remanescentes da Revisao v1 (nao resolvidos no DRAFT v2)

| Gap | Descricao | Severidade | Status |
|-----|-----------|-----------|--------|
| **GAP-01** | **API Routes nao auditadas.** 68 API routes (incluindo API publica v1) sem auditoria de seguranca, validacao de input ou error handling. O DRAFT v2 NAO incorporou este gap. | MEDIUM | Pendente -- deve ser incluido na Phase 8 |
| **GAP-02** | **AI Agent tools sem auditoria de seguranca.** O agente IA usa `createStaticAdminClient()` (service role) em 27+ tools. Tools destrutivas (delete deals, merge contacts) bypassam RLS. O DRAFT v2 cobre SYS-002 (prompt) e SYS-004 (prospecting), mas NAO cobre auditoria de seguranca das tools existentes. | MEDIUM | Pendente -- deve ser incluido na Phase 8 |
| **GAP-03** | **Middleware de auth sem auditoria.** CSP headers ausentes confirmados (SYS-017 no DRAFT), mas CORS e rate limiting no middleware level ainda nao auditados. | LOW | Parcialmente resolvido via SYS-017 |
| **GAP-04** | **Server Actions sem cobertura.** `app/actions/` contem Server Actions nao auditadas. | LOW | Pendente |
| **GAP-05** | **Dependency audit ausente.** Sem `npm audit` no assessment. | LOW | Pendente |
| **GAP-06** | **Supabase Edge Functions nao analisadas.** | LOW | Pendente |

### 2.2 Novos Gaps Identificados nesta Revisao

| Gap | Descricao | Severidade |
|-----|-----------|-----------|
| **GAP-07** | **Intersecao AI Tools + SECURITY DEFINER nao mapeada.** O agente IA pode invocar `merge_contacts()` via tool (se existir ou for criado em SYS-004). Se a AI tool chama a RPC com UUIDs fornecidos pelo usuario no chat, o risco de cross-tenant e amplificado porque o usuario nao precisa construir a chamada SQL manualmente -- basta pedir ao agente. O DB-006 e critico INDEPENDENTE do canal, mas a existencia do agente IA como vetor adicional deveria estar documentada. | MEDIUM |
| **GAP-08** | **Contagem de debitos no DRAFT v2 inconsistente.** O resumo executivo (Secao 0) diz 67 debitos, mas a contagem na Secao 7 mostra: SYS=24, DB=21, UX=22=67 correto. Porem, a contagem de HIGH na Secao 7 diz "17 (+2 ref)" enquanto a Secao 0 diz "19" -- ambos corretos se interpretados diferentemente (19 linhas na tabela, 17 unicos + 2 refs). Essa ambiguidade precisa ser resolvida na Phase 8 com uma contagem unica e clara. | LOW |

### 2.3 Blind Spots Resolvidos

| BS da v1 | Status | Como Resolvido |
|----------|--------|----------------|
| BS-01 (escopo real de subqueries RLS) | **Resolvido** | @data-engineer confirmou "dezenas de policies" e estimou 20h para DB-004 (migration progressiva de 50+ policies para JWT claims). |
| BS-02 (escala de cores Tailwind diretas) | **Resolvido** | @ux-design-expert quantificou e elevou UX-011 para HIGH com dados concretos. Estimativa de 2000+ ocorrencias. |
| BS-03 (intersecao AI + DB com service role) | **Parcialmente resolvido** | GAP-07 acima documenta o risco residual. O DRAFT v2 nao abordou diretamente, mas SYS-002 (fix de BASE_INSTRUCTIONS) e passo necessario para qualquer auditoria de AI tools. |

---

## 3. Riscos Cruzados

| Risco | Areas Afetadas | Severidade | Mitigacao |
|-------|----------------|-----------|-----------|
| **RC-01: DB-006 (merge_contacts DEFINER) + AI Agent** | Database, IA, Seguranca multi-tenant | CRITICAL | `merge_contacts()` bypassa RLS e nao valida org. O agente IA poderia ser vetor de exploracao se tools de merge forem criadas (SYS-004). Mitigacao: corrigir DB-006 ANTES de implementar SYS-004 (prospecting tools). Fase 1 do DB deve preceder Onda 2 de IA. |
| **RC-02: Fix de RLS (DB-004 JWT claims) pode quebrar acesso** | Database, Frontend, todas as operacoes CRUD | HIGH | Reescrita de 50+ policies RLS para usar JWT claims e uma operacao de alto risco. Um erro em qualquer policy bloqueia acesso legitimo. Mitigacao: implementar em 2 fases (auth hook primeiro, migrar policies por tabela com testes individuais). Manter funcao `get_user_organization_id()` como fallback. |
| **RC-03: Decomposicao de CRMContext (SYS-001) sem testes** | Frontend (estado), todas as features | HIGH | CRMContext (930 linhas, ~180 propriedades) e consumido por potencialmente toda a aplicacao. Cobertura de testes atual (~11.6%) e insuficiente. Mitigacao: criar test suite de regressao para fluxos criticos ANTES da decomposicao. Dependencia explicita: SYS-021/UX-024 (testes) deveria ser pre-requisito parcial. |
| **RC-04: Migracao de 2000+ cores Tailwind (UX-011) sem testes visuais** | Frontend (design system), dark mode | HIGH | Migracao massiva de `text-slate-*`/`bg-slate-*` para tokens sem testes de regressao visual pode introduzir inconsistencias, especialmente no dark mode. Mitigacao: UX-024 (testes visuais) deve preceder ou ser paralelo a UX-011. @ux-design-expert corretamente elevou UX-024 para MEDIUM por esta razao. |
| **RC-05: Unificacao de Button (UX-001) afeta 139 arquivos** | Frontend (todos os componentes) | MEDIUM | A situacao e inversa ao DRAFT v1: 139 arquivos importam `@/app/components/ui/Button` (copia) e 0 arquivos importam `@/components/ui/button` (original). O fix e adicionar variantes `unstyled` ao original e migrar 139 imports. Risco: mecanico mas extenso. Mitigacao: lint + typecheck + smoke test visual apos replace. |
| **RC-06: Ondas de resolucao com interdependencias temporais** | Todas | MEDIUM | A Onda 1 do DRAFT (quick wins de seguranca) e a Fase 1 do DB (seguranca critica) devem ser perfeitamente alinhadas. DB-006 esta na Onda 1 do DRAFT como "quick win" mas o DB specialist o elevou para CRITICAL com 3h de esforco -- isso e correto e DEVE estar na primeira migration. |
| **RC-07: SYS-018 (API keys sem encriptacao) + DB-022 (get_dashboard_stats DEFINER)** | Database, Seguranca | MEDIUM | Se RLS falhar (ex: bug em policy), API keys em `organization_settings` ficam expostas em texto plano. `get_dashboard_stats` como DEFINER permite que qualquer usuario obtenha metricas de outra org passando org_id como parametro. Mitigacao: resolver ambos na mesma onda de seguranca. |

---

## 4. Validacao de Dependencias

### 4.1 Validacao do Grafo de Dependencias do DRAFT v2 (Secao 5)

| Dependencia | Valida? | Notas |
|-------------|---------|-------|
| DB-001 -> DB-010 (index antes do fix RLS) | **N/A** | Ambos ja corrigidos (confirmado na review do @data-engineer). Remover do grafo na Phase 8. |
| SYS-002 -> SYS-014 + SYS-011 + SYS-013 + SYS-012 | **Sim** | Correta. Fix de BASE_INSTRUCTIONS e pre-requisito para todos os gaps de exposure da IA. |
| SYS-004 -> SYS-005 | **Sim** | Podem ser feitos em paralelo (sem dependencia estrita), mas faz sentido agrupar. |
| UX-001 -> UX-021 | **Sim** | SubmitButton conflitante deve ser resolvido junto com unificacao do Button. |
| SYS-001/UX-002 -> UX-006 | **Sim** | Controller hooks dependem indiretamente do CRMContext; decomposicao sera mais facil apos migracao. |
| UX-018/019/020 -> UX-003 | **Sim, mas simplificada.** | O @ux-design-expert confirmou que V2 sao dead code. Acao: deletar V2, nao "resolver" -- e um quick win de 30 minutos. A dependencia com UX-003 e mais fraca do que o DRAFT sugere. |
| DB-004 -> SYS-007 | **Parcial** | Ambos requerem mudanca de infraestrutura, mas nao tem dependencia tecnica direta. DB-004 (JWT claims) e SYS-007 (rate limiter) podem ser feitos independentemente. |
| SYS-021/UX-024 -> SYS-003 | **Questionavel** | O DRAFT sugere melhorar tipagem ANTES de escrever testes. Na pratica, testes E2E nao dependem de tipagem interna. Remover esta dependencia. |

### 4.2 Dependencias Nao Mapeadas (novas)

| Dependencia | Descricao | Criticidade |
|-------------|-----------|-------------|
| **DB-006 (CRITICAL) deve preceder SYS-004** | Nao implementar tools de prospeccao para IA antes de corrigir `merge_contacts()` DEFINER. Se tools de contato forem criadas junto com prospecting, o agente pode se tornar vetor de exploracao. | ALTA |
| **UX-024 (testes visuais) deve preceder UX-011 (migracao de cores)** | Ja identificado na review v1 e reiterado pelo @ux-design-expert. DEVE ser adicionado ao grafo formal. | ALTA |
| **DB-022 (get_dashboard_stats INVOKER) deve preceder DB-009 (otimizar counts)** | Confirmada pelo @data-engineer. Converter para INVOKER antes de otimizar queries. | MEDIA |
| **DB-012 (updated_at triggers) deve preceder DB-015 (phone sync trigger)** | Confirmada pelo @data-engineer. Ordem de aplicacao de triggers importa. | MEDIA |
| **Cobertura minima de testes deve preceder SYS-001 (CRMContext split)** | Risco RC-03. Ao menos testes de regressao dos fluxos criticos sao necessarios. | ALTA |

### 4.3 Dependencias Circulares

Nenhuma dependencia circular identificada. O grafo e um DAG (directed acyclic graph) valido.

### 4.4 Cadeias de Bloqueio Criticas (atualizadas)

1. **DB-006 (CRITICAL, 3h) -> SYS-004 (HIGH, 24-32h)**: Seguranca de banco ANTES de expandir IA.
2. **UX-024 (testes visuais) -> UX-011 (migracao de 2000+ cores)**: Testes ANTES de refatoracao massiva.
3. **Testes de regressao -> SYS-001/UX-002 (CRMContext)**: Cobertura ANTES de decomposicao.
4. **UX-001 (Button, 3-4h) -> UX-003 (componentes gigantes, 40-60h)**: Unificar Button ANTES de decompor componentes que o importam.

---

## 5. Duplicatas e Inconsistencias

### 5.1 Duplicatas Confirmadas

| Debitos | Relacao | Acao Recomendada |
|---------|---------|-----------------|
| UX-002 e SYS-001 | Mesmo debito (CRMContext) visto de perspectivas diferentes | Manter SYS-001 como primario, UX-002 como referencia. DRAFT v2 ja faz isso corretamente. |
| UX-024 e SYS-021 | Mesmo debito (sem testes E2E) visto de perspectivas diferentes | Manter SYS-021 como primario, UX-024 como referencia. DRAFT v2 ja faz isso corretamente. |
| DB-002 e DB-008 | Mesmo debito (client_company_id orfao) | Ambos ja removidos pelo @data-engineer (corrigidos em migration). Correto. |
| SYS-014 e SYS-002 | SYS-014 e sub-item de SYS-002 | DRAFT v2 nota que SYS-014 e "resolvido junto com SYS-002". Correto. |

### 5.2 Inconsistencias de Contagem

| Inconsistencia | Descricao | Resolucao |
|----------------|-----------|-----------|
| DRAFT v2 Secao 0 diz 67 debitos, Secao 7 confirma 67 (24+21+22) | Consistente. Contagem correta considerando referencias. | OK |
| DRAFT diz 19 HIGH (Secao 0), tabela mostra 17 + 2 ref (Secao 7) | Ambiguidade -- 19 linhas na tabela incluem DB-001 e DB-005 que o DB specialist removeu, e UX-008/009 que foram rebaixados. | Phase 8 deve usar contagem pos-revisao |
| DRAFT lista 30 MEDIUM, mas pos-reviews o numero muda significativamente | @ux-design-expert rebaixou 8, elevou 2, adicionou 7. @data-engineer removeu 5, rebaixou 4, elevou 2, adicionou 4. | Phase 8 deve recalcular totais com base nas reviews |

### 5.3 Inconsistencias de Severidade entre DRAFT e Reviews

| ID | DRAFT v2 | DB Specialist | UX Specialist | Resolucao QA |
|----|----------|---------------|---------------|-------------|
| DB-001 | HIGH | **REMOVIDO** (ja corrigido) | N/A | Aceitar: verificado na migration `20260223100000` |
| DB-002 | HIGH | **REMOVIDO** (ja corrigido) | N/A | Aceitar: verificado na migration `20260220100000` |
| DB-005 | HIGH | **REMOVIDO** (ja corrigido) | N/A | Aceitar: verificado na migration `20260224000006` |
| DB-006 | HIGH | **CRITICAL** | N/A | Aceitar: SECURITY DEFINER sem validacao de org e genuinamente CRITICAL |
| DB-008 | MEDIUM | **REMOVIDO** (duplicata DB-002) | N/A | Aceitar: confirmado |
| DB-010 | MEDIUM | **REMOVIDO** (ja corrigido) | N/A | Aceitar: verificado na migration `20260223100000` |
| DB-011 | MEDIUM | LOW | N/A | Aceitar: coluna nao usada no codebase TypeScript |
| DB-013 | MEDIUM | LOW | N/A | Aceitar: `idx_deals_open` ja cobre principal uso |
| DB-014 | MEDIUM | **HIGH** | N/A | Aceitar: SECURITY DEFINER sem org check, mesmo padrao de DB-006 |
| DB-016 | MEDIUM | LOW | N/A | Aceitar: impacto real baixo em tabelas sem auditoria ativa |
| DB-018 | MEDIUM | LOW (nao agir) | N/A | Aceitar: artefato historico, SCHEMA.md ja documenta |
| UX-005 | HIGH | N/A | **MEDIUM** | Aceitar: sem demanda de internacionalizacao imediata |
| UX-007 | HIGH | N/A | **MEDIUM** | Aceitar: DX only, impacto zero para usuario |
| UX-008 | HIGH | N/A | **MEDIUM** | Aceitar: elemento periferico |
| UX-010 | MEDIUM | N/A | **LOW** | Aceitar: impacto zero se fonte nao carregada |
| UX-011 | MEDIUM | N/A | **HIGH** | Aceitar: 2000+ ocorrencias justificam elevacao |
| UX-012 | MEDIUM | N/A | **LOW** | Aceitar: caso particular do UX-011 |
| UX-015 | MEDIUM | N/A | **LOW** | Aceitar: so visivel em erro |
| UX-018 | MEDIUM | N/A | **LOW** | Aceitar: V2 e dead code confirmado |
| UX-019 | MEDIUM | N/A | **LOW** | Aceitar: V2 e dead code confirmado |
| UX-020 | MEDIUM | N/A | **LOW** | Aceitar: cockpit-v2 inacessivel |
| UX-024 | LOW | N/A | **MEDIUM** | Aceitar: critico para migracoes planejadas |

**Veredicto:** Todos os 22 ajustes de severidade sao tecnicamente justificados com dados concretos. Nenhum conflito entre especialistas. Recomendo aceitar integralmente na consolidacao final.

---

## 6. Analise de Seguranca (OWASP)

### 6.1 Mapeamento OWASP Top 10 vs Debitos Identificados

| OWASP | Debitos Relacionados | Cobertura | Status |
|-------|---------------------|-----------|--------|
| **A01: Broken Access Control** | DB-006 (CRITICAL: merge_contacts cross-tenant), DB-014 (HIGH: LTV cross-tenant), DB-022 (HIGH: dashboard stats DEFINER), DB-007 (MEDIUM: rate_limits permissiva), DB-024 (MEDIUM: system_notifications INSERT) | **BOA** | 5 debitos mapeados. DB-006 e o mais critico. |
| **A02: Cryptographic Failures** | SYS-018 (MEDIUM: API keys sem encriptacao at-rest) | **PARCIAL** | Apenas 1 debito. Falta auditoria de: uso de HTTPS, token storage, hashing de secrets. |
| **A03: Injection** | DB-025 (HIGH: merge_contacts EXECUTE dinamico) | **PARCIAL** | `format(%I, %L)` e seguro contra SQL injection classico, mas o padrao de concatenacao e anti-padrao. Falta auditoria de: API routes, Server Actions, AI tools que constroem queries. |
| **A04: Insecure Design** | SYS-002 (CRITICAL: AI prompt hardcoded), SYS-007 (HIGH: rate limiter in-memory) | **PARCIAL** | Rate limiting ineficaz em serverless e design issue. Falta threat modeling formal. |
| **A05: Security Misconfiguration** | SYS-017 (MEDIUM: CSP headers ausentes), SYS-003 (CRITICAL: no-explicit-any off) | **BOA** | CSP e a principal misconfiguracao. ESLint relaxado e risco indireto. |
| **A06: Vulnerable Components** | SYS-015 (MEDIUM: AI SDK desatualizado) | **FRACA** | Apenas pacotes AI SDK avaliados. Falta `npm audit` completo (GAP-05). |
| **A07: Identity & Auth Failures** | Nenhum debito especifico | **NAO AVALIADA** | Auth via Supabase Auth, provavelmente seguro, mas sem auditoria explicita. |
| **A08: Software & Data Integrity** | DB-017 (MEDIUM: sem rollback scripts) | **FRACA** | Integridade de migration, nao de software supply chain. |
| **A09: Logging & Monitoring** | Nenhum debito especifico | **NAO AVALIADA** | `audit_logs` existe, mas eficacia nao avaliada. |
| **A10: SSRF** | Nenhum debito especifico | **NAO AVALIADA** | Nao analisado. Webhook outbound poderia ser vetor. |

### 6.2 Itens de Seguranca que Requerem Acao Imediata

1. **DB-006** (CRITICAL): `merge_contacts()` SECURITY DEFINER sem validacao de org. Corrigir IMEDIATAMENTE.
2. **DB-022** (HIGH): `get_dashboard_stats()` SECURITY DEFINER aceitando `p_organization_id` como parametro sem validar ownership. Qualquer usuario pode obter metricas de outra org.
3. **DB-014** (HIGH): LTV RPCs SECURITY DEFINER sem org check. Converter para INVOKER.
4. **DB-025** (HIGH): EXECUTE dinamico em `merge_contacts()` -- embora seguro com `%I/%L`, e anti-padrao. Reescrever.

### 6.3 Lacunas de Seguranca Nao Cobertas

| Lacuna | Descricao | Recomendacao |
|--------|-----------|-------------|
| Input validation em API routes | 68 API routes sem auditoria de validacao | Incluir na Phase 8 como debito SYS-025 |
| AI tools com service role | 27+ tools usando admin client | Incluir na Phase 8 como debito SYS-026 |
| CORS configuration | Nao avaliado | Verificar `next.config.ts` na Phase 8 |
| Rate limiting em auth endpoints | Rate limiter in-memory (SYS-007) e ineficaz | Resolver como parte de SYS-007 |

---

## 7. Testes Requeridos Pos-Resolucao

### 7.1 Por Cluster de Seguranca (Prioridade Maxima)

| Teste | Debitos | Tipo | Criterio de Aceite |
|-------|---------|------|-------------------|
| Chamar `merge_contacts(uuid_org_A, uuid_org_B)` como usuario de Org A | DB-006 | Integracao | DEVE retornar EXCEPTION de autorizacao |
| Chamar `get_dashboard_stats(uuid_outra_org)` como usuario regular | DB-022 | Integracao | DEVE retornar dados apenas da org do caller |
| Chamar `increment_contact_ltv(uuid_outra_org_contact, 1000)` | DB-014 | Integracao | UPDATE DEVE ser bloqueado por RLS (apos INVOKER) |
| Verificar que `rate_limits` nao expoe dados cross-user via SELECT | DB-007 | Integracao | Queries devem ser restritas |

### 7.2 Por Cluster de IA (Onda 2)

| Teste | Debitos | Tipo | Criterio de Aceite |
|-------|---------|------|-------------------|
| Agente reconhece e usa todas as 27 tools | SYS-002 | Funcional | BASE_INSTRUCTIONS lista todas as tools |
| Agente interage com filas de prospeccao | SYS-004 | Funcional | Tools de prospeccao respondem corretamente |
| Agente cria/busca atividades WHATSAPP | SYS-011 | Funcional | Enum inclui WHATSAPP |
| Agente filtra contatos por tags/custom fields | SYS-013 | Funcional | Tools aceitam tags como filtro |

### 7.3 Por Cluster de Frontend (Onda 3)

| Teste | Debitos | Tipo | Criterio de Aceite |
|-------|---------|------|-------------------|
| Todos os imports de Button resolvem para componente unico | UX-001 | Build + Lint | Zero erros de import, typecheck passa |
| FocusContextPanel decomposto renderiza identico ao original | UX-003 | Visual regression | Screenshots before/after identicos |
| Skeletons aparecem em todas as 17 paginas protegidas | UX-004 | Visual | Nenhuma pagina mostra spinner generico |
| Dark mode mantido apos migracao de cores | UX-011 | Visual regression | Screenshots before/after em light e dark |

### 7.4 Por Cluster de Performance (Onda 4)

| Teste | Debitos | Tipo | Criterio de Aceite |
|-------|---------|------|-------------------|
| RLS com JWT claims funciona em todas as tabelas | DB-004 | Integracao | SELECT/INSERT/UPDATE/DELETE respeitam org do JWT |
| Re-render count em CRMContext split | SYS-001 | Performance | Reducao mensuravel de re-renders em operacoes CRUD |
| Dashboard load time com counts otimizados | DB-009 | Performance | Tempo de resposta < 200ms para <10K registros |

---

## 8. Metricas de Qualidade

### 8.1 Metricas de Acompanhamento de Resolucao

| Metrica | Valor Atual | Meta Pos-Resolucao | Como Medir |
|---------|-------------|-------------------|-----------|
| Debitos CRITICAL | 6 (DRAFT) / 4 (pos-reviews) | 0 | Contagem no assessment |
| Debitos HIGH | 19 (DRAFT) / ~15 (pos-reviews) | < 5 | Contagem no assessment |
| Funcoes SECURITY DEFINER sem org check | 4 (DB-006, DB-014x2, DB-022) | 0 | `grep SECURITY DEFINER` + auditoria |
| Tabelas com RLS `USING(true)` | 1 (rate_limits) | 0 | Query pg_policies |
| Ocorrencias de `any` no codebase | 209 em 51 arquivos | < 50 (progressivo) | ESLint com `no-explicit-any: warn` |
| Imports de `@/app/components/ui/Button` | 139 | 0 | Grep no codebase |
| Cobertura de testes | ~11.6% | > 30% (para areas criticas) | Jest --coverage |
| Paginas sem loading.tsx | 13 de 17 | 0 | Busca em `app/(protected)` |
| Paginas sem error.tsx | 17 de 17 | < 5 | Busca em `app/(protected)` |

### 8.2 KPIs de Seguranca

| KPI | Valor Atual | Meta | Prazo |
|-----|-------------|------|-------|
| Funcoes RPC com risco cross-tenant | 4 | 0 | Onda 1 (1-2 semanas) |
| CSP headers configurados | Nao | Sim | Onda 2-3 |
| API keys encriptadas at-rest | Nao | Sim | Onda 4-5 |
| `npm audit` sem vulnerabilidades criticas | Desconhecido | 0 criticas | Onda 1 |

---

## 9. Avaliacao das Reviews dos Especialistas

### 9.1 Review do @data-engineer (Dara) -- Phase 5

**Qualidade: EXCELENTE**

Pontos fortes:
- **Verificacao rigorosa contra migrations reais.** Cada debito foi checado contra os 54 arquivos de migration, com referencias a numeros de linha especificos.
- **Identificacao de 5 debitos ja corrigidos** (DB-001, DB-002, DB-005, DB-008, DB-010) que estavam incorretamente listados como pendentes. Isso e um achado de alto valor que evita trabalho desperdicado.
- **4 debitos novos adicionados** (DB-022, DB-023, DB-024, DB-025) demonstram que a revisao foi alem da validacao passiva.
- **Respostas detalhadas as 7 perguntas do architect**, cada uma com analise tecnica, codigo SQL de exemplo e recomendacao acionavel.
- **Autocritica construtiva** sobre a propria auditoria Phase 2 (DB-AUDIT.md), reconhecendo que a analise original focou no schema_init sem cross-reference completa.
- **Grafo de resolucao em 4 fases** com dependencias tecnicas claras.

Pontos de atencao:
- A elevacao de DB-006 para CRITICAL e justificada e foi **verificada por esta revisao QA** contra o codigo da migration `20260226100006_merge_contacts_rpc.sql`. A funcao e de fato SECURITY DEFINER sem validacao de que os contatos pertencem a org do caller.
- DB-025 (SQL injection risk) -- embora `format(%I, %L)` seja seguro contra injection classico, a recomendacao de reescrever o padrao e prudente. Classificacao HIGH e adequada.

**Claim verificado: "5 debitos ja corrigidos"** -- CONFIRMADO. Verificacao independente:
- DB-001: `20260223100000_rls_remaining_tables.sql` linhas 482-505 e 33 (index)
- DB-002: `20260220100000_remove_companies_and_roles.sql` linha 109 (DROP COLUMN)
- DB-005: `20260224000006_db015_fk_contacts_stage.sql` (constraint criada)
- DB-008: Duplicata de DB-002
- DB-010: `20260223100000_rls_remaining_tables.sql` linha 33 (index criado)

### 9.2 Review do @ux-design-expert (Uma) -- Phase 6

**Qualidade: EXCELENTE**

Pontos fortes:
- **Todos os 25 debitos validados** com dados quantitativos do codebase (contagem de imports, tamanhos de arquivo, ocorrencias de padroes).
- **Inversao do Button documentada corretamente.** 139 arquivos importam `@/app/components/ui/Button` (copia) vs 0 do original. O DRAFT v2 dizia "Layout.tsx importa de app/components enquanto maioria importa de components/ui" -- a realidade e INVERSA: a maioria importa da copia, nao do original.
- **7 debitos novos adicionados** (UX-026 a UX-032) com evidencia concreta, incluindo UX-028 (error.tsx ausente) e UX-029 (not-found.tsx ausente) que sao gaps significativos de resiliencia.
- **8 rebaixamentos e 2 elevacoes** todos justificados com impacto real no usuario (vs DX).
- **Plano de migracao em 5 ondas** com dependencias respeitadas e estimativas de horas por onda.
- **Respostas detalhadas as 7 perguntas do architect**, incluindo decomposicao concreta do FocusContextPanel em 7 sub-componentes com estimativa de linhas.

Pontos de atencao:
- **Claim verificado: "Button situacao invertida"** -- CONFIRMADO. Grep independente: 139 arquivos com `@/app/components/ui/Button`, 0 com `@/components/ui/button`.
- UX-026 (overlay inconsistente em modais) -- `modalStyles.ts` usado em apenas 3 de 20+ modais e um achado significativo que indica baixa adocao do padrao centralizado.
- A elevacao de UX-011 (MEDIUM -> HIGH) com "2000+ ocorrencias" e justificada pela escala massiva do problema.

### 9.3 Comparacao entre Especialistas

| Aspecto | @data-engineer | @ux-design-expert | Avaliacao |
|---------|----------------|-------------------|-----------|
| Rigor de verificacao | Migrations linha a linha | Grep quantitativo no codebase | Ambos excelentes |
| Debitos removidos | 5 (ja corrigidos) | 0 | DB tinha falsos positivos, UX nao |
| Debitos adicionados | 4 | 7 | UX teve mais gaps nao cobertos |
| Ajustes de severidade | 6 rebaixados, 2 elevados | 8 rebaixados, 2 elevados | Proporcionais ao escopo |
| Respostas ao architect | 7/7 com SQL de exemplo | 7/7 com decomposicao de componentes | Ambos completos e acionaveis |
| Autocritica | Sim (DB-AUDIT.md falsos positivos) | N/A (sem achados incorretos no frontend-spec) | Transparencia positiva |

**Nao ha conflitos entre os especialistas.** Ambos operam em areas distintas e nenhum ajuste contradiz o outro.

---

## 10. Parecer Final

### Gate: APPROVED

O Technical Debt Assessment do ZmobCRM esta **completo e rigoroso o suficiente para prosseguir para a Phase 8** (consolidacao final pelo @architect).

### Justificativa

1. **Cobertura abrangente:** O DRAFT v2 cobre 67 debitos em 3 areas (Sistema, Database, Frontend/UX). As reviews dos especialistas adicionaram 11 debitos novos e removeram 5 falsos positivos, resultando em ~73 debitos ativos.

2. **Validacao cruzada robusta:** Ambos os especialistas fizeram verificacao independente contra o codigo-fonte, nao apenas leitura do DRAFT. O @data-engineer identificou 5 itens ja corrigidos que o DRAFT listava como pendentes -- exatamente o tipo de erro que o processo de review deve capturar.

3. **Priorizacao coerente:** O esquema de ondas de resolucao respeita dependencias tecnicas e prioriza seguranca (CRITICAL/HIGH) antes de qualidade (MEDIUM) e maturidade (LOW).

4. **Seguranca adequadamente sinalizada:** O UNICO debito genuinamente CRITICAL no banco de dados (DB-006: merge_contacts cross-tenant) foi corretamente elevado pelo @data-engineer. Os demais debitos de seguranca (DB-014, DB-022, DB-025) estao classificados como HIGH com recomendacoes claras.

5. **Estimativas realistas:** As estimativas pos-revisao (~64h DB, ~180-280h UX, ~175-262h SYS) sao mais precisas que as do DRAFT original, refinadas pela verificacao dos especialistas.

### Condicoes para a Phase 8

O @architect deve, na consolidacao final:

1. **Incorporar todos os ajustes de severidade** dos dois especialistas (22 ajustes, todos validados por esta revisao QA).

2. **Remover os 5 debitos ja corrigidos** (DB-001, DB-002, DB-005, DB-008, DB-010) e atualizar contagens.

3. **Adicionar os 11 debitos novos** dos especialistas (DB-022 a DB-025, UX-026 a UX-032) com IDs sequenciais.

4. **Corrigir a descricao do UX-001** -- a situacao e inversa ao descrito: 139 arquivos usam a copia, 0 usam o original. O fix e adicionar variantes ao original e migrar 139 imports, nao "escolher qual manter".

5. **Atualizar o grafo de dependencias** removendo dependencias sobre debitos ja corrigidos e adicionando as 5 dependencias nao mapeadas identificadas na Secao 4.2.

6. **Incluir os gaps GAP-01 e GAP-02** como debitos formais ou como secao de "Areas Nao Avaliadas" no assessment final. A auditoria de seguranca das 68 API routes e das 27 AI tools e um gap relevante.

7. **Recalcular totais e estimativas** com base nos debitos pos-revisao (removidos, adicionados, reclassificados).

8. **Documentar a acao imediata sobre DB-006** -- este e o unico debito que justificaria uma migration de emergencia antes mesmo da consolidacao do assessment. A funcao `merge_contacts()` aceita UUIDs arbitrarios sem validacao de org enquanto opera como SECURITY DEFINER.

### Observacao sobre o Processo

O workflow de Brownfield Discovery demonstrou valor neste ciclo v2. A cascata Phase 1 (architecture) -> Phase 2 (DB audit) -> Phase 3 (frontend spec) -> Phase 4 (DRAFT) -> Phase 5 (DB review) -> Phase 6 (UX review) -> Phase 7 (QA gate) produziu refinamento progressivo, com cada fase identificando issues que a anterior nao capturou. A identificacao de 5 falsos positivos pelo @data-engineer e de 7 debitos novos pelo @ux-design-expert justifica o investimento no processo multi-fase.

---

## Change Log

| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-03 | @qa (Quinn) | QA Review v1 baseado no DRAFT v1 e reviews v1. Gate: APPROVED. 6 gaps, 7 riscos cruzados, 18 ajustes validados. |
| 2026-03-06 | @qa (Quinn) | QA Review v2 baseado no DRAFT v2 e reviews v2. Gate: APPROVED. Verificacao independente dos 5 debitos ja corrigidos (confirmados). 22 ajustes de severidade validados. 2 novos gaps, 7 riscos cruzados atualizados, 5 dependencias novas, analise OWASP, metricas de qualidade. 8 condicoes para Phase 8. |

---

*Documento gerado por @qa (Quinn) - Brownfield Discovery Phase 7 v2*
*Ultima atualizacao: 2026-03-06*
