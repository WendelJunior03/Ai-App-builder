import { Hono } from "hono"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { spawn } from "node:child_process"

const SETTINGS_DIR = process.env.SETTINGS_DIR || process.env.HOME + "/.config/ai-app-builder"
const SETTINGS_FILE = join(SETTINGS_DIR, "settings.json")

const DEFAULT_SETTINGS: AppSettings = {
  model: "opencode/deepseek-v4-flash-free",
  provider: "",
  apiKey: "",
}

const AVAILABLE_MODELS = [
  { id: "opencode/deepseek-v4-flash-free", name: "DeepSeek V4 Flash (Free)", free: true, contextWindow: 200_000 },
  { id: "opencode/nemotron-3-super-free", name: "Nemotron 3 Super (Free)", free: true, contextWindow: 204_800 },
  { id: "opencode/qwen3.6-plus-free", name: "Qwen 3.6 Plus (Free)", free: true, contextWindow: 262_144 },
]

export interface AppSettings {
  model: string
  provider: string
  apiKey: string
}

interface CodexLoginState {
  running: boolean
  output: string
  error: string
  exitCode: number | null
  startedAt: number | null
  updatedAt: number | null
}

const codexLoginState: CodexLoginState = {
  running: false,
  output: "",
  error: "",
  exitCode: null,
  startedAt: null,
  updatedAt: null,
}
let codexLoginProcess: ReturnType<typeof spawn> | null = null
let modelsDevCache: { data: Record<string, unknown>; expiresAt: number } | null = null

function appendLoginOutput(kind: "output" | "error", text: string): void {
  const current = codexLoginState[kind]
  codexLoginState[kind] = (current + text).slice(-12000)
  codexLoginState.updatedAt = Date.now()
}

function runCodex(args: string[], timeoutMs = 15000): Promise<{ ok: boolean; output: string; error: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const proc = spawn("codex", args, {
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let output = ""
    let error = ""
    let finished = false

    const timeout = setTimeout(() => {
      if (finished) return
      finished = true
      proc.kill("SIGTERM")
      resolve({ ok: false, output, error: error || "Command timed out", exitCode: null })
    }, timeoutMs)

    proc.stdout?.on("data", (data: Buffer) => {
      output += data.toString()
    })
    proc.stderr?.on("data", (data: Buffer) => {
      error += data.toString()
    })
    proc.on("error", (err) => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      resolve({ ok: false, output, error: err.message, exitCode: null })
    })
    proc.on("close", (code) => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      resolve({ ok: code === 0, output, error, exitCode: code })
    })
  })
}

function loadSettings(): AppSettings {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"))
      if (!AVAILABLE_MODELS.some((model) => model.id === settings.model)) {
        return { ...settings, model: DEFAULT_SETTINGS.model }
      }
      return settings
    }
  } catch {}
  return { ...DEFAULT_SETTINGS }
}

function saveSettings(s: AppSettings): void {
  if (!existsSync(SETTINGS_DIR)) {
    mkdirSync(SETTINGS_DIR, { recursive: true })
  }
  writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2))
}

async function getModelsDevCatalog(): Promise<Record<string, unknown> | null> {
  if (modelsDevCache && modelsDevCache.expiresAt > Date.now()) {
    return modelsDevCache.data
  }

  try {
    const res = await fetch("https://models.dev/api.json")
    if (!res.ok) return null
    const data = await res.json() as Record<string, unknown>
    modelsDevCache = {
      data,
      expiresAt: Date.now() + 15 * 60 * 1000,
    }
    return data
  } catch {
    return null
  }
}

export async function getModelContextWindow(modelId: string): Promise<number | undefined> {
  const [providerId, ...modelParts] = modelId.split("/")
  const localModelId = modelParts.join("/")
  const fallback = AVAILABLE_MODELS.find((model) => model.id === modelId)?.contextWindow
  if (!providerId || !localModelId) return fallback

  const catalog = await getModelsDevCatalog()
  const provider = catalog?.[providerId] as { models?: Record<string, { limit?: { context?: number } }> } | undefined
  const model = provider?.models?.[localModelId]
  return model?.limit?.context || fallback
}

async function enrichAvailableModels() {
  return Promise.all(AVAILABLE_MODELS.map(async (model) => ({
    ...model,
    contextWindow: await getModelContextWindow(model.id),
  })))
}

const settingsRoute = new Hono()

settingsRoute.get("/", (c) => {
  const settings = loadSettings()
  return c.json({ settings })
})

settingsRoute.put("/", async (c) => {
  const body = await c.req.json()
  const current = loadSettings()
  const requestedModel = body.model ?? current.model
  const updated: AppSettings = {
    model: AVAILABLE_MODELS.some((model) => model.id === requestedModel) ? requestedModel : DEFAULT_SETTINGS.model,
    provider: body.provider ?? current.provider,
    apiKey: body.apiKey ?? current.apiKey,
  }
  saveSettings(updated)
  return c.json({ status: "ok", settings: updated })
})

settingsRoute.get("/models", async (c) => {
  return c.json({ models: await enrichAvailableModels() })
})

settingsRoute.get("/codex/status", async (c) => {
  const result = await runCodex(["login", "status"])
  return c.json({
    available: result.ok || Boolean(result.output || result.error),
    authenticated: result.ok && /logged in/i.test(result.output + result.error),
    output: result.output,
    error: result.error,
    login: codexLoginState,
  })
})

settingsRoute.post("/codex/login", async (c) => {
  if (codexLoginProcess && codexLoginState.running) {
    return c.json({ status: "running", login: codexLoginState })
  }

  codexLoginState.running = true
  codexLoginState.output = ""
  codexLoginState.error = ""
  codexLoginState.exitCode = null
  codexLoginState.startedAt = Date.now()
  codexLoginState.updatedAt = Date.now()

  codexLoginProcess = spawn("codex", ["login", "--device-auth"], {
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  })

  const timeout = setTimeout(() => {
    if (!codexLoginState.running) return
    appendLoginOutput("error", "\nLogin timed out. Start the flow again if needed.\n")
    codexLoginProcess?.kill("SIGTERM")
  }, 10 * 60 * 1000)

  codexLoginProcess.stdout?.on("data", (data: Buffer) => {
    appendLoginOutput("output", data.toString())
  })
  codexLoginProcess.stderr?.on("data", (data: Buffer) => {
    appendLoginOutput("error", data.toString())
  })
  codexLoginProcess.on("error", (err) => {
    clearTimeout(timeout)
    codexLoginState.running = false
    codexLoginState.exitCode = null
    appendLoginOutput("error", err.message)
    codexLoginProcess = null
  })
  codexLoginProcess.on("close", (code) => {
    clearTimeout(timeout)
    codexLoginState.running = false
    codexLoginState.exitCode = code
    codexLoginState.updatedAt = Date.now()
    codexLoginProcess = null
  })

  return c.json({ status: "started", login: codexLoginState })
})

settingsRoute.post("/codex/logout", async (c) => {
  const result = await runCodex(["logout"], 30000)
  return c.json({ status: result.ok ? "ok" : "error", ...result })
})

export { settingsRoute, loadSettings }
