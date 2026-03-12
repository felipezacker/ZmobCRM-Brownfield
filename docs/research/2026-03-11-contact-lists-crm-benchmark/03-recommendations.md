# Recomendacoes: Listas de Contatos para ZmobCRM

**Data:** 2026-03-11 | **Autor:** Atlas (Analyst Agent)

---

## Contexto do ZmobCRM

- CRM imobiliario brasileiro
- Usuarios: corretores, diretores, admins
- Necessidade expressa: listas nomeadas ("Lista XP", "Lista Medicos", "Lista Execute")
- Stack: React/TypeScript, Supabase (PostgreSQL + RLS)
- RBAC existente: admin > diretor > corretor
- 39 tabelas no schema atual

---

## Padrao Recomendado: "Listas Estaticas Nomeadas" (MVP) + Evolucao para Dinamicas

### Por que este padrao?

A analise dos 8 CRMs revela que o caso de uso do ZmobCRM ("corretores criando listas nomeadas para organizar leads por perfil/origem") se alinha mais com o modelo **HubSpot Static Lists** do que com Smart Views ou filtros salvos. Razoes:

1. **O usuario pensa em "listas", nao em "filtros"** -- "Lista XP" e um agrupamento intencional e curado, nao uma query
2. **Listas estaticas sao simples de implementar** -- tabela de juntas (many-to-many) no banco
3. **O padrao HubSpot e o benchmark** -- combinar estaticas + dinamicas na mesma interface e o estado da arte
4. **CRMs imobiliarios priorizam simplicidade** -- comecar com poucos grupos bem mantidos

---

## Fase 1: MVP -- Listas Estaticas Nomeadas

### Funcionalidades Core

| Feature | Descricao | Referencia |
|---------|-----------|------------|
| Criar lista nomeada | Usuario cria lista com nome e descricao opcional | HubSpot, Salesforce Campaigns |
| Adicionar contato a lista | Selecionar contatos e adicionar a uma ou mais listas | HubSpot manual add, Kommo tags |
| Remover contato de lista | Remover individual ou em massa | HubSpot, Bitrix24 |
| Visualizar membros | Tabela com contatos da lista, com busca e ordenacao | HubSpot segment view |
| Adicionar via import CSV | Checkbox "Criar lista a partir deste import" | HubSpot import flow |
| Acoes em massa | Selecionar N contatos na listagem geral e "Adicionar a lista" | Salesforce, Bitrix24 |
| Cores/icones opcionais | Diferenciar listas visualmente | Pipedrive labels |

### Localizacao na UI (Recomendacao)

**Modelo hibrido** baseado nos melhores padroes:

1. **Sidebar** (como Close Smart Views): Lista de listas no menu lateral, clique abre a listagem de membros
2. **Pagina dedicada** (como HubSpot): Pagina `/contacts/lists` com todas as listas, CRUD, contagem de membros
3. **Acao contextual** (como Kommo): Na view de contatos, botao "Adicionar a lista" na selecao em massa

**Justificativa:** A sidebar da acesso rapido (padrao Close), a pagina dedicada permite gestao (padrao HubSpot), e a acao contextual facilita a adicao (padrao universal).

### Modelo de Dados Conceitual

**NOTA: Isto e documentacao de referencia, NAO schema de producao. A implementacao e responsabilidade do @dev/@data-engineer.**

```
contact_lists
  - id (uuid, PK)
  - name (text, NOT NULL)
  - description (text, nullable)
  - color (text, nullable) -- hex color para UI
  - owner_id (uuid, FK -> profiles) -- quem criou
  - organization_id (uuid, FK) -- tenant
  - created_at, updated_at

contact_list_members
  - id (uuid, PK)
  - list_id (uuid, FK -> contact_lists)
  - contact_id (uuid, FK -> contacts)
  - added_at (timestamptz)
  - added_by (uuid, FK -> profiles)
  - UNIQUE(list_id, contact_id)
```

**RLS:** Seguir padrao existente do ZmobCRM. Admin ve tudo, diretor ve da equipe, corretor ve as proprias listas.

### UX Flow Principal

```
1. Sidebar: [+ Nova Lista] -> Modal com nome + descricao + cor
2. Lista criada aparece na sidebar sob secao "Minhas Listas"
3. Clicar na lista -> pagina com tabela de membros
4. Na pagina de contatos: selecionar contatos -> botao "Adicionar a lista" -> dropdown com listas existentes
5. No import CSV: checkbox "Criar lista com contatos importados" -> nome da lista
6. Na lista: selecionar membros -> "Remover da lista"
```

### Pontos de Atencao

1. **Um contato pode pertencer a N listas** (many-to-many, como HubSpot e Kommo)
2. **Listas sao do usuario, mas visiveis conforme RBAC** (como Pipedrive shared/private)
3. **Deletar lista NAO deleta contatos** (apenas a associacao)
4. **Limite sugerido:** Sem limite de listas por usuario, mas monitorar via observabilidade
5. **Contagem de membros** na sidebar/listagem de listas (como HubSpot)

---

## Fase 2: Evolucao -- Listas Dinamicas (Futuro)

### Quando implementar
- Apos validacao do MVP com usuarios reais
- Quando surgirem pedidos de "mostrar todos os contatos que X"
- Complexidade estimada: MEDIA-ALTA (requer query builder no frontend)

### Funcionalidades

| Feature | Descricao | Referencia |
|---------|-----------|------------|
| Lista dinamica | Baseada em criterios/filtros que atualizam automaticamente | HubSpot Active Lists, Close Smart Views |
| Query builder visual | Interface para construir filtros (AND/OR) | Pipedrive, Close |
| Filtros por propriedade | Estagio, fonte, cidade, responsavel, tags, custom fields | Todos os CRMs |
| Preview de resultados | Mostrar contagem antes de salvar | HubSpot |

### Modelo de Dados Adicional (Fase 2)

```
contact_lists (adicionar campos):
  - type (enum: 'static', 'dynamic')
  - filter_criteria (jsonb, nullable) -- criterios para listas dinamicas
  - last_computed_at (timestamptz, nullable)
  - member_count_cache (integer, default 0)
```

---

## Fase 3: Tags como Complemento (Futuro)

### Quando implementar
- Quando usuarios precisarem de categorizacao multi-dimensional
- Tags sao ortogonais a listas: um contato pode ter N tags E pertencer a N listas

### Diferenca Conceitual

| Conceito | Metafora | Exemplo |
|----------|----------|---------|
| **Lista** | Pasta/container | "Lista XP", "Lista Medicos" |
| **Tag** | Etiqueta/label | "VIP", "urgente", "indicacao" |
| **Filtro dinamico** | Busca salva | "Contatos sem interacao >30 dias" |

Os tres mecanismos se complementam e nao se substituem.

---

## Anti-Padroes a Evitar

1. **NAO usar tags como substitute de listas** -- Tags sao atributos no contato, listas sao containers. Misturar os conceitos gera confusao (erro do Kommo)
2. **NAO comecar pelo dinamico** -- Query builder visual e complexo de implementar. Listas estaticas resolvem 80% do caso de uso com 20% do esforco
3. **NAO vincular listas a pipelines** -- Erro do Kommo. Listas devem ser transversais
4. **NAO limitar a 200 registros por selecao** -- Limitacao frustrante do Salesforce. Permitir selecao em massa sem limite artificial
5. **NAO exigir admin para criar listas** -- Corretores devem poder criar suas proprias listas (com visibilidade controlada por RBAC)

---

## Matriz de Decisao: Prioridade de Implementacao

| Feature | Impacto | Esforco | Prioridade |
|---------|---------|---------|------------|
| Listas estaticas nomeadas (CRUD) | ALTO | BAIXO | P0 -- MVP |
| Adicionar/remover contatos em massa | ALTO | BAIXO | P0 -- MVP |
| Sidebar com listas do usuario | MEDIO | MEDIO | P0 -- MVP |
| Contagem de membros | MEDIO | BAIXO | P0 -- MVP |
| Import CSV com criacao de lista | ALTO | MEDIO | P1 -- MVP+ |
| Cores/icones nas listas | BAIXO | BAIXO | P1 -- MVP+ |
| Listas dinamicas (filtros) | MEDIO | ALTO | P2 -- Futuro |
| Tags no contato | MEDIO | MEDIO | P2 -- Futuro |
| Query builder visual | MEDIO | ALTO | P3 -- Futuro |

---

## Proximos Passos

1. **@pm:** Criar epic/story para implementacao de listas estaticas (Fase 1)
2. **@data-engineer:** Validar modelo de dados contra schema existente
3. **@ux-design-expert:** Criar wireframes da sidebar + pagina de lista + acao em massa
4. **@dev:** Implementar conforme story

---

## Fontes Utilizadas

Todas as fontes estao documentadas em `02-research-report.md`.
