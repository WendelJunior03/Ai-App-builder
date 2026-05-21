import { Hono } from "hono"
import { execSync } from "node:child_process"
import { workspaceManager } from "../services/workspace"
import { OpencodeClient } from "../services/opencode-client"
import { projectManager } from "../services/projects"
import fs from "node:fs"

const chatRoute = new Hono()
const opencode = new OpencodeClient()

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
    .filter((path) => /^src\/.*\.(tsx|jsx|ts|js|css)$/.test(path) || path === "package.json")
    .sort((a, b) => {
      const priority = (path: string) => {
        if (path === "src/App.tsx") return 0
        if (path.startsWith("src/components/")) return 1
        if (path === "src/index.css") return 2
        return 3
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
    const currentFiles = await workspaceManager.listFiles()

    await new Promise<void>((resolve, reject) => {
      opencode.sendMessage(addProjectContext(message, currentFiles), {
        onChunk: (text) => responses.push(text),
        onDone: () => resolve(),
        onError: (err) => reject(err),
      }).catch(reject)
    })

    await projectManager.saveActiveProject()
    const files = await workspaceManager.listFiles()
    const response = responses.join("").trim()
    return c.json({
      response: response || "O motor finalizou, mas nao retornou texto. Verifique os arquivos atualizados no painel ao lado ou tente enviar a instrucao novamente com mais contexto.",
      files,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg }, 500)
  }
})

export { chatRoute }
