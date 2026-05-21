import { Hono } from "hono"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const SETTINGS_DIR = process.env.SETTINGS_DIR || process.env.HOME + "/.config/ai-app-builder"
const SETTINGS_FILE = join(SETTINGS_DIR, "settings.json")

const DEFAULT_SETTINGS: AppSettings = {
  model: "opencode/deepseek-v4-flash-free",
  provider: "",
  apiKey: "",
}

const AVAILABLE_MODELS = [
  { id: "opencode/deepseek-v4-flash-free", name: "DeepSeek V4 Flash (Free)", free: true },
  { id: "opencode/nemotron-3-super-free", name: "Nemotron 3 Super (Free)", free: true },
  { id: "opencode/qwen3.6-plus-free", name: "Qwen 3.6 Plus (Free)", free: true },
]

export interface AppSettings {
  model: string
  provider: string
  apiKey: string
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

settingsRoute.get("/models", (c) => {
  return c.json({ models: AVAILABLE_MODELS })
})

export { settingsRoute, loadSettings }
