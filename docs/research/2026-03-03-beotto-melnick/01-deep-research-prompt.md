# Estrategia de Pesquisa

## Sub-queries Executadas

### Wave 1 (7 buscas paralelas)
1. "Beotto plataforma imobiliaria incorporadora o que e"
2. "Beotto Melnick corretores empreendimentos imobiliarios"
3. "Beotto espelho de vendas incorporadora funcionalidades"
4. "Beotto API integracao CRM imobiliario"
5. "Beotto vs Orulo plataforma incorporadora diferenca"
6. "beotto.com.br portal vendas imobiliario"
7. "Beotto incorporadoras clientes quem usa"

### Wave 2 (Deep reads + buscas direcionadas)
- WebFetch: beotto.com (pagina principal)
- WebFetch: app.beotto.com/melnick (portal Melnick -- bloqueado por JS)
- WebFetch: Apple App Store (Be Otto iOS) -- dados completos obtidos
- WebFetch: LinkedIn Beotto -- dados da empresa obtidos
- Buscas: CNPJ, socios, relacao societaria com Melnick
- Buscas: Orulo API, integracoes, documentacao

### Wave 3 (Gap-filling)
- Buscas: incorporadoras parceiras, CV CRM comparacao
- WebFetch: Orulo integracoes, incorporadoras, corretores
- Busca: quadro societario CNPJ 34433851000140 -- CONFIRMACAO: Melnick e socia

## Fontes Primarias Utilizadas
- beotto.com (site oficial)
- Apple App Store (descricao completa do app)
- LinkedIn (perfil da empresa)
- CNPJ.biz (registro empresarial)
- orulo.com.br (comparativo)
- movidesk.orulo.com.br (documentacao API Orulo)

## Cobertura
- **Score:** 75/100
- **Gaps remanescentes:** Nao foi possivel acessar o app (requer login), nao ha documentacao publica de API do Beotto, dados sobre outras incorporadoras clientes sao limitados
