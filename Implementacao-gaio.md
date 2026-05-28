# Implementacao Gaio: AI App Builder como container isolado

## Objetivo

Implementar o AI App Builder dentro do `gaio-dataos` como um motor separado, rodando em um container proprio no stack do Gaio.

O objetivo nao e copiar a interface atual do `ai-app-builder` para dentro do Gaio. O objetivo e reaproveitar a ideia do motor de geracao/edicao de apps, mas integrado ao contexto real do Gaio: apps, tabelas, colunas, estatisticas, workflows, agentes, reports e permissoes.

## Decisao de arquitetura

O AI App Builder deve rodar como um servico separado:

```text
gaio-dataos
|-- apps/api
|-- apps/web
|-- packages
`-- ai-builder-runner
```

Fluxo principal:

```text
Studio / AI Chat
  -> apps/api
  -> ai-builder-runner
  -> workspace isolado
  -> plano/diff
  -> apps/api
  -> apps/web
  -> aprovacao do usuario
  -> apply controlado
```

Essa separacao evita executar geracao de codigo, comandos ou edicoes livres dentro do processo principal da API do Gaio.

## Responsabilidades

### apps/web

Responsavel pela experiencia do usuario:

- Abrir o painel do AI Builder dentro do Studio ou Agents.
- Enviar o prompt do usuario.
- Mostrar contexto detectado.
- Mostrar plano de implementacao.
- Mostrar diff antes de aplicar.
- Permitir aprovar, rejeitar ou pedir ajustes.
- Exibir logs/status da execucao.

Pontos provaveis de integracao:

- Studio sidebar.
- AI Resource tools.
- TableView.
- Board/Workflow.
- Report/Dashboard builder.

### apps/api

Responsavel por seguranca, contexto e orquestracao:

- Autenticar usuario.
- Validar permissao do `appId`.
- Montar contexto seguro do app.
- Buscar tabelas, colunas, estatisticas e workflow nodes.
- Enviar contexto limitado para o runner.
- Persistir historico de solicitacoes.
- Salvar plano, diff, status e resultado.
- Aplicar alteracoes somente depois da aprovacao.

### ai-builder-runner

Responsavel pela execucao isolada:

- Receber prompt e contexto.
- Criar workspace temporario.
- Rodar o motor de AI/App Builder.
- Gerar plano.
- Gerar patch/diff.
- Aplicar alteracoes apenas em paths permitidos.
- Retornar logs, status e arquivos alterados.

O runner nao deve acessar diretamente o banco principal do Gaio nem credenciais sensiveis. A API deve montar o contexto seguro e enviar somente o necessario.

## Contexto que o runner deve receber

Exemplo de contrato:

```ts
type AiBuilderContext = {
  appId: string
  userId: string
  threadId?: string
  prompt: string
  mode: "plan" | "apply"
  tables: Array<{
    name: string
    label?: string
    rowCount?: number
    fields: Array<{
      columnName: string
      title?: string
      dataType?: string
      description?: string
      stats?: Record<string, unknown>
    }>
  }>
  workflowNodes: Array<{
    id: string
    type: string
    label?: string
    tableName?: string
  }>
  allowedTargets: string[]
  guardrails: {
    allowWrite: boolean
    allowShell: boolean
    maxRows: number
    onlySelectQueries: boolean
  }
}
```

## Endpoints propostos na API do Gaio

```text
POST /api/ai-builder/plan
POST /api/ai-builder/apply
GET  /api/ai-builder/jobs/:jobId
POST /api/ai-builder/jobs/:jobId/cancel
GET  /api/ai-builder/jobs/:jobId/diff
```

## Endpoints propostos no container runner

```text
GET  /health
POST /plan
POST /apply
GET  /status/:jobId
POST /cancel/:jobId
```

## Guardrails obrigatorios

- O runner deve trabalhar em workspace isolado.
- O runner deve ter timeout por job.
- O runner deve ter limite de CPU/memoria no Docker.
- O runner nao deve receber credenciais brutas.
- O runner nao deve acessar o banco diretamente.
- Queries geradas devem ser apenas `SELECT`.
- Queries devem ter limite de linhas.
- Alteracoes devem gerar diff antes de aplicar.
- Aplicacao deve exigir aprovacao do usuario.
- Paths permitidos devem ser explicitamente enviados pela API.
- O runner nao deve editar arquivos fora de `allowedTargets`.

## Primeiro MVP recomendado

Caso de uso inicial:

```text
Usuario pede:
"Crie um dashboard para a tabela X com cards, grafico e tabela resumo."
```

O fluxo do MVP:

1. Usuario abre o AI Builder no Studio.
2. Usuario informa o prompt.
3. API identifica `appId`, tabelas disponiveis e contexto atual.
4. API busca campos com endpoints de tabela.
5. API monta `AiBuilderContext`.
6. API chama `ai-builder-runner /plan`.
7. Runner retorna plano com arquivos e componentes sugeridos.
8. UI mostra plano.
9. Usuario aprova.
10. API chama `ai-builder-runner /apply`.
11. Runner gera patch/diff.
12. UI mostra diff.
13. Usuario aprova aplicacao final.
14. API salva/aplica resultado no projeto.

## Fases de implementacao

### Fase 1: Descoberta e contrato

- Mapear onde o AI Builder aparece na UI.
- Definir se entra em Studio sidebar, Agents ou TableView.
- Criar DTOs de contexto, plano, diff e job.
- Definir `allowedTargets` iniciais.
- Definir formato do plano retornado.

### Fase 2: Backend no Gaio

- Criar modulo `apps/api/src/components/ai-builder`.
- Criar rotas `/api/ai-builder/*`.
- Criar servico para montar contexto seguro.
- Reaproveitar dados de tabelas, fields, stats e workflow nodes.
- Criar client HTTP para falar com `ai-builder-runner`.

### Fase 3: Container runner

- Criar pasta/servico `ai-builder-runner`.
- Criar Dockerfile proprio.
- Criar endpoints `/health`, `/plan`, `/apply`, `/status/:jobId`.
- Criar gerenciador de workspace temporario.
- Criar validacao de paths permitidos.
- Gerar plano e diff sem aplicar direto.

### Fase 4: UI no Studio

- Criar painel do AI Builder.
- Adicionar campo de prompt.
- Mostrar contexto detectado.
- Mostrar plano retornado.
- Mostrar diff.
- Criar botoes de aprovar, rejeitar e pedir ajuste.
- Mostrar logs/status do job.

### Fase 5: Aplicacao controlada

- Aplicar mudancas somente depois de aprovacao.
- Persistir historico do job.
- Persistir plano e diff.
- Registrar usuario, app, prompt e resultado.
- Adicionar cancelamento de job.

### Fase 6: Expansao

- Geracao de dashboards.
- Geracao de reports.
- Geracao de widgets.
- Criacao de queries verificadas.
- Sugestao de workflow nodes.
- Integracao com agentes existentes.

## O que evitar

- Nao rodar o motor dentro do processo da API principal.
- Nao usar o shell executor atual como execucao livre para AI Builder.
- Nao dar acesso direto ao banco para o runner.
- Nao aplicar mudancas sem diff.
- Nao deixar o modelo escolher qualquer path do repo.
- Nao misturar contexto sensivel com prompt bruto.

## Resultado esperado

O Gaio passa a ter um AI Builder integrado ao Studio, capaz de usar o contexto real do app e dos dados para sugerir e aplicar mudancas controladas.

A arquitetura fica segura porque a API continua dona de autenticacao, permissoes e contexto, enquanto o runner fica isolado para geracao, plano, diff e aplicacao controlada.
