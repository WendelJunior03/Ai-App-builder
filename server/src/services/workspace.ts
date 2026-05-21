import { readdir, readFile, writeFile, stat } from "node:fs/promises"
import { join } from "node:path"

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || "/workspace"

class WorkspaceManager {
  private baseDir: string

  constructor() {
    this.baseDir = WORKSPACE_DIR
  }

  async listFiles(dir: string = ""): Promise<Array<{ path: string; type: "file" | "dir"; size: number }>> {
    const fullPath = join(this.baseDir, dir)
    try {
      const entries = await readdir(fullPath, { withFileTypes: true })
      const files: Array<{ path: string; type: "file" | "dir"; size: number }> = []

      for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "projects") continue
        const relPath = dir ? `${dir}/${entry.name}` : entry.name
        try {
          const s = await stat(join(fullPath, entry.name))
          const type = entry.isDirectory() ? "dir" as const : "file" as const
          files.push({
            path: relPath,
            type,
            size: s.size,
          })
          if (type === "dir") {
            files.push(...await this.listFiles(relPath))
          }
        } catch {}
      }

      return files.sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1
        return a.path.localeCompare(b.path)
      })
    } catch {
      return []
    }
  }

  async readFile(filePath: string): Promise<string | null> {
    try {
      const fullPath = join(this.baseDir, filePath)
      const content = await readFile(fullPath, "utf-8")
      return content
    } catch {
      return null
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = join(this.baseDir, filePath)
    await writeFile(fullPath, content, "utf-8")
  }
}

export const workspaceManager = new WorkspaceManager()
