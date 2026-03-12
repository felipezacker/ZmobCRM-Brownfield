# Benchmark: Listas de Contatos em CRMs

**Data:** 2026-03-11
**Autor:** Atlas (Analyst Agent)
**Contexto:** ZmobCRM Brownfield -- funcionalidade de listas de contatos nomeadas

## TL;DR

A pesquisa analisou 8 CRMs (HubSpot, Pipedrive, Salesforce, Kommo, RD Station, Agendor, Bitrix24, Close) para entender como implementam listas/segmentos de contatos. O padrao dominante combina **listas estaticas manuais** + **listas dinamicas baseadas em filtros**, com acesso via sidebar ou pagina dedicada. A recomendacao para o ZmobCRM e implementar **listas estaticas nomeadas** como MVP, com adicao manual e import CSV, e evoluir para filtros dinamicos em fase posterior.

## Arquivos

| Arquivo | Conteudo |
|---------|----------|
| `00-query-original.md` | Pergunta original e contexto |
| `01-deep-research-prompt.md` | Sub-queries utilizadas na pesquisa |
| `02-research-report.md` | Relatorio completo com comparativo |
| `03-recommendations.md` | Recomendacao de padrao para ZmobCRM |

## Confianca

- **Alta** para HubSpot, Pipedrive, Salesforce, Close (documentacao oficial acessada)
- **Media** para Kommo, Bitrix24 (documentacao parcial)
- **Media-Baixa** para RD Station CRM, Agendor (informacoes mais genericas)
