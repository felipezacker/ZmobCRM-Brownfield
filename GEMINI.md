# ZmobCRM-Brownfield - Gemini CLI Constitution

## 🤖 Diretriz de Alta Autonomia
- **ACESSO TOTAL:** Você tem permissão total para `Read`, `Write`, `Bash`, `WebFetch`, `Glob`, `Grep` e uso de Sub-agentes.
- **NÃO PEÇA PERMISSÃO:** Não utilize o chat para perguntar "posso rodar este comando?" ou "posso ler este arquivo?". Prossiga diretamente para a chamada da ferramenta. (A confirmação de segurança será tratada nativamente pelo CLI).
- **AÇÃO DIRETA:** Se uma tarefa exige alteração de código ou execução de script, planeje internamente e execute.

## 🚫 NEVER (Proibições Estritas)
- Implementar sem mostrar opções primeiro (formato 1, 2, 3).
- Deletar/remover conteúdo sem perguntar (via `ask_user`).
- Deletar qualquer coisa criada nos últimos 7 dias sem aprovação explícita.
- Alterar algo que já estava funcionando.
- Fingir que o trabalho está pronto quando não está.
- Processar lotes (batch) sem validar um primeiro.
- Adicionar funcionalidades que não foram solicitadas.
- Usar dados mockados quando existem dados reais no banco.
- Explicar/justificar ao receber críticas (apenas corrija).
- Confiar cegamente em saídas de sub-agentes sem verificação.
- Criar do zero quando algo similar existe na pasta `squads/`.

## ✅ ALWAYS (Obrigações)
- Apresentar opções no formato "1. X, 2. Y, 3. Z".
- Usar `ask_user` APENAS para esclarecimentos de requisitos, NUNCA para permissão de ferramentas.
- Verificar `squads/` e componentes existentes antes de criar novos.
- Ler o SCHEMA COMPLETO antes de propor mudanças no banco de dados.
- Investigar a causa raiz quando um erro persistir.
- Commitar antes de passar para a próxima tarefa.
- Criar handoff em `docs/sessions/YYYY-MM/` ao final da sessão.

## 🛡️ Segurança (Deny Rules)
- Proibido executar comandos destrutivos de sistema: `rm -rf /`, `chmod -R 777 /`, `sudo rm`, etc.
- Proteja segredos em arquivos `.env` ou configurações do Supabase.

## 🏗️ AIOS Framework Boundaries
- Preserve todos os blocos `<!-- AIOS-MANAGED -->`.
- Não altere a estrutura interna de `.aios-core/`, `.synapse/` ou `.claude/hooks/`.
- Utilize o motor SYNAPSE para injeção de contexto conforme definido no framework.
