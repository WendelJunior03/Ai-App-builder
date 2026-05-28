# Arquitetura do AI App Builder

Este documento descreve as tecnologias usadas e a arquitetura atual do projeto `ai-app-builder`, com base nos arquivos deste checkout.

## Visao geral

O AI App Builder e uma ferramenta local para criar e editar apps React usando IA. A aplicacao tem uma interface web propria, um backend Hono/Node, um workspace editavel e uma integracao com o Opencode CLI para transformar prompts em alteracoes reais nos arquivos do app ativo.

O produto roda com tres superficies principais:

- Builder web: interface principal em `http://localhost:3000`.
- API backend: rotas `/api/*`, tambem servidas em `http://localhost:3000`.
- Preview do app gerado: Vite em `http://localhost:5173`.
- Opencode serve: exposto no Docker em `http://localhost:4096`.

## Tecnologias usadas

### Linguagem e runtime

- TypeScript: usado no frontend do builder, backend, template e plugin.
- JavaScript/TSX: usado nos apps React e componentes.
- Node.js 20: runtime base do container Docker.
- Bun: suportado pelo backend em modo `bun run --hot`, embora o fluxo local use `tsx`.
- Shell script: usado em `start-local.sh` e `docker/entrypoint.sh`.

### Frontend do builder

Local: `web/`

- React 18: UI principal do builder.
- React DOM: montagem da aplicacao no browser.
- Vite 5: dev/build do frontend.
- TypeScript 5: tipagem e build.
- Tailwind CSS 3: estilos utilitarios.
- PostCSS e Autoprefixer: pipeline CSS.
- Zustand: estado global da interface.
- Monaco Editor: visualizacao de codigo.
- react-resizable-panels: layout redimensionavel entre chat, preview e codigo.
- lucide-react: icones.
- clsx: composicao condicional de classes.
- tailwind-merge: merge de classes Tailwind.

Arquivos principais:

- `web/src/App.tsx`
- `web/src/main.tsx`
- `web/src/hooks/useAppBuilder.ts`
- `web/src/stores/appStore.ts`
- `web/src/api/client.ts`
- `web/src/components/*`

### Backend

Local: `server/`

- Hono: framework HTTP.
- `@hono/node-server`: adaptador para rodar Hono em Node.
- TypeScript: codigo fonte do backend.
- `tsx`: execucao local de TypeScript sem build previo.
- APIs nativas do Node: `fs`, `fs/promises`, `path`, `child_process`, `events`.
- `fetch`: usado para consultar `models.dev` e health do Opencode quando aplicavel.

Arquivos principais:

- `server/src/index.ts`
- `server/src/routes/chat.ts`
- `server/src/routes/files.ts`
- `server/src/routes/projects.ts`
- `server/src/routes/settings.ts`
- `server/src/routes/session.ts`
- `server/src/routes/approve.ts`
- `server/src/routes/health.ts`
- `server/src/services/opencode-client.ts`
- `server/src/services/projects.ts`
- `server/src/services/workspace.ts`

### Motor de IA e automacao

- Opencode CLI: motor chamado pelo backend para editar o workspace ativo.
- Comando principal: `opencode run <prompt> --format json --dangerously-skip-permissions`.
- Opencode serve: iniciado no Docker na porta `4096`.
- Codex CLI: usado apenas no painel de configuracoes para login/status/logout local do Codex; o motor principal do builder continua sendo Opencode.
- models.dev: catalogo consultado para enriquecer limites de contexto dos modelos.

### Template de app gerado

Local: `templates/react-shadcn/`

- React 18
- React DOM
- Vite
- TypeScript
- Tailwind CSS
- PostCSS
- Autoprefixer
- lucide-react
- clsx
- tailwind-merge
- class-variance-authority

O template e copiado para o workspace inicial e para cada novo projeto criado.

### Plugin de aprovacao

Local: `plugins/approval-plugin/`

- TypeScript
- `@opencode/sdk`

Ferramentas expostas pelo plugin:

- `propose-plan`: proposta de plano antes de executar uma mudanca.
- `propose-file`: proposta de escrita/alteracao de arquivo.
- `guarded-command`: proposta de comando sensivel.

O backend possui rotas de aprovacao em memoria para registrar e responder a pedidos de aprovacao.

### Containerizacao e infraestrutura local

- Docker
- Docker Compose
- Imagem base `node:20-alpine`
- Volumes Docker para persistir `/workspace`
- Vite para preview do app ativo
- Hono para API e arquivos estaticos do builder

Arquivos:

- `docker-compose.yml`
- `docker/Dockerfile`
- `docker/entrypoint.sh`
- `start-local.sh`

## Arquitetura em alto nivel

```text
Usuario
  |
  v
Web UI React (web/)
  |
  | HTTP /api/*
  v
Backend Hono (server/)
  |
  | gerencia projetos, arquivos, settings e chat
  v
Workspace ativo (/workspace ou .workspace/)
  |
  | prompt contextualizado
  v
Opencode CLI
  |
  | altera arquivos React/Vite/Tailwind
  v
Vite Preview (:5173)
  |
  v
Iframe no Builder
```

## Camadas da aplicacao

### 1. Interface web

A interface do builder fica em `web/`. Ela e responsavel por:

- Inicializar uma sessao com `/api/session/init`.
- Buscar configuracoes em `/api/settings`.
- Buscar modelos em `/api/settings/models`.
- Listar projetos em `/api/projects`.
- Listar arquivos em `/api/files`.
- Enviar prompts para `/api/chat`.
- Renderizar mensagens do usuario e da IA.
- Mostrar status do motor.
- Mostrar o preview do app ativo em iframe.
- Exibir arquivos e conteudo selecionado no Monaco Editor.
- Criar e selecionar projetos.
- Abrir painel de configuracoes.

O estado global fica em `web/src/stores/appStore.ts`, usando Zustand. O hook `web/src/hooks/useAppBuilder.ts` concentra a inicializacao da tela e as acoes principais de chat, arquivos e projetos. A classe `ApiClient`, em `web/src/api/client.ts`, encapsula as chamadas HTTP para o backend.

### 2. API backend

O backend fica em `server/` e usa Hono. O arquivo `server/src/index.ts` registra as rotas:

- `/api/chat`
- `/api/approve`
- `/api/files`
- `/api/session`
- `/api/health`
- `/api/settings`
- `/api/projects`

Tambem aplica CORS para origens locais e serve os arquivos estaticos do build do frontend a partir de `STATIC_DIR` ou `../web/dist`.

### 3. Workspace ativo

O workspace e o diretorio onde o app React gerado/editado fica materializado.

- No Docker: `/workspace`.
- No modo local: `.workspace/`.

O `WorkspaceManager`, em `server/src/services/workspace.ts`, lista, le e escreve arquivos nesse diretorio. A listagem oculta entradas internas como arquivos iniciados por `.`, `node_modules` e `projects`.

### 4. Gerenciamento de projetos

O `ProjectManager`, em `server/src/services/projects.ts`, implementa multiplos projetos sobre um workspace ativo.

Estrutura esperada dentro do workspace:

```text
/workspace
|-- .builder/
|   `-- projects.json
|-- projects/
|   |-- default/
|   `-- outro-projeto/
|-- package.json
|-- src/
`-- ...
```

Responsabilidades:

- Criar a configuracao `.builder/projects.json`.
- Criar o projeto `default` quando nao ha projetos.
- Copiar o template para novos projetos.
- Salvar o projeto ativo antes de trocar de projeto.
- Copiar o projeto selecionado para a raiz do workspace ativo.
- Preservar entradas reservadas: `.builder`, `projects`, `node_modules`.
- Registrar metricas de tokens por projeto.

O projeto ativo e sempre refletido na raiz do workspace. As pastas em `projects/<id>` funcionam como snapshots persistidos de cada projeto.

### 5. Integracao com Opencode

A classe `OpencodeClient`, em `server/src/services/opencode-client.ts`, localiza o binario do Opencode e executa:

```bash
opencode run "<prompt>" --format json --dangerously-skip-permissions
```

O processo roda com `cwd` apontando para o workspace ativo. O backend le os eventos JSON emitidos pelo Opencode, extrai texto, erros, eventos de ferramenta e metricas de uso.

O backend tambem normaliza uso de tokens vindo de eventos como:

- `usage`
- `step_finish`
- `step-finish`

As metricas normalizadas incluem:

- tokens de entrada
- tokens de saida
- tokens de raciocinio
- cache read
- cache write
- total
- janela de contexto
- tokens restantes
- custo em USD, quando disponivel

### 6. Prompt contextualizado

Antes de chamar o Opencode, `server/src/routes/chat.ts` transforma a mensagem do usuario em um prompt com contexto. Esse prompt instrui o motor a:

- editar o app React ativo em `/workspace`;
- alterar o conteudo do app, nao o nome do projeto;
- ler arquivos necessarios;
- aplicar alteracoes com `edit` ou `write`;
- nao alterar `.builder`, `projects` ou `node_modules`;
- responder brevemente com arquivos alterados;
- priorizar arquivos como `src/App.tsx`, `src/components/*`, `src/index.css` e `package.json`.

Existe tambem um tratamento especial para renomeacao de projeto. Quando o texto indica que o usuario quer mudar o nome do projeto no builder, o backend atualiza apenas o metadata do projeto e nao chama o Opencode.

### 7. Configuracoes

As configuracoes ficam em:

```text
~/.config/ai-app-builder/settings.json
```

O backend gerencia:

- modelo selecionado;
- provider;
- API key;
- lista de modelos disponiveis;
- login/status/logout do Codex CLI.

Modelos configurados no codigo:

- `opencode/deepseek-v4-flash-free`
- `opencode/nemotron-3-super-free`
- `opencode/qwen3.6-plus-free`

Quando possivel, o backend consulta `https://models.dev/api.json` para obter a janela de contexto atual. Se a consulta falhar, usa os valores locais de fallback.

## Fluxos principais

### Inicializacao da tela

```text
Browser abre http://localhost:3000
  -> React monta web/src/App.tsx
  -> useAppBuilder chama /api/session/init e /api/settings
  -> busca /api/projects
  -> busca /api/files
  -> atualiza Zustand
  -> iframe aponta para http://localhost:5173
```

### Envio de prompt

```text
Usuario envia mensagem
  -> web/src/api/client.ts chama POST /api/chat
  -> chatRoute garante ProjectManager inicializado
  -> WorkspaceManager lista arquivos atuais
  -> backend monta prompt contextualizado
  -> OpencodeClient executa opencode run no workspace
  -> eventos JSON sao lidos e normalizados
  -> ProjectManager salva projeto ativo
  -> arquivos sao listados novamente
  -> uso de tokens e salvo no projeto ativo
  -> frontend atualiza chat, arquivos e metricas
  -> preview Vite reflete os arquivos alterados
```

### Criacao de projeto

```text
Usuario cria projeto
  -> POST /api/projects
  -> ProjectManager salva projeto ativo atual
  -> copia templates/react-shadcn para projects/<slug>
  -> limpa raiz do workspace preservando reservas
  -> copia o novo projeto para a raiz do workspace
  -> retorna projetos, activeProjectId e arquivos
```

### Selecao de projeto

```text
Usuario seleciona projeto
  -> POST /api/projects/:id/select
  -> ProjectManager salva projeto ativo atual
  -> atualiza activeProjectId
  -> limpa raiz do workspace preservando reservas
  -> copia projects/<id> para a raiz do workspace
  -> frontend recarrega arquivos e preview
```

### Leitura de arquivo

```text
Usuario seleciona arquivo
  -> GET /api/files/file?path=...
  -> WorkspaceManager le o arquivo no workspace ativo
  -> frontend exibe conteudo no Monaco Editor
```

## Rotas da API

### Chat

- `POST /api/chat`: envia mensagem para o motor, salva projeto ativo, retorna resposta, arquivos, projetos e metricas.
- `GET /api/chat/debug`: diagnostico de ambiente, workspace e Opencode.

### Sessao

- `POST /api/session/init`: inicializa sessao simples em memoria e garante projetos inicializados.
- `POST /api/session/reset`: endpoint simples de reset.

### Arquivos

- `GET /api/files`: lista arquivos do workspace ativo.
- `GET /api/files/file?path=...`: le um arquivo.
- `POST /api/files/file`: escreve um arquivo e salva o projeto ativo.

### Projetos

- `GET /api/projects`: lista projetos e projeto ativo.
- `POST /api/projects`: cria projeto novo a partir do template.
- `POST /api/projects/:id/select`: troca o projeto ativo.

### Configuracoes

- `GET /api/settings`: le settings locais.
- `PUT /api/settings`: salva modelo, provider e API key.
- `GET /api/settings/models`: lista modelos disponiveis com janela de contexto.
- `GET /api/settings/codex/status`: verifica autenticacao do Codex CLI.
- `POST /api/settings/codex/login`: inicia `codex login --device-auth`.
- `POST /api/settings/codex/logout`: executa `codex logout`.

### Aprovacoes

- `POST /api/approve`: cria uma aprovacao pendente.
- `POST /api/approve/respond`: responde aprovacao.
- `GET /api/approve/pending`: lista aprovacoes pendentes por sessao.
- `GET /api/approve/:requestId`: consulta uma aprovacao.

### Health

- `GET /api/health`: verifica disponibilidade do motor Opencode.

## Persistencia

O projeto nao usa banco de dados. A persistencia e baseada em arquivos.

Dados persistidos:

- Projetos e metricas: `.builder/projects.json` dentro do workspace.
- Snapshots dos projetos: `projects/<id>/` dentro do workspace.
- Codigo do app ativo: raiz do workspace.
- Settings do builder: `~/.config/ai-app-builder/settings.json`.
- Dependencias: `node_modules` no workspace, `server/node_modules`, `web/node_modules`.

No Docker, o volume `workspace` mantem `/workspace` entre execucoes do container.

## Execucao local

O script `start-local.sh` executa o modo local:

1. Define `.workspace/` como workspace.
2. Mata processos antigos nas portas `3000` e `5173`.
3. Copia o template se o workspace estiver vazio.
4. Instala dependencias do workspace.
5. Instala dependencias do backend.
6. Compila o frontend em `web/dist`.
7. Inicia Vite do app ativo em `5173`.
8. Inicia o backend Hono em `3000`.

Comando:

```bash
./start-local.sh
```

## Execucao com Docker

O `docker-compose.yml` sobe o servico `app` com:

- porta `3000` para API e frontend;
- porta `5173` para preview Vite;
- porta `4096` para Opencode serve;
- volume `workspace:/workspace`;
- montagem read-only de `templates`, `plugins`, `server/src` e `web/dist`.

O `docker/entrypoint.sh`:

1. Inicializa `/workspace` com o template se estiver vazio.
2. Instala dependencias do workspace.
3. Instala o plugin de aprovacao como symlink em `~/.opencode/plugins`.
4. Inicia Vite na porta `5173`.
5. Inicia o backend Hono.
6. Inicia `opencode serve` na porta `4096`.

Comando raiz:

```bash
npm run dev
```

## Variaveis de ambiente

| Variavel | Padrao | Uso |
| --- | --- | --- |
| `WORKSPACE_DIR` | `/workspace` | Diretorio do app ativo. No modo local vira `.workspace`. |
| `TEMPLATE_DIR` | `/templates/react-shadcn` | Template usado para inicializar projetos no Docker. |
| `STATIC_DIR` | `../web/dist` | Build estatico do frontend servido pelo backend. |
| `PORT` | `3000` | Porta do backend Hono. |
| `SETTINGS_DIR` | `$HOME/.config/ai-app-builder` | Diretorio das settings locais. |
| `OPENCODE_TIMEOUT_MS` | `120000` | Timeout de execucao do Opencode. |
| `OPENCODE_SERVER_PASSWORD` | vazio | Senha repassada ao ambiente do Opencode. |

## Estrutura do repositorio

```text
.
|-- Arquitetura.MD
|-- README.md
|-- package.json
|-- docker-compose.yml
|-- start-local.sh
|-- docker/
|   |-- Dockerfile
|   `-- entrypoint.sh
|-- server/
|   |-- package.json
|   `-- src/
|       |-- index.ts
|       |-- routes/
|       |-- services/
|       `-- lib/
|-- web/
|   |-- package.json
|   |-- vite.config.ts
|   `-- src/
|       |-- api/
|       |-- components/
|       |-- hooks/
|       |-- stores/
|       `-- types/
|-- templates/
|   `-- react-shadcn/
`-- plugins/
    `-- approval-plugin/
```

## Limites e pontos de atencao

- A sessao do backend e simples e mantida em memoria.
- As aprovacoes tambem ficam em memoria, com limpeza de entradas antigas.
- O builder depende do Opencode CLI estar instalado e executavel.
- O comando do Opencode roda com `--dangerously-skip-permissions`, entao o isolamento real vem do workspace/container.
- Nao ha banco de dados; backups dependem dos arquivos do workspace.
- No modo Docker, `web/dist` precisa existir porque e montado no container.
- A listagem de arquivos oculta `.builder`, `projects`, `node_modules` e arquivos iniciados por ponto.
- A troca de projeto copia arquivos entre `projects/<id>` e a raiz do workspace.

## Onde alterar cada parte

| Necessidade | Arquivos principais |
| --- | --- |
| Mudar layout do builder | `web/src/components/*`, `web/src/App.tsx`, `web/src/index.css` |
| Mudar chamadas de API | `web/src/api/client.ts` |
| Mudar estado global | `web/src/stores/appStore.ts` |
| Mudar fluxo de inicializacao/chat | `web/src/hooks/useAppBuilder.ts` |
| Mudar rotas HTTP | `server/src/routes/*` |
| Mudar execucao do Opencode | `server/src/services/opencode-client.ts` |
| Mudar prompt enviado ao motor | `server/src/routes/chat.ts` |
| Mudar projetos/workspace | `server/src/services/projects.ts`, `server/src/services/workspace.ts` |
| Mudar modelos/settings | `server/src/routes/settings.ts`, `web/src/components/SettingsPanel.tsx` |
| Mudar template dos apps gerados | `templates/react-shadcn/` |
| Mudar Docker/local startup | `docker/*`, `docker-compose.yml`, `start-local.sh` |
| Mudar plugin de aprovacao | `plugins/approval-plugin/` |

