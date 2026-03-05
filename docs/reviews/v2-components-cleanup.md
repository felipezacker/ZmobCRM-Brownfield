# Revisão de Componentes V2 Inativos

**Data:** 05 de Março de 2026
**Contexto:** Inclusão acidental durante o workflow `*pre-push` de componentes V2 não integrados e novos Agentes.

## Arquivos Relacionados

Os seguintes arquivos foram enviados para a branch `develop` no commit `59359fb`, mas constatou-se que não estão sendo importados ou utilizados nas rotas ativas do sistema:

### Frontend (Deal Cockpit V2)
- `app/(protected)/deals/[dealId]/cockpit-v2/page.tsx`
- `features/activities/components/ActivityFormModalV2.tsx`
- `features/boards/components/Modals/CreateDealModalV2.tsx`
- `features/deals/cockpit/DealCockpitFocusClient.tsx`

### Agentes e Configurações AIOS
Diversos arquivos de agentes de AI e configuração sob as pastas:
- `.agent/workflows/`
- `.claude/commands/Design/`
- `.claude/commands/squadCreator/`
- `.gemini/commands/`

## Por que documentar?

Durante a execução da rotina de pré-push (`git add .`), esses arquivos locais "untracked" foram empacotados e comitados. Após análise (busca cruzada por importações de "V2", "ActivityFormModalV2", etc.), foi verificado que esses componentes:

1. Estão completamente isolados da aplicação principal (nenhuma rota raiz acessa `/cockpit-v2`).
2. Os botões de ação e componentes do sistema atual (V1) continuam consumindo suas versões originais (ex: `CreateDealModal.tsx` e `ActivityFormModal.tsx`).
3. Seu impacto técnico atual é **zero** (código de rascunho/morto presente no repo, mas inacessível para os usuários).

## Próximos Passos (Tech Debt)

Para manter o repositório limpo, a equipe deve posteriormente:

- [ ] Revisar as inovações introduzidas nos arquivos V2 (novas tipagens resolvidas, design system) e planejar sua integração pontual.
- [ ] Confirmar quais arquivos de configuração de agentes/squad devem ser versionados e quais deveriam constar no `.gitignore`.
- [ ] Caso a iniciativa "V2" tenha sido descontinuada em favor do FocusPanel Inbox atual, excluir os arquivos não utilizados citados acima para evitar crescimento desnecessário da complexidade de manutenção.
