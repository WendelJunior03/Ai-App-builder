import { existsSync } from "node:fs"
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || "/workspace"
const TEMPLATE_DIR = process.env.TEMPLATE_DIR || "/templates/react-shadcn"
const CONFIG_DIR = join(WORKSPACE_DIR, ".builder")
const CONFIG_FILE = join(CONFIG_DIR, "projects.json")
const PROJECTS_DIR = join(WORKSPACE_DIR, "projects")
const RESERVED_ROOT_ENTRIES = new Set([".builder", "projects", "node_modules"])
const MAX_TOKEN_USAGE_REQUESTS = 50
const FALLBACK_MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  "opencode/deepseek-v4-flash-free": 200_000,
  "opencode/nemotron-3-super-free": 204_800,
  "opencode/qwen3.6-plus-free": 262_144,
}

export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  tokenUsage?: ProjectTokenUsage
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  totalTokens: number
  contextWindow?: number
  remainingTokens?: number
  costUsd?: number
}

export interface ProjectTokenUsageRequest extends TokenUsage {
  id: string
  message: string
  model: string
  createdAt: number
}

export interface ProjectTokenUsage {
  totalInputTokens: number
  totalOutputTokens: number
  totalReasoningTokens: number
  totalCacheReadTokens: number
  totalCacheWriteTokens: number
  totalTokens: number
  totalCostUsd: number
  requestCount: number
  lastRequest: ProjectTokenUsageRequest | null
  recentRequests: ProjectTokenUsageRequest[]
}

interface ProjectsConfig {
  activeProjectId: string | null
  projects: Project[]
}

function emptyTokenUsage(): ProjectTokenUsage {
  return {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalReasoningTokens: 0,
    totalCacheReadTokens: 0,
    totalCacheWriteTokens: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    requestCount: 0,
    lastRequest: null,
    recentRequests: [],
  }
}

function normalizeTokenUsage(usage?: Partial<ProjectTokenUsage>): ProjectTokenUsage {
  const empty = emptyTokenUsage()
  if (!usage) return empty
  const recentRequests = Array.isArray(usage.recentRequests)
    ? usage.recentRequests.map((request) => {
        const contextWindow = request.contextWindow ?? FALLBACK_MODEL_CONTEXT_WINDOWS[request.model]
        return {
          ...request,
          contextWindow,
          remainingTokens: request.remainingTokens ?? (
            contextWindow !== undefined ? Math.max(contextWindow - request.totalTokens, 0) : undefined
          ),
        }
      })
    : empty.recentRequests
  const lastRequest = usage.lastRequest
    ? recentRequests.find((request) => request.id === usage.lastRequest?.id) || usage.lastRequest
    : empty.lastRequest
  return {
    totalInputTokens: usage.totalInputTokens ?? empty.totalInputTokens,
    totalOutputTokens: usage.totalOutputTokens ?? empty.totalOutputTokens,
    totalReasoningTokens: usage.totalReasoningTokens ?? empty.totalReasoningTokens,
    totalCacheReadTokens: usage.totalCacheReadTokens ?? empty.totalCacheReadTokens,
    totalCacheWriteTokens: usage.totalCacheWriteTokens ?? empty.totalCacheWriteTokens,
    totalTokens: usage.totalTokens ?? empty.totalTokens,
    totalCostUsd: usage.totalCostUsd ?? empty.totalCostUsd,
    requestCount: usage.requestCount ?? empty.requestCount,
    lastRequest,
    recentRequests,
  }
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || `project-${Date.now()}`
}

async function copyContents(source: string, target: string, skipReservedRoot = false): Promise<void> {
  await mkdir(target, { recursive: true })
  const entries = await readdir(source, { withFileTypes: true })

  for (const entry of entries) {
    if (skipReservedRoot && RESERVED_ROOT_ENTRIES.has(entry.name)) continue
    const sourcePath = join(source, entry.name)
    const targetPath = join(target, entry.name)
    await cp(sourcePath, targetPath, { recursive: true, force: true, dereference: true })
  }
}

async function clearActiveWorkspace(): Promise<void> {
  await mkdir(WORKSPACE_DIR, { recursive: true })
  const entries = await readdir(WORKSPACE_DIR, { withFileTypes: true })

  for (const entry of entries) {
    if (RESERVED_ROOT_ENTRIES.has(entry.name)) continue
    await rm(join(WORKSPACE_DIR, entry.name), { recursive: true, force: true })
  }
}

async function directoryHasPackageJson(dir: string): Promise<boolean> {
  try {
    const s = await stat(join(dir, "package.json"))
    return s.isFile()
  } catch {
    return false
  }
}

export class ProjectManager {
  private initialized = false

  get workspaceDir(): string {
    return WORKSPACE_DIR
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    await mkdir(CONFIG_DIR, { recursive: true })
    await mkdir(PROJECTS_DIR, { recursive: true })

    const config = await this.loadConfig()
    if (config.projects.length === 0) {
      const now = Date.now()
      const firstProject: Project = {
        id: "default",
        name: "Projeto Atual",
        createdAt: now,
        updatedAt: now,
        tokenUsage: emptyTokenUsage(),
      }

      const firstProjectDir = this.getProjectDir(firstProject.id)
      if (await directoryHasPackageJson(WORKSPACE_DIR)) {
        await copyContents(WORKSPACE_DIR, firstProjectDir, true)
      } else {
        await copyContents(TEMPLATE_DIR, firstProjectDir)
        await clearActiveWorkspace()
        await copyContents(firstProjectDir, WORKSPACE_DIR)
      }

      await this.saveConfig({
        activeProjectId: firstProject.id,
        projects: [firstProject],
      })
    } else if (config.activeProjectId) {
      const activeDir = this.getProjectDir(config.activeProjectId)
      if (!(await directoryHasPackageJson(WORKSPACE_DIR)) && existsSync(activeDir)) {
        await copyContents(activeDir, WORKSPACE_DIR)
      }
    }

    this.initialized = true
  }

  async listProjects(): Promise<ProjectsConfig> {
    await this.ensureInitialized()
    return this.loadConfig()
  }

  async createProject(name: string): Promise<ProjectsConfig> {
    await this.ensureInitialized()
    const config = await this.loadConfig()
    const baseId = slugify(name)
    let id = baseId
    let suffix = 2

    while (config.projects.some((project) => project.id === id) || existsSync(this.getProjectDir(id))) {
      id = `${baseId}-${suffix++}`
    }

    const now = Date.now()
    const project: Project = {
      id,
      name: name.trim() || id,
      createdAt: now,
      updatedAt: now,
      tokenUsage: emptyTokenUsage(),
    }

    await this.saveActiveProject(config)
    await copyContents(TEMPLATE_DIR, this.getProjectDir(id))
    config.projects.push(project)
    config.activeProjectId = id
    await clearActiveWorkspace()
    await copyContents(this.getProjectDir(id), WORKSPACE_DIR)
    await this.saveConfig(config)
    return config
  }

  async selectProject(id: string): Promise<ProjectsConfig> {
    await this.ensureInitialized()
    const config = await this.loadConfig()
    if (!config.projects.some((project) => project.id === id)) {
      throw new Error("Project not found")
    }

    await this.saveActiveProject(config)
    config.activeProjectId = id
    await clearActiveWorkspace()
    await copyContents(this.getProjectDir(id), WORKSPACE_DIR)
    await this.saveConfig(config)
    return config
  }

  async renameActiveProject(name: string): Promise<ProjectsConfig> {
    await this.ensureInitialized()
    const config = await this.loadConfig()
    const activeProjectId = config.activeProjectId
    if (!activeProjectId) {
      throw new Error("No active project")
    }

    const project = config.projects.find((item) => item.id === activeProjectId)
    if (!project) {
      throw new Error("Project not found")
    }

    project.name = name.trim()
    project.updatedAt = Date.now()
    await this.saveConfig(config)
    return config
  }

  async saveActiveProject(config?: ProjectsConfig): Promise<void> {
    await this.ensureInitialized()
    const current = config || await this.loadConfig()
    const activeProjectId = current.activeProjectId
    if (!activeProjectId) return

    const project = current.projects.find((item) => item.id === activeProjectId)
    if (project) project.updatedAt = Date.now()

    const projectDir = this.getProjectDir(activeProjectId)
    await rm(projectDir, { recursive: true, force: true })
    await copyContents(WORKSPACE_DIR, projectDir, true)
    await this.saveConfig(current)
  }

  async recordTokenUsage(message: string, model: string, usage: TokenUsage): Promise<ProjectsConfig> {
    await this.ensureInitialized()
    const config = await this.loadConfig()
    const activeProjectId = config.activeProjectId
    if (!activeProjectId) return config

    const project = config.projects.find((item) => item.id === activeProjectId)
    if (!project) return config

    const current = normalizeTokenUsage(project.tokenUsage)
    const request: ProjectTokenUsageRequest = {
      id: `usage_${Date.now()}`,
      message,
      model,
      createdAt: Date.now(),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      reasoningTokens: usage.reasoningTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      totalTokens: usage.totalTokens,
      contextWindow: usage.contextWindow,
      remainingTokens: usage.remainingTokens,
      costUsd: usage.costUsd,
    }

    project.tokenUsage = {
      totalInputTokens: current.totalInputTokens + usage.inputTokens,
      totalOutputTokens: current.totalOutputTokens + usage.outputTokens,
      totalReasoningTokens: current.totalReasoningTokens + usage.reasoningTokens,
      totalCacheReadTokens: current.totalCacheReadTokens + usage.cacheReadTokens,
      totalCacheWriteTokens: current.totalCacheWriteTokens + usage.cacheWriteTokens,
      totalTokens: current.totalTokens + usage.totalTokens,
      totalCostUsd: current.totalCostUsd + (usage.costUsd || 0),
      requestCount: current.requestCount + 1,
      lastRequest: request,
      recentRequests: [request, ...current.recentRequests].slice(0, MAX_TOKEN_USAGE_REQUESTS),
    }
    project.updatedAt = Date.now()

    await this.saveConfig(config)
    return config
  }

  private getProjectDir(id: string): string {
    return join(PROJECTS_DIR, id)
  }

  private async loadConfig(): Promise<ProjectsConfig> {
    try {
      const data = JSON.parse(await readFile(CONFIG_FILE, "utf-8")) as ProjectsConfig
      return {
        activeProjectId: data.activeProjectId ?? null,
        projects: Array.isArray(data.projects)
          ? data.projects.map((project) => ({
              ...project,
              tokenUsage: normalizeTokenUsage(project.tokenUsage),
            }))
          : [],
      }
    } catch {
      return { activeProjectId: null, projects: [] }
    }
  }

  private async saveConfig(config: ProjectsConfig): Promise<void> {
    await mkdir(CONFIG_DIR, { recursive: true })
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8")
  }
}

export const projectManager = new ProjectManager()
