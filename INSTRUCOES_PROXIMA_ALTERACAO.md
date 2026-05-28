# Instrucoes para a proxima alteracao: template com arquitetura limpa

Objetivo: alterar o AI App Builder para que novos apps sejam criados com uma estrutura mais organizada, separando telas, features, componentes, servicos, hooks, tipos e camadas de dominio/aplicacao/infraestrutura. Hoje o template incentiva o motor a concentrar quase tudo em `src/App.tsx`.

## Problema atual

O template atual nasce muito simples:

```text
src/
|-- App.tsx
|-- main.tsx
|-- index.css
`-- lib/
```

Como `src/App.tsx` e o ponto mais evidente, o Opencode tende a criar telas, componentes, dados mockados, graficos, handlers e layout dentro desse unico arquivo.

## Resultado esperado

Quando um novo app for criado, ele deve nascer com uma estrutura base parecida com:

```text
src/
|-- app/
|   |-- App.tsx
|   |-- providers.tsx
|   `-- routes.tsx
|-- pages/
|   `-- HomePage.tsx
|-- features/
|   `-- example/
|       |-- ExampleView.tsx
|       |-- components/
|       |-- hooks/
|       |-- services/
|       |-- types.ts
|       `-- index.ts
|-- components/
|   |-- layout/
|   `-- ui/
|-- domain/
|   |-- entities/
|   `-- value-objects/
|-- application/
|   `-- use-cases/
|-- infrastructure/
|   |-- api/
|   `-- repositories/
|-- shared/
|   |-- constants/
|   |-- lib/
|   `-- types/
|-- main.tsx
`-- index.css
```

## Arquivos do builder que devem ser alterados

### 1. Template base

Alterar:

```text
templates/react-shadcn/src/
```

Criar a nova estrutura de pastas dentro do template. O template e a origem de todo projeto novo, entao essa e a mudanca principal.

O `src/main.tsx` deve importar o app de `src/app/App.tsx`.

Exemplo:

```tsx
import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "./app/App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 2. App principal

Criar:

```text
templates/react-shadcn/src/app/App.tsx
```

Regra: esse arquivo deve ficar pequeno. Ele deve apenas montar providers, rotas e layout geral.

Exemplo:

```tsx
import { HomePage } from "../pages/HomePage"

export function App() {
  return <HomePage />
}
```

### 3. Pagina inicial

Criar:

```text
templates/react-shadcn/src/pages/HomePage.tsx
```

Regra: paginas organizam a tela e chamam features. Elas nao devem concentrar componentes internos complexos.

Exemplo:

```tsx
import { ExampleView } from "../features/example"

export function HomePage() {
  return <ExampleView />
}
```

### 4. Feature inicial

Criar:

```text
templates/react-shadcn/src/features/example/
```

Estrutura sugerida:

```text
features/example/
|-- ExampleView.tsx
|-- components/
|   `-- ExampleCard.tsx
|-- hooks/
|   `-- useExampleData.ts
|-- services/
|   `-- example-service.ts
|-- types.ts
`-- index.ts
```

Regra: cada funcionalidade nova deve ganhar sua propria pasta em `src/features/<nome-da-feature>`.

### 5. Guia interno do template

Criar:

```text
templates/react-shadcn/src/ARCHITECTURE.md
```

Esse arquivo deve explicar para o motor como evoluir o app. Ele deve ser curto e direto, porque pode ser usado como contexto pelo Opencode.

Conteudo sugerido:

```md
# App Architecture

Do not put all implementation in `src/app/App.tsx`.

- Use `src/app` only for app composition, providers and routes.
- Use `src/pages` for route-level pages.
- Use `src/features/<feature-name>` for business features.
- Use `src/features/<feature-name>/components` for feature-specific UI.
- Use `src/features/<feature-name>/hooks` for feature-specific hooks.
- Use `src/features/<feature-name>/services` for feature-specific data logic.
- Use `src/components/ui` for reusable primitive UI.
- Use `src/components/layout` for layout components.
- Use `src/domain` for business entities and rules.
- Use `src/application` for use cases.
- Use `src/infrastructure` for API clients, repositories, mocks and external integrations.
- Use `src/shared` for generic utilities, constants and shared types.

When adding a new screen or feature, create new files in the proper folders.
Keep `App.tsx` small.
```

## Prompt do backend que deve ser atualizado

Alterar:

```text
server/src/routes/chat.ts
```

Funcao:

```ts
addProjectContext(...)
```

Adicionar instrucoes explicitas para o Opencode seguir a arquitetura do template.

Texto sugerido para incluir no prompt:

```text
Arquitetura obrigatoria do app:
- Nao concentre a implementacao em src/App.tsx nem em src/app/App.tsx.
- Use src/app apenas para composicao geral, providers e rotas.
- Crie paginas em src/pages.
- Crie funcionalidades em src/features/<feature-name>.
- Componentes especificos de uma feature devem ficar em src/features/<feature-name>/components.
- Hooks especificos devem ficar em src/features/<feature-name>/hooks.
- Servicos, mocks ou logica de dados da feature devem ficar em src/features/<feature-name>/services.
- Componentes reutilizaveis devem ficar em src/components/ui ou src/components/layout.
- Tipos compartilhados devem ficar em src/shared/types.
- Regras de negocio devem ficar em src/domain ou src/application quando fizer sentido.
- Integracoes externas, APIs, repositories e mocks globais devem ficar em src/infrastructure.
- Ao criar uma nova tela ou funcionalidade, crie arquivos novos na pasta correta em vez de colocar tudo em um unico arquivo.
```

Tambem e recomendado incluir `src/ARCHITECTURE.md` na lista de arquivos importantes enviada ao motor, quando existir.

## Mudanca esperada no fluxo

Depois da alteracao, quando o usuario pedir:

```text
Crie um dashboard financeiro
```

O resultado deve tender a ser:

```text
src/features/finance/
|-- FinanceDashboard.tsx
|-- components/
|   |-- BalanceCards.tsx
|   |-- ExpensesChart.tsx
|   `-- TransactionsTable.tsx
|-- hooks/
|   `-- useFinanceDashboard.ts
|-- services/
|   `-- finance-service.ts
|-- types.ts
`-- index.ts
```

E nao:

```text
src/App.tsx
```

com toda a implementacao dentro dele.

## Checklist da proxima implementacao

- [ ] Reestruturar `templates/react-shadcn/src`.
- [ ] Mover o app principal para `templates/react-shadcn/src/app/App.tsx`.
- [ ] Atualizar `templates/react-shadcn/src/main.tsx`.
- [ ] Criar `templates/react-shadcn/src/pages/HomePage.tsx`.
- [ ] Criar uma feature inicial em `templates/react-shadcn/src/features/example`.
- [ ] Criar pastas `components`, `domain`, `application`, `infrastructure` e `shared`.
- [ ] Criar `templates/react-shadcn/src/ARCHITECTURE.md`.
- [ ] Atualizar `server/src/routes/chat.ts` para orientar o Opencode a seguir a arquitetura.
- [ ] Testar criando um novo projeto pelo builder.
- [ ] Verificar se o novo projeto nasce com a estrutura correta.
- [ ] Enviar um prompt de criacao de tela e confirmar que os arquivos sao criados nas pastas corretas.

