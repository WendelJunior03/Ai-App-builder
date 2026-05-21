# AI App Builder

AI App Builder e um construtor local de aplicacoes React orientado por IA. Ele combina uma interface web propria, um backend Hono/Node, um workspace editavel e o motor do Opencode para transformar prompts em alteracoes reais no codigo de um app React com preview ao vivo.

O projeto foi desenhado para rodar como uma ferramenta standalone: o usuario conversa com o builder, o backend envia o pedido para o Opencode dentro do workspace ativo, os arquivos sao atualizados e a aplicacao gerada aparece em um iframe de preview.

## Sumario

- [Visao geral](#visao-geral)
- [Principais recursos](#principais-recursos)
- [Arquitetura](#arquitetura)
- [Estrutura do repositorio](#estrutura-do-repositorio)
- [Requisitos](#requisitos)
- [Como executar](#como-executar)
- [Fluxo de uso](#fluxo-de-uso)
- [Rotas da API](#rotas-da-api)
- [Workspace e projetos](#workspace-e-projetos)
- [Configuracoes de modelo](#configuracoes-de-modelo)
- [Plugin de aprovacao](#plugin-de-aprovacao)
- [Template base](#template-base)
- [Scripts disponiveis](#scripts-disponiveis)
- [Variaveis de ambiente](#variaveis-de-ambiente)
- [Desenvolvimento](#desenvolvimento)
- [Troubleshooting](#troubleshooting)

## Visao geral

O AI App Builder possui tres superficies principais:

1. Interface do builder, servida em `http://localhost:3000`.
2. Preview da aplicacao gerada, servido em `http://localhost:5173`.
3. Backend/API, tambem em `http://localhost:3000`, sob o prefixo `/api`.

A interface do builder tem tres areas principais:

- Chat: entrada de prompts e respostas do motor.
- Preview: iframe apontando para o app React ativo.
- Code/Files: visualizacao dos arquivos do workspace e leitura do codigo gerado.

O backend mantem o estado dos projetos, lista e le arquivos do workspace, salva alteracoes, encaminha prompts ao Opencode e guarda configuracoes locais de modelo/API key.

## Principais recursos

- Chat para pedir criacao ou alteracao de apps React.
- Preview ao vivo do app ativo em Vite.
- Gerenciamento de multiplos projetos dentro do mesmo workspace.
- Renomeacao de projeto via prompt sem alterar arquivos do app.
- Explorador de arquivos do projeto ativo.
- Visualizador de codigo com Monaco Editor em modo leitura.
- Configuracao local de modelo e chave de API.
- Template inicial React + Vite + Tailwind.
- Integracao com Opencode CLI para aplicar alteracoes no workspace.
- Plugin de aprovacao para planos, escrita de arquivos e comandos sensiveis.
- Execucao por Docker Compose ou por script local.

## Arquitetura

```text
Usuario
  |
  v
Web UI React
  |  /api/*
  v
Backend Hono
  |                         +-------------------------+
  | lista/le/salva arquivos | .builder/projects.json |
  |                         | projects/<id>/         |
  v                         +-------------------------+
Workspace ativo
  |
  | prompt contextualizado
  v
Opencode CLI
  |
  | modifica arquivos do app React
  v
Vite Preview
```

### Frontend do builder

Local: `web/`

Tecnologias:

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Zustand
- Monaco Editor
- react-resizable-panels
- lucide-react

Responsabilidades:

- Inicializar sessao com o backend.
- Carregar configuracoes e lista de projetos.
- Enviar mensagens para `/api/chat`.
- Exibir arquivos retornados por `/api/files`.
- Renderizar o preview do app ativo.
- Alternar entre `Preview`, `Code` e `Files`.
- Abrir painel de configuracoes de modelo/API key.

### Backend

Local: `server/`

Tecnologias:

- Hono
- Node via `@hono/node-server`
- TypeScript
- `tsx` para execucao local

Responsabilidades:

- Servir as rotas `/api/*`.
- Servir arquivos estaticos do build do frontend.
- Inicializar e persistir projetos.
- Isolar a area editavel em `WORKSPACE_DIR`.
- Enviar prompts ao Opencode.
- Listar, ler e escrever arquivos do workspace.
- Salvar configuracoes locais em `~/.config/ai-app-builder/settings.json`.
- Expor health check do motor.

### Workspace

Local padrao:

- Docker: `/workspace`
- Local: `.workspace/`

O workspace contem o app React que esta sendo criado/editado. Ele e populado a partir de `templates/react-shadcn` quando ainda nao existe um projeto.

### Opencode

O backend executa o Opencode CLI com:

```bash
opencode run "<prompt>" --format json --dangerously-skip-permissions
```

Antes de enviar o prompt, o backend adiciona contexto explicito para orientar o motor a editar o app React ativo em `/workspace`, preservar arquivos internos do builder e responder brevemente com os arquivos alterados.

## Estrutura do repositorio

```text
.
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
|       |   |-- approve.ts
|       |   |-- chat.ts
|       |   |-- files.ts
|       |   |-- health.ts
|       |   |-- projects.ts
|       |   |-- session.ts
|       |   `-- settings.ts
|       |-- services/
|       |   |-- opencode-client.ts
|       |   |-- preview.ts
|       |   |-- projects.ts
|       |   `-- workspace.ts
|       `-- lib/
|           |-- sse.ts
|           `-- static.ts
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

## Requisitos

Para execucao local:

- Node.js 20 ou superior recomendado.
- npm.
- Opencode CLI instalado e acessivel em algum destes caminhos:
  - `/usr/local/bin/opencode`
  - `/home/node/.bun/bin/opencode`
  - `$HOME/.bun/bin/opencode`
  - `/usr/bin/opencode`
  - `/opt/homebrew/bin/opencode`

Para execucao via Docker:

- Docker.
- Docker Compose.

## Como executar

### Opcao 1: modo local

O script `start-local.sh` prepara o workspace, instala dependencias, compila o frontend do builder e sobe os servicos necessarios.

```bash
./start-local.sh
```

Ao final, ele exibe:

```text
API + Frontend: http://localhost:3000
Preview (app):  http://localhost:5173
```

O script tambem:

- mata processos antigos nas portas `3000` e `5173`;
- cria `.workspace/` se necessario;
- copia o template inicial para `.workspace/`;
- instala dependencias do workspace;
- instala dependencias do backend;
- compila `web/`;
- sobe o Vite do app gerado;
- sobe o backend Hono.

### Opcao 2: Docker Compose

Primeiro gere o build do frontend do builder, porque o `docker-compose.yml` monta `./web/dist` dentro do container:

```bash
cd web
npm install
npm run build
cd ..
```

Depois suba o ambiente:

```bash
npm run dev
```

Servicos expostos:

- `http://localhost:3000`: builder + API.
- `http://localhost:5173`: preview do app React ativo.
- `http://localhost:4096`: UI/servico do Opencode.

Para parar:

```bash
npm run stop
```

Para rebuildar a imagem:

```bash
npm run rebuild
```

Para resetar volumes:

```bash
npm run reset
```

## Fluxo de uso

1. Abra `http://localhost:3000`.
2. Digite no chat o app ou alteracao desejada.
3. O frontend envia a mensagem para `POST /api/chat`.
4. O backend inicializa o projeto ativo se necessario.
5. O backend monta um prompt com contexto do workspace e arquivos principais.
6. O Opencode executa no workspace ativo.
7. Os arquivos sao alterados no app React.
8. O backend salva o estado do projeto ativo.
9. A lista de arquivos e atualizada na interface.
10. O preview em `http://localhost:5173` reflete as alteracoes.

Exemplos de prompts:

```text
Crie uma landing page para uma academia com plano mensal, depoimentos e CTA.
```

```text
Troque o grafico principal por um dashboard de vendas usando Recharts.
```

```text
Altere o nome do projeto para Dashboard Financeiro.
```

Quando o pedido for identificado como renomeacao de projeto, o backend altera apenas o titulo salvo no builder e retorna:

```text
Titulo do projeto alterado para "...". Nenhum arquivo do app foi modificado.
```

## Rotas da API

Todas as rotas ficam sob `/api`.

### Chat

`POST /api/chat`

Envia uma mensagem ao motor de IA.

Body:

```json
{
  "message": "Crie uma tela de dashboard",
  "sessionId": "session_..."
}
```

Resposta esperada:

```json
{
  "response": "Resumo do que foi alterado",
  "files": []
}
```

Tambem pode retornar `projects` e `activeProjectId` quando a mensagem renomeia o projeto.

`GET /api/chat/debug`

Endpoint de diagnostico para verificar ambiente, binario do Opencode e execucao basica.

### Sessao

`POST /api/session/init`

Cria uma sessao simples para o frontend ou plugin.

Body:

```json
{
  "plugin": "approval-plugin"
}
```

Resposta:

```json
{
  "sessionId": "session_...",
  "plugin": "approval-plugin"
}
```

`POST /api/session/reset`

Retorna `{ "status": "ok" }`.

### Arquivos

`GET /api/files`

Lista os arquivos do workspace ativo.

Parametros opcionais:

- `dir`: subdiretorio relativo.

`GET /api/files/file?path=src/App.tsx`

Le um arquivo do workspace ativo.

`POST /api/files/file`

Escreve um arquivo no workspace ativo e salva o projeto atual.

Body:

```json
{
  "path": "src/App.tsx",
  "content": "..."
}
```

### Projetos

`GET /api/projects`

Lista projetos e informa o projeto ativo.

`POST /api/projects`

Cria um novo projeto a partir do template.

Body:

```json
{
  "name": "Meu App"
}
```

`POST /api/projects/:id/select`

Seleciona um projeto existente, salva o projeto anterior e copia o projeto escolhido para o workspace ativo.

### Configuracoes

`GET /api/settings`

Retorna configuracoes locais.

`PUT /api/settings`

Atualiza configuracoes.

Body:

```json
{
  "model": "opencode/deepseek-v4-flash-free",
  "provider": "openai",
  "apiKey": "..."
}
```

`GET /api/settings/models`

Retorna a lista de modelos disponiveis no painel.

### Health

`GET /api/health`

Retorna status da API e disponibilidade do motor.

Exemplo:

```json
{
  "status": "ok",
  "timestamp": "2026-05-21T00:00:00.000Z",
  "engine": {
    "status": "available"
  }
}
```

### Aprovacoes

`POST /api/approve`

Cria uma solicitacao de aprovacao.

`POST /api/approve/respond`

Responde uma solicitacao.

`GET /api/approve/pending?sessionId=...`

Lista aprovacoes pendentes por sessao.

`GET /api/approve/:requestId`

Consulta uma aprovacao especifica.

## Workspace e projetos

O `ProjectManager` controla multiplos projetos dentro do workspace.

Estrutura interna:

```text
WORKSPACE_DIR/
|-- .builder/
|   `-- projects.json
|-- projects/
|   |-- default/
|   `-- meu-projeto/
|-- src/
|-- package.json
`-- ...
```

Entradas reservadas:

- `.builder`
- `projects`
- `node_modules`

Essas entradas nao sao copiadas para dentro dos snapshots de projeto.

### Inicializacao

Na primeira execucao:

- se `WORKSPACE_DIR` ja tiver `package.json`, o conteudo atual vira o projeto `default`;
- se nao tiver, o template `templates/react-shadcn` e copiado para o projeto `default` e para o workspace ativo.

### Criacao de projeto

Ao criar um projeto:

1. O projeto atual e salvo.
2. Um novo diretorio e criado em `projects/<slug>`.
3. O template base e copiado para esse diretorio.
4. O workspace ativo e limpo, preservando entradas reservadas.
5. O novo projeto e copiado para o workspace ativo.

### Selecao de projeto

Ao trocar de projeto:

1. O projeto atual e salvo.
2. O `activeProjectId` muda.
3. O workspace ativo e limpo.
4. O projeto selecionado e copiado para o workspace ativo.

## Configuracoes de modelo

O painel de configuracoes permite selecionar modelo e salvar uma API key local.

Configuracao padrao:

```json
{
  "model": "opencode/deepseek-v4-flash-free",
  "provider": "",
  "apiKey": ""
}
```

Modelos listados atualmente:

- `opencode/deepseek-v4-flash-free`
- `opencode/nemotron-3-super-free`
- `opencode/qwen3.6-plus-free`

Arquivo local:

```text
~/.config/ai-app-builder/settings.json
```

Quando `provider` e `apiKey` estao preenchidos, o backend define a variavel de ambiente no formato:

```text
OPENCODE_<PROVIDER>_API_KEY
```

Exemplo:

```text
OPENCODE_OPENAI_API_KEY
```

## Plugin de aprovacao

Local: `plugins/approval-plugin/`

O plugin expoe ferramentas para o Opencode:

- `propose_plan`: propoe um plano de arquivos e comandos.
- `propose_file`: propoe conteudo de arquivo antes de escrever.
- `guarded_command`: aprova ou bloqueia comandos sensiveis.

O bridge do plugin conversa com o backend por HTTP:

```text
approval-plugin -> /api/session/init
approval-plugin -> /api/approve
approval-plugin -> /api/approve/pending
```

Comandos bloqueados diretamente:

- `rm -rf`
- `sudo`
- `chmod 777`
- `> /dev/sda`

Comandos que pedem aprovacao:

- comandos contendo `rm`;
- comandos contendo `install`;
- comandos contendo `delete`;
- comandos contendo `drop`.

No Docker, o `entrypoint.sh` cria um symlink do plugin em:

```text
$HOME/.opencode/plugins/approval-plugin
```

## Template base

Local: `templates/react-shadcn/`

Apesar do nome, o template atual e um app React/Vite/Tailwind simples, com:

- React 18
- Vite
- TypeScript
- Tailwind CSS
- lucide-react
- clsx
- tailwind-merge
- class-variance-authority

App inicial:

```tsx
function App() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">Hello, AI App Builder!</h1>
    </div>
  )
}

export default App
```

Esse template e copiado para novos projetos e para o workspace inicial.

## Scripts disponiveis

### Raiz

```bash
npm run dev
```

Sobe Docker Compose em background e acompanha logs.

```bash
npm run stop
```

Para os containers.

```bash
npm run rebuild
```

Reconstroi a imagem sem cache e sobe os containers.

```bash
npm run logs
```

Acompanha logs do Docker Compose.

```bash
npm run reset
```

Remove volumes e sobe tudo novamente.

### Backend

```bash
cd server
npm run dev
```

Executa `bun run --hot src/index.ts`.

```bash
cd server
npm run start
```

Executa `tsx src/index.ts`.

### Frontend do builder

```bash
cd web
npm run dev
```

Sobe o Vite do builder em modo desenvolvimento. A porta configurada e `5174`, com proxy de `/api` para `http://localhost:3000`.

```bash
cd web
npm run build
```

Compila TypeScript e gera `web/dist`.

```bash
cd web
npm run preview
```

Serve o build do frontend.

### Template

```bash
cd templates/react-shadcn
npm run dev
```

Sobe o app template em Vite.

## Variaveis de ambiente

Arquivo de exemplo: `.env.example`

```env
OPENCODE_SERVER_PASSWORD=dev
WORKSPACE_DIR=/workspace
```

Variaveis usadas pelo projeto:

| Variavel | Padrao | Uso |
| --- | --- | --- |
| `WORKSPACE_DIR` | `/workspace` | Diretorio do app React ativo. No script local vira `.workspace`. |
| `STATIC_DIR` | `../web/dist` | Diretorio servido pelo backend para a UI do builder. |
| `PORT` | `3000` | Porta do backend Hono. |
| `TEMPLATE_DIR` | `/templates/react-shadcn` | Template usado para inicializar/criar projetos. |
| `SETTINGS_DIR` | `$HOME/.config/ai-app-builder` | Diretorio do `settings.json`. |
| `PREVIEW_URL` | `http://localhost:5173` | URL usada pelo servico de preview. |
| `OPENCODE_TIMEOUT_MS` | `120000` | Timeout para execucoes do Opencode. |
| `OPENCODE_SERVER_PASSWORD` | vazio | Senha usada na integracao com `opencode serve`. |

## Desenvolvimento

### Rodando partes separadas

Para trabalhar no frontend do builder:

```bash
cd web
npm install
npm run dev
```

O Vite do builder roda em `http://localhost:5174` e faz proxy para o backend em `http://localhost:3000`.

Para trabalhar no backend:

```bash
cd server
npm install
WORKSPACE_DIR=../.workspace STATIC_DIR=../web/dist npm run start
```

Para preparar o workspace manualmente:

```bash
mkdir -p .workspace
cp -R templates/react-shadcn/* .workspace/
cd .workspace
npm install
npx vite --host 0.0.0.0 --port 5173
```

### Build do frontend

Sempre que o backend precisar servir a interface do builder a partir de `web/dist`, rode:

```bash
cd web
npm install
npm run build
```

### CORS

O backend aceita chamadas `/api/*` destas origens:

- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:3000`

### Arquivos estaticos

O backend usa `server/src/lib/static.ts` para servir o build do frontend. Para rotas nao encontradas, ele tenta servir `index.html`, permitindo comportamento de SPA.

## Troubleshooting

### `Engine OK` nao aparece

Verifique se o Opencode CLI esta instalado e executavel:

```bash
which opencode
opencode --version
```

Tambem consulte:

```bash
curl http://localhost:3000/api/health
```

### O builder abre, mas a tela esta vazia no Docker

Gere o build do frontend antes de subir o Compose:

```bash
cd web
npm install
npm run build
cd ..
npm run dev
```

O Compose monta `./web/dist` em `/app/web/dist`.

### O preview nao atualiza

Verifique se o Vite do workspace esta rodando em `5173`:

```bash
curl http://localhost:5173
```

No modo local, o `start-local.sh` inicia esse servidor automaticamente.

### Porta em uso

O `start-local.sh` tenta matar processos antigos nas portas `3000` e `5173`. Se estiver rodando manualmente, encerre os processos ou altere as portas.

### Dependencias do workspace nao existem

Instale dependencias dentro do workspace ativo:

```bash
cd .workspace
npm install
```

No Docker, o `entrypoint.sh` tenta rodar `npm install` em `/workspace` quando existe `package.json`.

### Opencode demora ou encerra por timeout

O timeout padrao e `120000` ms. Ajuste se necessario:

```bash
OPENCODE_TIMEOUT_MS=300000 ./start-local.sh
```

### Resetar projetos no modo local

Os projetos ficam em `.workspace/.builder` e `.workspace/projects`. Para recomecar do zero no modo local, pare os servicos e remova `.workspace`.

```bash
rm -rf .workspace
./start-local.sh
```

Use esse reset com cuidado, pois ele remove os projetos locais gerados.

## Observacoes importantes

- O editor de codigo do builder e somente leitura na interface atual.
- A escrita de arquivos acontece pelo backend ou pelo Opencode no workspace.
- `node_modules`, `.builder` e `projects` sao ocultados da listagem de arquivos.
- O prompt enviado ao Opencode instrui o motor a nao alterar `.builder`, `projects` ou `node_modules`.
- O projeto ainda nao possui suite de testes automatizados configurada nos manifests atuais.
