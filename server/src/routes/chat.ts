import { Hono } from "hono"
import { execSync } from "node:child_process"
import { workspaceManager } from "../services/workspace"
import { OpencodeClient, type TokenUsage } from "../services/opencode-client"
import { projectManager } from "../services/projects"
import { getModelContextWindow, loadSettings } from "./settings"
import fs from "node:fs"

const chatRoute = new Hono()
const opencode = new OpencodeClient()

function addUsage(total: TokenUsage | null, next: TokenUsage): TokenUsage {
  const inputTokens = (total?.inputTokens || 0) + next.inputTokens
  const outputTokens = (total?.outputTokens || 0) + next.outputTokens
  const reasoningTokens = (total?.reasoningTokens || 0) + next.reasoningTokens
  const cacheReadTokens = (total?.cacheReadTokens || 0) + next.cacheReadTokens
  const cacheWriteTokens = (total?.cacheWriteTokens || 0) + next.cacheWriteTokens
  const totalTokens = inputTokens + outputTokens + reasoningTokens + cacheReadTokens + cacheWriteTokens
  const contextWindow = next.contextWindow ?? total?.contextWindow
  const remainingTokens = next.remainingTokens ?? (
    contextWindow !== undefined ? Math.max(contextWindow - totalTokens, 0) : total?.remainingTokens
  )

  return {
    inputTokens,
    outputTokens,
    reasoningTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens,
    contextWindow,
    remainingTokens,
    costUsd: (total?.costUsd || 0) + (next.costUsd || 0),
  }
}

async function applyModelContextWindow(usage: TokenUsage | null): Promise<TokenUsage | null> {
  if (!usage || usage.contextWindow !== undefined) return usage

  const settings = loadSettings()
  const contextWindow = await getModelContextWindow(settings.model)
  if (!contextWindow) return usage

  return {
    ...usage,
    contextWindow,
    remainingTokens: Math.max(contextWindow - usage.totalTokens, 0),
  }
}

function getProjectRenameRequest(message: string): string | null {
  const normalized = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  const isProjectRename =
    normalized.includes("projeto") &&
    (
      normalized.includes("nome") ||
      normalized.includes("renome")
    ) &&
    (
      normalized.includes("altere") ||
      normalized.includes("alterar") ||
      normalized.includes("troque") ||
      normalized.includes("trocar") ||
      normalized.includes("mude") ||
      normalized.includes("mudar") ||
      normalized.includes("renomear")
    )

  if (!isProjectRename) return null

  const patterns = [
    /\bpara\s+["']?(.+?)["']?\s*$/i,
    /\bcomo\s+["']?(.+?)["']?\s*$/i,
    /\bser\s+["']?(.+?)["']?\s*$/i,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    const name = match?.[1]?.trim().replace(/^["']|["']$/g, "")
    if (name) return name
  }

  return null
}

function addProjectContext(message: string, files: Array<{ path: string; type: "file" | "dir" }>): string {
  const sourceFiles = files
    .filter((file) => file.type === "file")
    .map((file) => file.path)
    .filter((path) =>
      /^src\/.*\.(tsx|jsx|ts|js|css)$/.test(path) ||
      path === "src/ARCHITECTURE.md" ||
      path === "package.json"
    )
    .sort((a, b) => {
      const priority = (path: string) => {
        if (path === "src/ARCHITECTURE.md") return 0
        if (path === "src/app/App.tsx") return 1
        if (path === "src/app/routes.tsx") return 2
        if (path.startsWith("src/pages/")) return 3
        if (path.startsWith("src/features/")) return 4
        if (path.startsWith("src/components/")) return 5
        if (path === "src/App.tsx") return 6
        if (path === "src/index.css") return 7
        return 8
      }
      return priority(a) - priority(b) || a.localeCompare(b)
    })
    .slice(0, 40)

  return [
    "Voce esta editando o app React ativo em /workspace.",
    "Altere o conteudo do app, nao o nome do projeto no builder.",
    "Leia os arquivos necessarios e aplique a mudanca com edit/write.",
    "Nao pare apenas lendo ou explicando.",
    "Se o pedido citar texto, secao, card, grafico ou botao, encontre esse trecho no codigo e altere somente ele.",
    "Para graficos, use Recharts ja existente e substitua somente o grafico solicitado.",
    "",
    "Arquitetura obrigatoria do app:",
    "- Nao concentre a implementacao em src/App.tsx nem em src/app/App.tsx.",
    "- Use src/app apenas para composicao geral, providers e rotas.",
    "- Crie paginas em src/pages.",
    "- Crie funcionalidades em src/features/<feature-name>.",
    "- Componentes especificos de uma feature devem ficar em src/features/<feature-name>/components.",
    "- Hooks especificos devem ficar em src/features/<feature-name>/hooks.",
    "- Servicos, mocks ou logica de dados da feature devem ficar em src/features/<feature-name>/services.",
    "- Componentes reutilizaveis devem ficar em src/components/ui ou src/components/layout.",
    "- Tipos compartilhados devem ficar em src/shared/types.",
    "- Utilitarios compartilhados devem ficar em src/shared/lib.",
    "- Regras de negocio devem ficar em src/domain ou src/application quando fizer sentido.",
    "- Integracoes externas, APIs, repositories e mocks globais devem ficar em src/infrastructure.",
    "- Arquivos com JSX devem usar extensao .tsx. Nao coloque JSX em arquivos .ts.",
    "- Hooks em src/features/<feature-name>/hooks devem ficar sem JSX; providers/contextos que renderizam JSX devem ser .tsx.",
    "- Antes de importar uma pagina, componente, hook ou servico novo, crie o arquivo correspondente no caminho importado.",
    "- Ao criar uma nova tela ou funcionalidade, crie arquivos novos na pasta correta em vez de colocar tudo em um unico arquivo.",
    "Nao altere .builder, projects ou node_modules.",
    "Responda brevemente os arquivos alterados.",
    "",
    "Arquivos principais do projeto ativo:",
    ...sourceFiles.map((path) => `- ${path}`),
    "",
    `Pedido do usuario: ${message}`,
  ].join("\n")
}

// Debug endpoint
chatRoute.get("/debug", (c) => {
  const info: Record<string, unknown> = {
    cwd: process.cwd(),
    wsDir: process.env.WORKSPACE_DIR || "/workspace",
    path: process.env.PATH,
  }
  try {
    info.binExists = fs.existsSync("/usr/local/bin/opencode")
    info.binReal = fs.realpathSync("/usr/local/bin/opencode")
    info.binStat = fs.statSync("/usr/local/bin/opencode").mode
    info.wsExists = fs.existsSync("/workspace")
  } catch (e) {
    info.fsError = String(e)
  }
  try {
    const r = execSync(
      `/usr/local/bin/opencode run ${JSON.stringify("say hi")} --format json --model opencode/deepseek-v4-flash-free`,
      { cwd: "/workspace", timeout: 15000, env: { ...process.env } }
    )
    info.execResult = r.toString().substring(0, 200)
  } catch (e) {
    info.execError = e instanceof Error ? e.message : String(e)
    if (e instanceof Error && e.stack) info.execStack = e.stack
  }
  return c.json(info)
})

chatRoute.post("/", async (c) => {
  const { message } = await c.req.json()
  if (!message) {
    return c.json({ error: "message is required" }, 400)
  }

  try {
    await projectManager.ensureInitialized()
    const projectName = getProjectRenameRequest(message)
    if (projectName) {
      const projects = await projectManager.renameActiveProject(projectName)
      const files = await workspaceManager.listFiles()
      return c.json({
        response: `Titulo do projeto alterado para "${projectName}". Nenhum arquivo do app foi modificado.`,
        files,
        projects: projects.projects,
        activeProjectId: projects.activeProjectId,
      })
    }

    const responses: string[] = []
    let tokenUsage: TokenUsage | null = null
    const currentFiles = await workspaceManager.listFiles()

    await new Promise<void>((resolve, reject) => {
      opencode.sendMessage(addProjectContext(message, currentFiles), {
        onChunk: (text) => responses.push(text),
        onUsage: (usage) => {
          tokenUsage = addUsage(tokenUsage, usage)
        },
        onDone: () => resolve(),
        onError: (err) => reject(err),
      }).catch(reject)
    })

    await projectManager.saveActiveProject()
    const files = await workspaceManager.listFiles()
    const response = responses.join("").trim()
    const tokenUsageWithContext = await applyModelContextWindow(tokenUsage)
    const projects = tokenUsageWithContext
      ? await projectManager.recordTokenUsage(message, loadSettings().model, tokenUsageWithContext)
      : await projectManager.listProjects()

    return c.json({
      response: response || "O motor finalizou, mas nao retornou texto. Verifique os arquivos atualizados no painel ao lado ou tente enviar a instrucao novamente com mais contexto.",
      files,
      tokenUsage: tokenUsageWithContext,
      projects: projects.projects,
      activeProjectId: projects.activeProjectId,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[chat] request failed", {
      message,
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
    })
    return c.json({ error: msg }, 500)
  }
})

export { chatRoute }
