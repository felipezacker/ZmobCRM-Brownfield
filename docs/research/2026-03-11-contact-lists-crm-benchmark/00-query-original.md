# Query Original

## Pergunta

Pesquise como os principais CRMs do mercado implementam a funcionalidade de "listas de contatos" (contact lists / segments / groups). O contexto e um CRM imobiliario (ZmobCRM) que precisa permitir usuarios criarem listas nomeadas (ex: "Lista XP", "Lista Medicos", "Lista Execute") e organizarem contatos nessas listas.

## CRMs Solicitados

1. HubSpot - Lists (Active Lists vs Static Lists)
2. Pipedrive - Grupos/filtros de contatos
3. RD Station CRM - Segmentacao de contatos
4. Salesforce - List Views e Campaign Members
5. Kommo (ex-amoCRM) - Tags e segmentos
6. Outros: Agendor, Bitrix24, Close.com

## Aspectos Investigados

- Localizacao da gestao de listas na UI (sidebar, pagina dedicada, modal)
- Como adicionam contatos (manual, import, automacao/filtro dinamico)
- Listas estaticas vs dinamicas (baseadas em filtros)
- Como visualizam membros da lista
- Integracao com import CSV
- UX de adicionar/remover contatos de listas

## Contexto Inferido

- **Dominio:** CRM imobiliario brasileiro
- **Stack:** React/TypeScript, Supabase (PostgreSQL com RLS)
- **Caso de uso primario:** Corretores criando listas nomeadas para organizar leads por perfil/origem
- **Foco:** Listas estaticas manuais como MVP, evolucao para dinamicas
