# release-notification

Envia notificacao de release via WhatsApp usando Evolution API.

## Metadata

```yaml
id: release-notification
name: Release WhatsApp Notification
category: communication
agent: devops
command: notify
elicit: true
```

## Description

Task standalone para enviar notificacao de release no grupo WhatsApp via Evolution API.
Coleta informacoes do ultimo release, gera resumo nao-tecnico via LLM, mostra preview
ao usuario para aprovacao/edicao, e envia a mensagem.

## Dependencies

- **Template:** `release-whatsapp-notification-tmpl.md`
- **Tools:** `git`, `github-cli`
- **Environment:** `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `EVOLUTION_GROUP_ID`

## Pre-conditions

1. Repositorio git inicializado com pelo menos 1 tag
2. GitHub CLI autenticado (`gh auth status`)
3. Variaveis de ambiente da Evolution API configuradas em `.env`

## Usage

```
@devops *notify           # Usa ultimo release automaticamente
@devops *notify v1.4.0    # Especifica versao
```

## Workflow

### Step 1: Validate Environment

Verificar se as variaveis de ambiente da Evolution API estao configuradas:

```bash
# Verificar cada variavel
echo "EVOLUTION_API_URL: ${EVOLUTION_API_URL:-(nao configurada)}"
echo "EVOLUTION_API_KEY: ${EVOLUTION_API_KEY:-(nao configurada)}"
echo "EVOLUTION_INSTANCE: ${EVOLUTION_INSTANCE:-(nao configurada)}"
echo "EVOLUTION_GROUP_ID: ${EVOLUTION_GROUP_ID:-(nao configurada)}"
```

**Se alguma estiver vazia:**
- Mostrar mensagem de erro clara indicando quais variaveis faltam
- Instruir o usuario a configurar no `.env`
- Referenciar `.env.example` como modelo
- **ABORTAR** — nao continuar sem todas as variaveis

### Step 2: Detect Release

Detectar a versao alvo (argumento ou ultima tag):

```bash
# Se versao foi passada como argumento, usar ela
# Senao, detectar ultima tag
TAG=$(git describe --tags --abbrev=0 2>/dev/null)

# Verificar se a tag existe
if [ -z "$TAG" ]; then
  echo "Erro: Nenhuma tag encontrada no repositorio."
  echo "Crie um release primeiro: @devops *release"
  exit 1
fi

# Buscar info do release no GitHub (se existir)
gh release view "$TAG" --json tagName,body,url 2>/dev/null
```

**Outputs:**
- `TAG` — versao alvo (ex: v1.4.0)
- `RELEASE_URL` — URL do release no GitHub
- `RELEASE_NOTES` — corpo do release (pode estar vazio)

### Step 3: Collect Changelog

Coletar commits entre a penultima e a ultima tag:

```bash
# Encontrar tag anterior
PREV_TAG=$(git describe --tags --abbrev=0 "$TAG^" 2>/dev/null)

if [ -z "$PREV_TAG" ]; then
  # Sem tag anterior, usar todos os commits ate a tag
  git log "$TAG" --oneline --no-merges
else
  # Commits entre as duas tags
  git log "$PREV_TAG".."$TAG" --oneline --no-merges
fi
```

**Output:** Lista de commits em formato oneline

### Step 4: Generate Summary (LLM)

Usar o prompt do template `release-whatsapp-notification-tmpl.md` para gerar o resumo:

1. Carregar o prompt LLM do template
2. Substituir `{{changelog}}` com os commits coletados
3. Substituir `{{release_notes}}` com o corpo do release (se existir)
4. Gerar resumo via Claude (inline, sem API externa)
5. Formatar mensagem final conforme template:

```
*{project} {version}* — Atualizado!

{summary}

Detalhes: {release_url}
```

**Constraints:**
- Maximo 500 caracteres no resumo
- Portugues brasileiro
- Sem jargao tecnico

### Step 5: Preview & Approval (elicit: true)

**OBRIGATORIO** — Mostrar preview ao usuario antes de enviar:

```
Essa e a mensagem que sera enviada ao grupo WhatsApp:

---
*ZmobCRM v1.4.0* — Atualizado!

[resumo gerado]

Detalhes: https://github.com/...
---

Opcoes:
1. Enviar — envia a mensagem como esta
2. Editar — forneca o texto que deseja enviar
3. Cancelar — aborta a notificacao
```

**Handling:**

- **Opcao 1 (Enviar):** Prosseguir para Step 6
- **Opcao 2 (Editar):** Aguardar usuario fornecer novo texto, voltar ao preview com texto editado
- **Opcao 3 (Cancelar):** Log "Notification cancelled by user", encerrar

### Step 6: Send via Evolution API

Enviar mensagem usando curl conforme template.

**IMPORTANTE:** Salvar a mensagem em arquivo temporario e usar `jq` para construir o JSON.
Isso evita problemas de escape (barras invertidas `\!` antes de pontuacao).

```bash
# Salvar mensagem em arquivo temporario (preserva caracteres especiais)
TMPFILE=$(mktemp)
cat > "$TMPFILE" << 'MSGEOF'
${MESSAGE}
MSGEOF

# Construir JSON com jq (escape correto automatico)
PAYLOAD=$(jq -n --arg number "${EVOLUTION_GROUP_ID}" --rawfile text "$TMPFILE" '{number: $number, text: $text}')
rm -f "$TMPFILE"

# Enviar
curl -s -X POST "${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${EVOLUTION_API_KEY}" \
  -d "$PAYLOAD"
```

**Tratamento de resposta:**

| Status | Acao |
| --- | --- |
| 200 + key presente | Sucesso — mostrar confirmacao |
| 400 | Erro — group ID invalido |
| 401 | Erro — API key invalida |
| 404 | Erro — instancia nao encontrada |
| 500 | Erro — servidor, sugerir retry |

### Step 7: Log Result

Registrar resultado da operacao:

**Sucesso:**
```
Notificacao enviada com sucesso!
- Versao: {version}
- Grupo: {group_id}
- Message ID: {message_id}
```

**Falha:**
```
Falha ao enviar notificacao.
- Versao: {version}
- Erro: {error_message}
- HTTP Status: {status_code}
```

## Error Scenarios

| Cenario | Mensagem | Acao |
| --- | --- | --- |
| Env vars ausentes | "Variaveis de ambiente nao configuradas: [lista]. Configure no .env (veja .env.example)" | Abortar |
| Sem tags no repo | "Nenhuma tag encontrada. Crie um release primeiro: @devops *release" | Abortar |
| gh CLI nao autenticado | "GitHub CLI nao autenticado. Execute: gh auth login" | Abortar |
| Release nao existe no GitHub | "Tag encontrada mas release nao existe no GitHub. Continuar com changelog local?" | Elicit: continuar/cancelar |
| Evolution API offline | "Evolution API nao respondeu. Verifique EVOLUTION_API_URL" | Abortar |
| Grupo nao encontrado | "Grupo WhatsApp nao encontrado. Verifique EVOLUTION_GROUP_ID" | Abortar |

## Post-conditions

- Mensagem enviada no grupo WhatsApp (ou cancelada pelo usuario)
- Resultado logado no terminal

---

**Task Version:** 1.0.0
**Created:** 2026-02-25
**Agent:** @devops (Gage)
