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
Voce e um comunicador de produto. Transforme o changelog tecnico abaixo em um resumo
amigavel para um grupo de WhatsApp. Regras:

1. Escreva em portugues brasileiro (pt-BR)
2. Maximo 500 caracteres
3. Sem jargao tecnico — o publico nao e desenvolvedor
4. Agrupe em categorias quando aplicavel:
   - Novidades (feat)
   - Melhorias (refactor, perf, chore relevante)
   - Correcoes (fix)
5. Use bullet points com emoji simples (um por item)
6. Tom: profissional mas acessivel
7. NAO inclua hashes de commit, nomes de arquivo ou termos tecnicos
8. Se houver muitos itens, priorize os mais impactantes para o usuario final
9. Ao final do resumo, adicione uma SAUDACAO PERSONALIZADA (1 linha + emoji) relacionada ao conteudo da atualizacao. Exemplos:
   - Fix de UI: "Visual limpo, experiencia garantida! ✨"
   - Nova feature: "Mais poder nas suas maos! 💪"
   - Performance: "Agora voando mais rapido! ⚡"
10. NAO inclua link de detalhes/release URL na mensagem

Changelog tecnico:
{{changelog}}

Release notes (se disponivel):
{{release_notes}}
```

---

## Message Format

```
*{{project}} {{version}}* — Atualizado!

{{summary}}

{{saudacao_personalizada}}

— Gage, deployando com confianca 🚀
```

### Example Output

```
*ZmobCRM v1.4.0* — Atualizado!

*Novidades*
- Notificacoes por WhatsApp para releases

*Melhorias*
- Interface do sidebar com novo visual
- Desempenho geral aprimorado

*Correcoes*
- Problema com datas em atividades resolvido
- Correcao de erros visuais menores

Mais poder nas suas maos! 💪

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

**Template Version:** 1.0.0
**Created:** 2026-02-25
**Part of:** @devops agent — release notification workflow
