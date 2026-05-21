import { readFileSync, existsSync } from "node:fs"
import { join, extname } from "node:path"
import type { Context, Next } from "hono"

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".ts": "application/javascript",
  ".tsx": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
}

export function staticFiles({ root }: { root: string }) {
  return async (c: Context, next: Next) => {
    if (c.req.path.startsWith("/api/")) {
      return next()
    }

    const filePath = c.req.path === "/" ? "/index.html" : c.req.path
    const fullPath = join(root, filePath)

    if (!existsSync(fullPath)) {
      // SPA fallback: serve index.html for non-file routes
      const indexPath = join(root, "index.html")
      if (existsSync(indexPath)) {
        const content = readFileSync(indexPath, "utf-8")
        return c.html(content)
      }
      return next()
    }

    const ext = extname(fullPath)
    const mime = MIME_TYPES[ext] || "application/octet-stream"
    const content = readFileSync(fullPath)
    return c.body(content, 200, { "Content-Type": mime })
  }
}
