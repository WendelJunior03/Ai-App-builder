import { Hono } from "hono"
import { workspaceManager } from "../services/workspace"
import { projectManager } from "../services/projects"

const filesRoute = new Hono()

filesRoute.get("/", async (c) => {
  await projectManager.ensureInitialized()
  const dir = c.req.query("dir") || ""
  const files = await workspaceManager.listFiles(dir)
  return c.json({ files })
})

filesRoute.get("/file", async (c) => {
  await projectManager.ensureInitialized()
  const path = c.req.query("path")
  if (!path) {
    return c.json({ error: "path parameter required" }, 400)
  }
  const content = await workspaceManager.readFile(path)
  if (content === null) {
    return c.json({ error: "File not found" }, 404)
  }
  return c.json({ path, content })
})

filesRoute.post("/file", async (c) => {
  await projectManager.ensureInitialized()
  const { path, content } = await c.req.json()
  await workspaceManager.writeFile(path, content)
  await projectManager.saveActiveProject()
  return c.json({ status: "ok", path })
})

export { filesRoute }
