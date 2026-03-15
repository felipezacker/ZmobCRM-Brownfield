# Release WhatsApp Notification Template

**Template ID:** release-whatsapp-notification-v1
**Purpose:** Transform technical release changelog into friendly WhatsApp notification
**Used by:** `release-notification.md` task (`@devops *notify`)

---

## Template Variables

| Variable | Type | Description | Example |
| --- | --- | --- | --- |
| `{{project}}` | string | Project name | "ZmobCRM" |
| `{{version}}` | string | Release version tag | "v1.4.0" |
| `{{changelog}}` | string | Raw commit log between tags | "feat: add X\nfix: resolve Y" |
| `{{release_url}}` | string | GitHub release URL | "https://github.com/org/repo/releases/tag/v1.4.0" |
| `{{release_notes}}` | string | GitHub release body (if exists) | Markdown release notes |

---

## LLM Summary Prompt

Use this prompt to transform technical changelog into a user-friendly summary:

```markdown
Voce e um comunicador de produto. Transforme o changelog tecnico abaixo em uma notificacao
detalhada para um grupo de WhatsApp de corretores imobiliarios. Regras:

1. Escreva em portugues brasileiro (pt-BR)
2. Sem limite de caracteres — detalhe TODAS as mudancas para que o usuario saiba tudo que tem disponivel
3. Sem jargao tecnico — o publico sao corretores e gestores, NAO desenvolvedores
4. Escreva como se estivesse explicando para o corretor o que ele pode fazer agora que nao podia antes
5. Agrupe por AREA FUNCIONAL do sistema (nao por tipo de commit):
   - Exemplos: Prospeccao, Metricas, Contatos, Negocios & Board, Geral
   - Adapte as categorias ao conteudo real — nao force categorias vazias
6. Use emoji relevante (um por item) + texto descritivo em linguagem simples
7. Tom: direto, util, como um colega explicando as novidades
8. NAO inclua hashes de commit, nomes de arquivo, termos tecnicos ou link de release
9. INCLUA todas as mudancas — nao omita nada, o usuario precisa saber tudo que mudou
10. Ao final, adicione uma FRASE DE EFEITO motivacional e comica (1 linha + emoji)
    Exemplos:
    - "Agora a desculpa de 'o sistema nao ajuda' ja era — bora vender! 😎🔥"
    - "Tanta novidade que ate o cafe ficou com ciumes! ☕🚀"
    - "Se vender fosse mais facil, ia parecer ate injusto! 😏💰"

Changelog tecnico:
{{changelog}}

Release notes (se disponivel):
{{release_notes}}
```

---

## Message Format

```
*{{project}} {{version}}* — Atualizado!

*{{categoria_1}}*
emoji item descritivo em linguagem de corretor
emoji item descritivo em linguagem de corretor

*{{categoria_2}}*
emoji item descritivo em linguagem de corretor
emoji item descritivo em linguagem de corretor

*{{categoria_N}}*
emoji item descritivo em linguagem de corretor

{{frase_de_efeito_motivacional}}

— Gage, deployando com confianca 🚀
```

### Example Output

```
*ZmobCRM v1.5.13* — Atualizado!

*Prospeccao*
🎯 Ao terminar uma sessao, voce ve um resumo completo: quem atendeu e nao tem negocio (pode criar ali mesmo), quem tem retorno agendado e quem ja tentou varias vezes com link direto pro WhatsApp
📞 Quando um lead atende, o sistema sugere o melhor horario pra ligar de volta — voce confirma com um clique
🔄 Retentativas automaticas de manha (9h) e a tarde (14h), sem agendar no fim de semana
🛡️ Contato pediu pra nao ligar mais? Marque com o motivo e ele sai de todas as filas. Gestores podem desbloquear depois

*Metricas*
📊 Dashboard redesenhado: visual novo com cards de visao geral, graficos de evolucao e funil de conversao
📊 Compare seu desempenho com a media da equipe
🏆 Ranking dos corretores no dashboard

*Contatos*
📋 Selecione varios contatos de uma vez segurando Shift e clicando
📝 Notas aparecem iguais na timeline e no painel lateral — tudo sincronizado

*Negocios & Board*
📋 Veja, edite e mova negocios entre pipelines sem sair da tela de prospeccao
🏠 Nos cards do board, agora aparece o produto/imovel vinculado ao negocio

*Geral*
🌗 Escolha tema claro, escuro ou automatico (acompanha seu celular/computador)
✅ Mais seguranca entre empresas diferentes no sistema

Agora a desculpa de "o sistema nao ajuda" ja era — bora vender! 😎🔥

— Gage, deployando com confianca 🚀
```

---

## Evolution API — Send Text Message

### Endpoint

```
POST {{EVOLUTION_API_URL}}/message/sendText/{{EVOLUTION_INSTANCE}}
```

### Headers

```
Content-Type: application/json
apikey: {{EVOLUTION_API_KEY}}
```

### Body

```json
{
  "number": "{{EVOLUTION_GROUP_ID}}",
  "text": "{{formatted_message}}"
}
```

### Curl Command

```bash
curl -s -X POST "{{EVOLUTION_API_URL}}/message/sendText/{{EVOLUTION_INSTANCE}}" \
  -H "Content-Type: application/json" \
  -H "apikey: {{EVOLUTION_API_KEY}}" \
  -d '{
    "number": "{{EVOLUTION_GROUP_ID}}",
    "text": "{{formatted_message}}"
  }'
```

### Expected Response (Success)

```json
{
  "key": {
    "remoteJid": "GROUP_ID@g.us",
    "fromMe": true,
    "id": "MESSAGE_ID"
  },
  "message": {
    "extendedTextMessage": {
      "text": "..."
    }
  },
  "messageTimestamp": "1234567890",
  "status": "PENDING"
}
```

### Error Handling

| HTTP Status | Meaning | Action |
| --- | --- | --- |
| 200 | Success | Log message ID |
| 400 | Bad request (invalid group ID) | Show error, check EVOLUTION_GROUP_ID |
| 401 | Invalid API key | Show error, check EVOLUTION_API_KEY |
| 404 | Instance not found | Show error, check EVOLUTION_INSTANCE |
| 500 | Server error | Show error, suggest retry |

---

## Environment Variables Required

| Variable | Description | Example |
| --- | --- | --- |
| `EVOLUTION_API_URL` | Evolution API base URL | `https://api.evolution.example.com` |
| `EVOLUTION_API_KEY` | API authentication key | `your-api-key` |
| `EVOLUTION_INSTANCE` | WhatsApp instance name | `zmob-instance` |
| `EVOLUTION_GROUP_ID` | Target group ID | `120363XXX@g.us` |

---

**Template Version:** 2.0.0
**Created:** 2026-02-25
**Updated:** 2026-03-14
**Part of:** @devops agent — release notification workflow
