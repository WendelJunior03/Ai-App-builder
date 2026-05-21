import { spawn } from "node:child_process"
import { EventEmitter } from "node:events"
import { accessSync, constants } from "node:fs"

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || "/workspace"
const OPENCODE_TIMEOUT_MS = Number(process.env.OPENCODE_TIMEOUT_MS || 120000)

interface RunEvents {
  onChunk: (text: string) => void
  onUsage?: (usage: TokenUsage) => void
  onDone: () => void
  onError: (err: Error) => void
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

interface FileAction {
  type: "create" | "modify" | "delete"
  path: string
  content?: string
}

interface PlanProposal {
  title: string
  description: string
  files: Array<{ path: string; action: string; description: string }>
}

function formatWorkspacePath(filePath: unknown): string {
  if (typeof filePath !== "string") return "unknown"
  return filePath.replace(WORKSPACE_DIR, "").replace(/^\/+/, "") || filePath
}

function findNumber(value: unknown, keys: string[], seen = new Set<unknown>()): number | undefined {
  if (!value || typeof value !== "object" || seen.has(value)) return undefined
  seen.add(value)

  const record = value as Record<string, unknown>
  for (const key of keys) {
    const direct = record[key]
    if (typeof direct === "number" && Number.isFinite(direct)) return direct
    if (typeof direct === "string") {
      const parsed = Number(direct)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  for (const nested of Object.values(record)) {
    const found = findNumber(nested, keys, seen)
    if (found !== undefined) return found
  }

  return undefined
}

function normalizeUsage(event: Record<string, unknown>): TokenUsage | null {
  const source = (event.usage && typeof event.usage === "object")
    ? event.usage as Record<string, unknown>
    : event

  const inputTokens = findNumber(source, [
    "inputTokens",
    "input_tokens",
    "promptTokens",
    "prompt_tokens",
    "prompt",
    "input",
  ]) ?? 0
  const outputTokens = findNumber(source, [
    "outputTokens",
    "output_tokens",
    "completionTokens",
    "completion_tokens",
    "completion",
    "output",
  ]) ?? 0
  const reasoningTokens = findNumber(source, [
    "reasoningTokens",
    "reasoning_tokens",
    "reasoning",
  ]) ?? 0
  const cacheReadTokens = findNumber(source, [
    "cacheReadTokens",
    "cache_read_tokens",
    "cacheRead",
    "cache_read",
    "cache_read_input_tokens",
  ]) ?? 0
  const cacheWriteTokens = findNumber(source, [
    "cacheWriteTokens",
    "cache_write_tokens",
    "cacheWrite",
    "cache_write",
    "cache_creation_input_tokens",
  ]) ?? 0
  const explicitTotal = findNumber(source, ["totalTokens", "total_tokens", "total"])
  const totalTokens = explicitTotal ?? inputTokens + outputTokens + reasoningTokens + cacheReadTokens + cacheWriteTokens
  const contextWindow = findNumber(source, [
    "contextWindow",
    "context_window",
    "contextLimit",
    "context_limit",
    "maxTokens",
    "max_tokens",
    "limit",
  ])
  const explicitRemaining = findNumber(source, ["remainingTokens", "remaining_tokens", "remaining"])
  const remainingTokens = explicitRemaining ?? (
    contextWindow !== undefined ? Math.max(contextWindow - totalTokens, 0) : undefined
  )
  const costUsd = findNumber(source, ["costUsd", "cost_usd", "cost", "usd"])

  if (!totalTokens && !inputTokens && !outputTokens && !reasoningTokens && !cacheReadTokens && !cacheWriteTokens) {
    return null
  }

  return {
    inputTokens,
    outputTokens,
    reasoningTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens,
    contextWindow,
    remainingTokens,
    costUsd,
  }
}

function findOpencodeBinary(): string | null {
  const paths = [
    "/usr/local/bin/opencode",
    "/home/node/.bun/bin/opencode",
    process.env.HOME + "/.bun/bin/opencode",
    "/usr/bin/opencode",
    "/opt/homebrew/bin/opencode",
  ]
  for (const p of paths) {
    try {
      accessSync(p, constants.X_OK)
      return p
    } catch {}
  }
  return null
}

export class OpencodeClient extends EventEmitter {
  private workspaceDir: string
  private opencodeBin: string

  constructor() {
    super()
    this.workspaceDir = WORKSPACE_DIR
    this.opencodeBin = findOpencodeBinary() || "/usr/local/bin/opencode"
  }

  async isAvailable(): Promise<boolean> {
    try {
      accessSync(this.opencodeBin, constants.X_OK)
      return true
    } catch {
      return false
    }
  }

  async healthCheck(): Promise<{ status: string }> {
    try {
      const avail = await this.isAvailable()
      if (!avail) {
        // Try checking via opencode serve (Docker engine container)
        const res = await fetch("http://opencode:4096/api/health", {
          headers: { Authorization: "Basic " + Buffer.from("opencode:dev").toString("base64") },
        })
        return { status: res.ok ? "connected" : `error: ${res.status}` }
      }
      return { status: "available" }
    } catch {
      return { status: "unreachable" }
    }
  }

  async sendMessage(
    message: string,
    events: RunEvents
  ): Promise<void> {
    if (!this.opencodeBin) {
      events.onError(new Error("opencode binary not found"))
      return
    }

    const args = ["run", message, "--format", "json", "--dangerously-skip-permissions"]

    // Apply settings (model, api key)
    try {
      const { loadSettings } = await import("../routes/settings")
      const settings = loadSettings()
      if (settings.model) {
        args.push("--model", settings.model)
      }
      if (settings.apiKey && settings.provider) {
        // Set provider env vars
        process.env[`OPENCODE_${settings.provider.toUpperCase()}_API_KEY`] = settings.apiKey
      }
    } catch {}

    const proc = spawn(this.opencodeBin, args, {
      cwd: this.workspaceDir,
      env: {
        ...process.env,
        OPENCODE_SERVER_PASSWORD: process.env.OPENCODE_SERVER_PASSWORD || "",
        HOME: process.env.HOME || "/root",
      },
      stdio: ["ignore", "pipe", "pipe"],
    })

    let buffer = ""
    let stderrBuffer = ""
    let emittedOutput = false
    let finished = false

    const timeout = setTimeout(() => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      proc.kill("SIGTERM")
      events.onError(new Error(`opencode timed out after ${Math.round(OPENCODE_TIMEOUT_MS / 1000)}s`))
    }, OPENCODE_TIMEOUT_MS)

    proc.stdout?.on("data", (data: Buffer) => {
      buffer += data.toString()
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const event = JSON.parse(line)
          emittedOutput = this.handleEvent(event, events) || emittedOutput
        } catch {
          emittedOutput = true
          events.onChunk(line)
        }
      }
    })

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString()
      stderrBuffer += text
      // Opencode logs to stderr, filter out non-error messages
      if (text.toLowerCase().includes("error") || text.toLowerCase().includes("trace")) {
        emittedOutput = true
        events.onChunk(text)
      }
    })

    proc.on("close", (code) => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer)
          emittedOutput = this.handleEvent(event, events) || emittedOutput
        } catch {}
      }
      if (code !== 0 && !emittedOutput) {
        events.onError(new Error(stderrBuffer.trim() || `opencode exited with code ${code}`))
        return
      }
      events.onDone()
    })

    proc.on("error", (err) => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      events.onError(err)
    })
  }

  private handleEvent(event: Record<string, unknown>, events: RunEvents): boolean {
    const part = event.part as Record<string, unknown> | undefined
    const error = event.error as Record<string, unknown> | undefined
    const errorData = error?.data as Record<string, unknown> | undefined

    // Extract text from various possible locations
    const text =
      (part?.text as string) ||
      (part?.content as string) ||
      (event.text as string) ||
      (event.content as string) ||
      (event.data as string) ||
      ""

    if (event.type !== "usage" && (
      (event.usage && typeof event.usage === "object") ||
      (event.type === "step_finish" || event.type === "step-finish")
    )) {
      const usage = normalizeUsage(event)
      if (usage) {
        events.onUsage?.(usage)
        this.emit("usage", usage)
      }
    }

    if (event.type === "text" && text) {
      events.onChunk(text)
      return true
    } else if (event.type === "error") {
      events.onChunk(`Error: ${errorData?.message || error?.message || event.message || event.data || JSON.stringify(event)}`)
      return true
    } else if (event.type === "step_start" || event.type === "step-start") {
      // Step started - ignore
    } else if (event.type === "step_finish" || event.type === "step-finish") {
      // Token usage is handled above.
    } else if (event.type === "usage") {
      const usage = normalizeUsage(event)
      if (usage) {
        events.onUsage?.(usage)
        this.emit("usage", usage)
      }
    } else if (event.type === "file" || event.type === "write") {
      const action = event as unknown as FileAction
      events.onChunk(`\n[File: ${action.type} ${action.path}]\n`)
      this.emit("file", action)
      return true
    } else if (event.type === "tool_use" && (part?.tool === "write" || part?.tool === "edit")) {
      const state = part.state as Record<string, unknown> | undefined
      const input = state?.input as Record<string, unknown> | undefined
      if (state?.status === "completed") {
        const filePath = formatWorkspacePath(input?.filePath)
        events.onChunk(`\nArquivo atualizado: ${filePath}\n`)
        this.emit("file", { type: "modify", path: filePath } satisfies FileAction)
        return true
      }
    } else if (event.type === "plan") {
      this.emit("plan", event as unknown as PlanProposal)
    } else if (event.type === "command") {
      this.emit("command", event)
    } else if (event.type === "done" || event.type === "complete") {
      events.onDone()
    } else if (event.type === "error_message") {
      events.onChunk(`Error: ${event.message || event.error || JSON.stringify(event)}`)
      return true
    } else if (typeof event.text === "string") {
      events.onChunk(event.text as string)
      return true
    } else if (typeof event.content === "string") {
      events.onChunk(event.content as string)
      return true
    }
    return false
  }
}
